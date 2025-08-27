"""
Production Model Server for ModMaster Pro AI Service
Handles model loading, inference, and serving with optimizations
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import numpy as np
import torch
import torch.nn as nn
from torchvision import transforms
import onnxruntime as ort
from PIL import Image
import redis.asyncio as redis
import json
from datetime import datetime
import aiofiles
from prometheus_client import Counter, Histogram, Gauge
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Metrics
inference_counter = Counter('model_inference_total', 'Total model inferences', ['model_name', 'status'])
inference_duration = Histogram('model_inference_duration_seconds', 'Model inference duration', ['model_name'])
model_load_gauge = Gauge('model_loaded', 'Model load status', ['model_name'])
active_requests = Gauge('active_inference_requests', 'Number of active inference requests')

class ModelServer:
    """Production model server with caching and optimization"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.model_metadata = {}
        self.redis_client = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.inference_cache = {}
        self.cache_ttl = config.get('cache_ttl', 3600)  # 1 hour default
        
        # Image preprocessing
        self.image_transform = transforms.Compose([
            transforms.Resize((640, 640)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        logger.info(f"Model server initialized on device: {self.device}")
    
    async def initialize(self):
        """Initialize model server components"""
        # Connect to Redis for caching
        self.redis_client = redis.from_url(
            self.config['redis_url'],
            encoding="utf-8",
            decode_responses=True
        )
        await self.redis_client.ping()
        logger.info("Redis connection established")
        
        # Load models
        await self.load_all_models()
    
    async def load_all_models(self):
        """Load all AI models"""
        model_configs = [
            {
                'name': 'engine_detector',
                'type': 'onnx',
                'path': self.config['models']['engine_detector_path'],
                'classes': self.config['models']['engine_detector_classes']
            },
            {
                'name': 'part_classifier',
                'type': 'pytorch',
                'path': self.config['models']['part_classifier_path'],
                'classes': self.config['models']['part_classifier_classes']
            },
            {
                'name': 'damage_assessor',
                'type': 'onnx',
                'path': self.config['models']['damage_assessor_path'],
                'classes': ['minor', 'moderate', 'severe', 'none']
            }
        ]
        
        for model_config in model_configs:
            try:
                await self.load_model(model_config)
                model_load_gauge.labels(model_name=model_config['name']).set(1)
            except Exception as e:
                logger.error(f"Failed to load model {model_config['name']}: {e}")
                model_load_gauge.labels(model_name=model_config['name']).set(0)
    
    async def load_model(self, model_config: Dict[str, Any]):
        """Load a single model"""
        name = model_config['name']
        model_type = model_config['type']
        path = model_config['path']
        
        logger.info(f"Loading model: {name} ({model_type}) from {path}")
        
        if model_type == 'onnx':
            # Load ONNX model
            providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if torch.cuda.is_available() else ['CPUExecutionProvider']
            session = ort.InferenceSession(path, providers=providers)
            self.models[name] = {
                'session': session,
                'type': 'onnx',
                'input_name': session.get_inputs()[0].name,
                'output_names': [out.name for out in session.get_outputs()]
            }
        elif model_type == 'pytorch':
            # Load PyTorch model
            model = torch.load(path, map_location=self.device)
            model.eval()
            if torch.cuda.is_available():
                model = model.cuda()
            self.models[name] = {
                'model': model,
                'type': 'pytorch'
            }
        
        # Store metadata
        self.model_metadata[name] = {
            'classes': model_config.get('classes', []),
            'loaded_at': datetime.now().isoformat(),
            'version': model_config.get('version', '1.0.0')
        }
        
        logger.info(f"Model {name} loaded successfully")
    
    @active_requests.track_inprogress()
    async def predict(self, model_name: str, image_data: np.ndarray, **kwargs) -> Dict[str, Any]:
        """Run inference on a model"""
        start_time = time.time()
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(model_name, image_data)
            cached_result = await self._get_cached_result(cache_key)
            if cached_result:
                inference_counter.labels(model_name=model_name, status='cache_hit').inc()
                return cached_result
            
            # Run inference
            if model_name not in self.models:
                raise ValueError(f"Model {model_name} not loaded")
            
            model_info = self.models[model_name]
            
            if model_info['type'] == 'onnx':
                result = await self._predict_onnx(model_info, image_data, **kwargs)
            elif model_info['type'] == 'pytorch':
                result = await self._predict_pytorch(model_info, image_data, **kwargs)
            else:
                raise ValueError(f"Unknown model type: {model_info['type']}")
            
            # Cache result
            await self._cache_result(cache_key, result)
            
            # Record metrics
            duration = time.time() - start_time
            inference_duration.labels(model_name=model_name).observe(duration)
            inference_counter.labels(model_name=model_name, status='success').inc()
            
            return result
            
        except Exception as e:
            inference_counter.labels(model_name=model_name, status='error').inc()
            logger.error(f"Inference error for model {model_name}: {e}")
            raise
    
    async def _predict_onnx(self, model_info: Dict, image_data: np.ndarray, **kwargs) -> Dict[str, Any]:
        """Run ONNX model inference"""
        session = model_info['session']
        
        # Prepare input
        if len(image_data.shape) == 3:
            image_data = np.expand_dims(image_data, axis=0)
        
        # Run inference
        input_dict = {model_info['input_name']: image_data.astype(np.float32)}
        outputs = session.run(model_info['output_names'], input_dict)
        
        # Process outputs based on model type
        if 'detector' in model_info.get('name', ''):
            return self._process_detection_output(outputs, **kwargs)
        else:
            return self._process_classification_output(outputs, **kwargs)
    
    async def _predict_pytorch(self, model_info: Dict, image_data: np.ndarray, **kwargs) -> Dict[str, Any]:
        """Run PyTorch model inference"""
        model = model_info['model']
        
        # Convert to tensor
        if isinstance(image_data, np.ndarray):
            image_tensor = torch.from_numpy(image_data).float()
        else:
            image_tensor = image_data
        
        if len(image_tensor.shape) == 3:
            image_tensor = image_tensor.unsqueeze(0)
        
        # Move to device
        image_tensor = image_tensor.to(self.device)
        
        # Run inference
        with torch.no_grad():
            outputs = model(image_tensor)
        
        # Process outputs
        return self._process_pytorch_output(outputs, **kwargs)
    
    def _process_detection_output(self, outputs: List[np.ndarray], confidence_threshold: float = 0.5, **kwargs) -> Dict[str, Any]:
        """Process object detection output"""
        # Assuming YOLO-style output format
        predictions = outputs[0]
        
        detections = []
        for pred in predictions:
            if pred[4] > confidence_threshold:  # Confidence score
                x1, y1, x2, y2, conf, class_id = pred[:6]
                detections.append({
                    'bbox': [float(x1), float(y1), float(x2), float(y2)],
                    'confidence': float(conf),
                    'class_id': int(class_id),
                    'class_name': self._get_class_name('engine_detector', int(class_id))
                })
        
        return {
            'detections': detections,
            'count': len(detections),
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_classification_output(self, outputs: List[np.ndarray], top_k: int = 5, **kwargs) -> Dict[str, Any]:
        """Process classification output"""
        scores = outputs[0].squeeze()
        
        # Get top-k predictions
        if len(scores.shape) == 0:
            scores = np.array([scores])
        
        top_indices = np.argsort(scores)[-top_k:][::-1]
        
        predictions = []
        for idx in top_indices:
            predictions.append({
                'class_id': int(idx),
                'class_name': self._get_class_name('part_classifier', int(idx)),
                'confidence': float(scores[idx])
            })
        
        return {
            'predictions': predictions,
            'top_prediction': predictions[0] if predictions else None,
            'timestamp': datetime.now().isoformat()
        }
    
    def _process_pytorch_output(self, outputs: torch.Tensor, **kwargs) -> Dict[str, Any]:
        """Process PyTorch model output"""
        # Convert to numpy
        outputs = outputs.cpu().numpy()
        
        # Use same processing as ONNX
        return self._process_classification_output([outputs], **kwargs)
    
    def _get_class_name(self, model_name: str, class_id: int) -> str:
        """Get class name from class ID"""
        classes = self.model_metadata.get(model_name, {}).get('classes', [])
        if 0 <= class_id < len(classes):
            return classes[class_id]
        return f"class_{class_id}"
    
    def _generate_cache_key(self, model_name: str, image_data: np.ndarray) -> str:
        """Generate cache key for inference result"""
        # Use image hash for cache key
        image_hash = hash(image_data.tobytes())
        return f"inference:{model_name}:{image_hash}"
    
    async def _get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached inference result"""
        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}")
        return None
    
    async def _cache_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache inference result"""
        try:
            await self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(result)
            )
        except Exception as e:
            logger.warning(f"Cache storage error: {e}")
    
    async def process_image_file(self, file_path: str, model_name: str, **kwargs) -> Dict[str, Any]:
        """Process an image file"""
        # Load image
        async with aiofiles.open(file_path, 'rb') as f:
            image_data = await f.read()
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Preprocess
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Transform to tensor
        image_tensor = self.image_transform(image)
        
        # Run inference
        return await self.predict(model_name, image_tensor.numpy(), **kwargs)
    
    async def batch_predict(self, model_name: str, images: List[np.ndarray], **kwargs) -> List[Dict[str, Any]]:
        """Run batch inference"""
        # Stack images into batch
        batch = np.stack(images)
        
        # Run inference
        result = await self.predict(model_name, batch, **kwargs)
        
        # Split results
        # This would need to be implemented based on specific model output format
        return [result]  # Placeholder
    
    async def warmup(self):
        """Warmup models with dummy inference"""
        logger.info("Warming up models...")
        
        # Create dummy image
        dummy_image = np.random.randn(3, 640, 640).astype(np.float32)
        
        for model_name in self.models:
            try:
                await self.predict(model_name, dummy_image)
                logger.info(f"Model {model_name} warmed up")
            except Exception as e:
                logger.warning(f"Failed to warmup model {model_name}: {e}")
    
    async def get_model_info(self, model_name: Optional[str] = None) -> Dict[str, Any]:
        """Get information about loaded models"""
        if model_name:
            if model_name not in self.models:
                raise ValueError(f"Model {model_name} not found")
            
            return {
                'name': model_name,
                'type': self.models[model_name]['type'],
                'metadata': self.model_metadata.get(model_name, {}),
                'loaded': model_name in self.models
            }
        
        # Return info for all models
        return {
            model_name: {
                'type': model_info['type'],
                'metadata': self.model_metadata.get(model_name, {}),
                'loaded': True
            }
            for model_name, model_info in self.models.items()
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Check model server health"""
        health = {
            'status': 'healthy',
            'models_loaded': len(self.models),
            'device': str(self.device),
            'cache_connected': False,
            'timestamp': datetime.now().isoformat()
        }
        
        # Check Redis connection
        try:
            await self.redis_client.ping()
            health['cache_connected'] = True
        except:
            health['status'] = 'degraded'
        
        # Check models
        if len(self.models) == 0:
            health['status'] = 'unhealthy'
        
        return health
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up model server resources...")
        
        # Clear models
        self.models.clear()
        self.model_metadata.clear()
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Model server cleanup complete")


# Example usage
if __name__ == "__main__":
    import io
    
    config = {
        'redis_url': 'redis://localhost:6379/0',
        'cache_ttl': 3600,
        'models': {
            'engine_detector_path': '/models/yolov8_engine_detector.onnx',
            'engine_detector_classes': ['air_filter', 'alternator', 'battery', 'turbocharger'],
            'part_classifier_path': '/models/part_classifier.pt',
            'part_classifier_classes': ['intake', 'exhaust', 'suspension', 'brakes'],
            'damage_assessor_path': '/models/damage_assessor.onnx'
        }
    }
    
    async def main():
        server = ModelServer(config)
        await server.initialize()
        await server.warmup()
        
        # Example inference
        dummy_image = np.random.randn(3, 640, 640).astype(np.float32)
        result = await server.predict('engine_detector', dummy_image)
        print("Inference result:", result)
        
        # Health check
        health = await server.health_check()
        print("Health status:", health)
        
        await server.cleanup()
    
    asyncio.run(main())