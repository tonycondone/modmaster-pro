"""
Real-time inference engine for automotive part detection.
"""

import asyncio
import time
import numpy as np
from typing import Dict, List, Any, Optional, Union
from concurrent.futures import ThreadPoolExecutor
import cv2
import torch
from collections import deque
import logging
from pathlib import Path
import json
from datetime import datetime
import aiofiles
import io
from PIL import Image

from ..models.yolo.part_detector import PartDetector, model_loader

logger = logging.getLogger(__name__)


class InferenceEngine:
    """
    High-performance inference engine for real-time part detection.
    """
    
    def __init__(
        self,
        model_name: str = 'default',
        batch_size: int = 1,
        max_queue_size: int = 100,
        num_workers: int = 4,
        enable_gpu: bool = True,
        enable_optimization: bool = True
    ):
        """
        Initialize the inference engine.
        
        Args:
            model_name: Name of the model to use
            batch_size: Batch size for inference
            max_queue_size: Maximum size of the processing queue
            num_workers: Number of worker threads
            enable_gpu: Whether to use GPU if available
            enable_optimization: Whether to enable model optimizations
        """
        self.model_name = model_name
        self.batch_size = batch_size
        self.max_queue_size = max_queue_size
        self.num_workers = num_workers
        self.enable_gpu = enable_gpu
        self.enable_optimization = enable_optimization
        
        # Initialize components
        self.detector = None
        self.processing_queue = deque(maxlen=max_queue_size)
        self.executor = ThreadPoolExecutor(max_workers=num_workers)
        self.is_running = False
        
        # Performance metrics
        self.metrics = {
            'total_processed': 0,
            'total_time': 0,
            'avg_inference_time': 0,
            'fps': 0,
            'queue_size': 0
        }
        
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the detection model."""
        device = 'cuda' if self.enable_gpu and torch.cuda.is_available() else 'cpu'
        
        # Check if model is already loaded
        self.detector = model_loader.get_model(self.model_name)
        
        if self.detector is None:
            # Load model
            model_path = self._get_model_path(self.model_name)
            self.detector = model_loader.load_model(
                self.model_name,
                model_path,
                device
            )
        
        # Apply optimizations if enabled
        if self.enable_optimization:
            self._optimize_model()
        
        logger.info(f"Inference engine initialized with model '{self.model_name}' on {device}")
    
    def _get_model_path(self, model_name: str) -> str:
        """Get the path for a specific model."""
        models_dir = Path(__file__).parent.parent / 'weights'
        model_paths = {
            'default': models_dir / 'yolov8_automotive_parts.pt',
            'light': models_dir / 'yolov8_automotive_parts_light.pt',
            'heavy': models_dir / 'yolov8_automotive_parts_heavy.pt'
        }
        return str(model_paths.get(model_name, model_paths['default']))
    
    def _optimize_model(self):
        """Apply model optimizations for faster inference."""
        if self.detector and hasattr(self.detector.model, 'fuse'):
            # Fuse Conv2d + BatchNorm2d layers
            self.detector.model.fuse()
            logger.info("Model optimization applied")
    
    async def process_image_async(
        self,
        image: Union[np.ndarray, bytes, str],
        confidence_threshold: float = 0.25,
        return_visualization: bool = False
    ) -> Dict[str, Any]:
        """
        Process an image asynchronously.
        
        Args:
            image: Input image (numpy array, bytes, or file path)
            confidence_threshold: Minimum confidence for detections
            return_visualization: Whether to return visualized image
            
        Returns:
            Detection results dictionary
        """
        start_time = time.time()
        
        # Convert image to numpy array if needed
        if isinstance(image, bytes):
            nparr = np.frombuffer(image, np.uint8)
            image_array = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(image, str):
            image_array = cv2.imread(image)
        else:
            image_array = image
        
        if image_array is None:
            raise ValueError("Failed to load image")
        
        # Run detection in executor
        loop = asyncio.get_event_loop()
        detections = await loop.run_in_executor(
            self.executor,
            self._detect_sync,
            image_array,
            confidence_threshold
        )
        
        # Calculate metrics
        inference_time = time.time() - start_time
        self._update_metrics(inference_time)
        
        result = {
            'detections': detections,
            'inference_time': inference_time,
            'image_size': {
                'width': image_array.shape[1],
                'height': image_array.shape[0]
            },
            'timestamp': datetime.now().isoformat()
        }
        
        # Add visualization if requested
        if return_visualization:
            vis_image = self.detector.draw_detections(image_array, detections)
            _, buffer = cv2.imencode('.jpg', vis_image)
            result['visualization'] = buffer.tobytes()
        
        return result
    
    def _detect_sync(
        self,
        image: np.ndarray,
        confidence_threshold: float
    ) -> List[Dict[str, Any]]:
        """Synchronous detection wrapper."""
        return self.detector.detect_parts(
            image,
            confidence_threshold=confidence_threshold
        )
    
    async def process_batch_async(
        self,
        images: List[Union[np.ndarray, bytes, str]],
        confidence_threshold: float = 0.25
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of images asynchronously.
        
        Args:
            images: List of input images
            confidence_threshold: Minimum confidence for detections
            
        Returns:
            List of detection results
        """
        tasks = []
        for image in images:
            task = self.process_image_async(image, confidence_threshold)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error processing image {i}: {str(result)}")
                processed_results.append({
                    'error': str(result),
                    'index': i
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def stream_process(
        self,
        image_stream,
        confidence_threshold: float = 0.25,
        skip_frames: int = 0
    ):
        """
        Process a stream of images (e.g., from video).
        
        Args:
            image_stream: Async generator yielding images
            confidence_threshold: Minimum confidence for detections
            skip_frames: Number of frames to skip between processing
            
        Yields:
            Detection results for each processed frame
        """
        frame_count = 0
        
        async for frame in image_stream:
            if skip_frames > 0 and frame_count % (skip_frames + 1) != 0:
                frame_count += 1
                continue
            
            try:
                result = await self.process_image_async(
                    frame,
                    confidence_threshold
                )
                yield result
            except Exception as e:
                logger.error(f"Error processing frame {frame_count}: {str(e)}")
                yield {'error': str(e), 'frame': frame_count}
            
            frame_count += 1
    
    def _update_metrics(self, inference_time: float):
        """Update performance metrics."""
        self.metrics['total_processed'] += 1
        self.metrics['total_time'] += inference_time
        self.metrics['avg_inference_time'] = (
            self.metrics['total_time'] / self.metrics['total_processed']
        )
        self.metrics['fps'] = 1.0 / self.metrics['avg_inference_time']
        self.metrics['queue_size'] = len(self.processing_queue)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        return self.metrics.copy()
    
    def warm_up(self, num_iterations: int = 5):
        """
        Warm up the model with dummy inferences.
        
        Args:
            num_iterations: Number of warm-up iterations
        """
        logger.info(f"Warming up model with {num_iterations} iterations...")
        
        # Create dummy image
        dummy_image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
        
        for i in range(num_iterations):
            try:
                self.detector.detect_parts(dummy_image)
            except Exception as e:
                logger.warning(f"Warm-up iteration {i} failed: {str(e)}")
        
        logger.info("Model warm-up completed")
    
    async def benchmark(
        self,
        num_images: int = 100,
        image_size: tuple = (640, 640)
    ) -> Dict[str, Any]:
        """
        Benchmark the inference engine.
        
        Args:
            num_images: Number of images to process
            image_size: Size of test images
            
        Returns:
            Benchmark results
        """
        logger.info(f"Starting benchmark with {num_images} images...")
        
        # Generate test images
        test_images = [
            np.random.randint(0, 255, (*image_size, 3), dtype=np.uint8)
            for _ in range(num_images)
        ]
        
        # Reset metrics
        self.metrics = {
            'total_processed': 0,
            'total_time': 0,
            'avg_inference_time': 0,
            'fps': 0,
            'queue_size': 0
        }
        
        # Run benchmark
        start_time = time.time()
        results = await self.process_batch_async(test_images)
        total_time = time.time() - start_time
        
        # Calculate statistics
        inference_times = [r['inference_time'] for r in results if 'inference_time' in r]
        
        benchmark_results = {
            'total_images': num_images,
            'total_time': total_time,
            'avg_time_per_image': total_time / num_images,
            'avg_inference_time': np.mean(inference_times),
            'min_inference_time': np.min(inference_times),
            'max_inference_time': np.max(inference_times),
            'std_inference_time': np.std(inference_times),
            'throughput_fps': num_images / total_time,
            'device': str(self.detector.device),
            'batch_size': self.batch_size,
            'num_workers': self.num_workers
        }
        
        logger.info(f"Benchmark completed: {benchmark_results['throughput_fps']:.2f} FPS")
        
        return benchmark_results
    
    def shutdown(self):
        """Shutdown the inference engine."""
        logger.info("Shutting down inference engine...")
        self.is_running = False
        self.executor.shutdown(wait=True)
        logger.info("Inference engine shutdown complete")


class ModelOptimizer:
    """
    Optimizes models for deployment.
    """
    
    @staticmethod
    def quantize_model(
        model_path: str,
        output_path: str,
        quantization_type: str = 'int8'
    ) -> str:
        """
        Quantize a model for faster inference.
        
        Args:
            model_path: Path to the original model
            output_path: Path to save quantized model
            quantization_type: Type of quantization ('int8', 'fp16')
            
        Returns:
            Path to quantized model
        """
        # This is a placeholder for actual quantization
        # In production, use PyTorch quantization or TensorRT
        logger.info(f"Quantizing model to {quantization_type}")
        
        # For now, just copy the model
        import shutil
        shutil.copy(model_path, output_path)
        
        return output_path
    
    @staticmethod
    def convert_to_tensorrt(
        model_path: str,
        output_path: str,
        precision: str = 'fp16'
    ) -> str:
        """
        Convert model to TensorRT for NVIDIA GPU acceleration.
        
        Args:
            model_path: Path to the original model
            output_path: Path to save TensorRT model
            precision: Precision mode ('fp32', 'fp16', 'int8')
            
        Returns:
            Path to TensorRT model
        """
        # This is a placeholder for actual TensorRT conversion
        logger.info(f"Converting model to TensorRT with {precision} precision")
        
        # Actual implementation would use torch2trt or TensorRT API
        return output_path


# Global inference engine instance
inference_engine = None


def get_inference_engine(
    model_name: str = 'default',
    **kwargs
) -> InferenceEngine:
    """
    Get or create the global inference engine instance.
    
    Args:
        model_name: Name of the model to use
        **kwargs: Additional arguments for InferenceEngine
        
    Returns:
        InferenceEngine instance
    """
    global inference_engine
    
    if inference_engine is None:
        inference_engine = InferenceEngine(model_name, **kwargs)
        inference_engine.warm_up()
    
    return inference_engine