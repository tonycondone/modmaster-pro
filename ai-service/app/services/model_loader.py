"""
Dynamic model management and serving infrastructure.
"""

import os
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import json
import hashlib
import aiofiles
import torch
from datetime import datetime
import shutil
import requests
from concurrent.futures import ThreadPoolExecutor
import yaml
import numpy as np

from ..models.yolo.part_detector import PartDetector
from ..models.resnet.part_classifier import PartClassifier

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Central registry for managing AI models.
    """
    
    def __init__(self, models_dir: str = "models", config_file: str = "model_registry.yaml"):
        """
        Initialize model registry.
        
        Args:
            models_dir: Directory to store models
            config_file: Registry configuration file
        """
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.config_file = self.models_dir / config_file
        self.registry = self._load_registry()
        self.loaded_models = {}
        self.executor = ThreadPoolExecutor(max_workers=2)
    
    def _load_registry(self) -> Dict[str, Any]:
        """Load model registry from file."""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return yaml.safe_load(f) or {}
        
        # Default registry
        return {
            'models': {
                'yolo_default': {
                    'type': 'yolo',
                    'version': '1.0.0',
                    'path': 'yolov8_automotive_parts.pt',
                    'description': 'Default YOLOv8 model for part detection',
                    'metrics': {
                        'mAP': 0.85,
                        'inference_time_ms': 25
                    },
                    'created_at': datetime.now().isoformat(),
                    'status': 'ready'
                },
                'resnet_default': {
                    'type': 'resnet',
                    'version': '1.0.0',
                    'path': 'resnet50_automotive_classifier.pth',
                    'description': 'Default ResNet50 for part classification',
                    'metrics': {
                        'accuracy': 0.92,
                        'inference_time_ms': 15
                    },
                    'created_at': datetime.now().isoformat(),
                    'status': 'ready'
                }
            }
        }
    
    def _save_registry(self):
        """Save registry to file."""
        with open(self.config_file, 'w') as f:
            yaml.dump(self.registry, f)
    
    def register_model(
        self,
        name: str,
        model_type: str,
        version: str,
        path: str,
        description: str = "",
        metrics: Optional[Dict[str, float]] = None
    ):
        """
        Register a new model.
        
        Args:
            name: Unique model name
            model_type: Model type ('yolo' or 'resnet')
            version: Model version
            path: Path to model file
            description: Model description
            metrics: Performance metrics
        """
        if name in self.registry.get('models', {}):
            raise ValueError(f"Model '{name}' already registered")
        
        model_info = {
            'type': model_type,
            'version': version,
            'path': path,
            'description': description,
            'metrics': metrics or {},
            'created_at': datetime.now().isoformat(),
            'status': 'ready'
        }
        
        if 'models' not in self.registry:
            self.registry['models'] = {}
        
        self.registry['models'][name] = model_info
        self._save_registry()
        
        logger.info(f"Model '{name}' registered successfully")
    
    def unregister_model(self, name: str):
        """Unregister a model."""
        if name in self.registry.get('models', {}):
            # Unload if loaded
            if name in self.loaded_models:
                self.unload_model(name)
            
            # Remove from registry
            del self.registry['models'][name]
            self._save_registry()
            
            logger.info(f"Model '{name}' unregistered")
    
    def list_models(self) -> Dict[str, Any]:
        """List all registered models."""
        return self.registry.get('models', {}).copy()
    
    def get_model_info(self, name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model."""
        return self.registry.get('models', {}).get(name)
    
    async def load_model(self, name: str) -> Union[PartDetector, PartClassifier]:
        """
        Load a model asynchronously.
        
        Args:
            name: Model name
            
        Returns:
            Loaded model instance
        """
        if name in self.loaded_models:
            logger.info(f"Model '{name}' already loaded")
            return self.loaded_models[name]
        
        model_info = self.get_model_info(name)
        if not model_info:
            raise ValueError(f"Model '{name}' not found in registry")
        
        model_path = self.models_dir / model_info['path']
        
        # Load model based on type
        loop = asyncio.get_event_loop()
        
        if model_info['type'] == 'yolo':
            model = await loop.run_in_executor(
                self.executor,
                self._load_yolo_model,
                str(model_path)
            )
        elif model_info['type'] == 'resnet':
            model = await loop.run_in_executor(
                self.executor,
                self._load_resnet_model,
                str(model_path)
            )
        else:
            raise ValueError(f"Unknown model type: {model_info['type']}")
        
        self.loaded_models[name] = model
        logger.info(f"Model '{name}' loaded successfully")
        
        return model
    
    def _load_yolo_model(self, path: str) -> PartDetector:
        """Load YOLO model synchronously."""
        return PartDetector(model_path=path)
    
    def _load_resnet_model(self, path: str) -> PartClassifier:
        """Load ResNet model synchronously."""
        return PartClassifier(model_path=path)
    
    def unload_model(self, name: str):
        """Unload a model from memory."""
        if name in self.loaded_models:
            del self.loaded_models[name]
            logger.info(f"Model '{name}' unloaded")
    
    def get_loaded_model(self, name: str) -> Optional[Union[PartDetector, PartClassifier]]:
        """Get a loaded model."""
        return self.loaded_models.get(name)
    
    async def update_model(
        self,
        name: str,
        new_path: str,
        new_version: str,
        metrics: Optional[Dict[str, float]] = None
    ):
        """
        Update a model with new weights.
        
        Args:
            name: Model name
            new_path: Path to new model file
            new_version: New version
            metrics: Updated metrics
        """
        model_info = self.get_model_info(name)
        if not model_info:
            raise ValueError(f"Model '{name}' not found")
        
        # Backup old model
        old_path = self.models_dir / model_info['path']
        backup_path = old_path.with_suffix(f".v{model_info['version']}.backup")
        shutil.copy(old_path, backup_path)
        
        # Copy new model
        new_model_path = self.models_dir / Path(new_path).name
        shutil.copy(new_path, new_model_path)
        
        # Update registry
        model_info['path'] = new_model_path.name
        model_info['version'] = new_version
        model_info['updated_at'] = datetime.now().isoformat()
        if metrics:
            model_info['metrics'].update(metrics)
        
        self._save_registry()
        
        # Reload if loaded
        if name in self.loaded_models:
            self.unload_model(name)
            await self.load_model(name)
        
        logger.info(f"Model '{name}' updated to version {new_version}")


class ModelServer:
    """
    Serves models for inference with load balancing and caching.
    """
    
    def __init__(self, registry: ModelRegistry, cache_size: int = 100):
        """
        Initialize model server.
        
        Args:
            registry: Model registry instance
            cache_size: Size of result cache
        """
        self.registry = registry
        self.cache = {}
        self.cache_size = cache_size
        self.request_count = {}
        self.performance_stats = {}
    
    async def get_model(
        self,
        model_type: str,
        version: Optional[str] = None,
        prefer_fast: bool = False
    ) -> str:
        """
        Get the best model based on criteria.
        
        Args:
            model_type: Type of model ('yolo' or 'resnet')
            version: Specific version (optional)
            prefer_fast: Prefer faster inference over accuracy
            
        Returns:
            Model name
        """
        models = self.registry.list_models()
        
        # Filter by type
        candidates = {
            name: info for name, info in models.items()
            if info['type'] == model_type and info['status'] == 'ready'
        }
        
        if not candidates:
            raise ValueError(f"No {model_type} models available")
        
        # Filter by version if specified
        if version:
            candidates = {
                name: info for name, info in candidates.items()
                if info['version'] == version
            }
        
        # Select based on criteria
        if prefer_fast:
            # Sort by inference time
            sorted_models = sorted(
                candidates.items(),
                key=lambda x: x[1]['metrics'].get('inference_time_ms', float('inf'))
            )
        else:
            # Sort by accuracy/mAP
            metric_key = 'mAP' if model_type == 'yolo' else 'accuracy'
            sorted_models = sorted(
                candidates.items(),
                key=lambda x: x[1]['metrics'].get(metric_key, 0),
                reverse=True
            )
        
        if not sorted_models:
            raise ValueError("No suitable models found")
        
        return sorted_models[0][0]
    
    async def inference(
        self,
        model_name: str,
        input_data: Any,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run inference with a specific model.
        
        Args:
            model_name: Model name
            input_data: Input data for inference
            **kwargs: Additional arguments for inference
            
        Returns:
            Inference results
        """
        # Check cache
        cache_key = self._get_cache_key(model_name, input_data, kwargs)
        if cache_key in self.cache:
            logger.debug(f"Cache hit for {model_name}")
            return self.cache[cache_key]
        
        # Load model if needed
        model = self.registry.get_loaded_model(model_name)
        if model is None:
            model = await self.registry.load_model(model_name)
        
        # Track request
        self.request_count[model_name] = self.request_count.get(model_name, 0) + 1
        
        # Run inference
        start_time = datetime.now()
        
        try:
            if isinstance(model, PartDetector):
                result = model.detect_parts(input_data, **kwargs)
            elif isinstance(model, PartClassifier):
                result = model.classify_part(input_data, **kwargs)
            else:
                raise ValueError(f"Unknown model type for {model_name}")
            
            # Track performance
            inference_time = (datetime.now() - start_time).total_seconds() * 1000
            self._update_performance_stats(model_name, inference_time)
            
            # Cache result
            self._cache_result(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Inference error for {model_name}: {str(e)}")
            raise
    
    def _get_cache_key(self, model_name: str, input_data: Any, kwargs: Dict) -> str:
        """Generate cache key."""
        # Create a hash of the input
        key_data = {
            'model': model_name,
            'kwargs': kwargs
        }
        
        # For images, use image hash
        if isinstance(input_data, np.ndarray):
            key_data['input_hash'] = hashlib.md5(input_data.tobytes()).hexdigest()
        else:
            key_data['input_hash'] = hashlib.md5(str(input_data).encode()).hexdigest()
        
        return hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()
    
    def _cache_result(self, key: str, result: Any):
        """Cache inference result."""
        if len(self.cache) >= self.cache_size:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[key] = result
    
    def _update_performance_stats(self, model_name: str, inference_time: float):
        """Update performance statistics."""
        if model_name not in self.performance_stats:
            self.performance_stats[model_name] = {
                'total_requests': 0,
                'total_time': 0,
                'min_time': float('inf'),
                'max_time': 0,
                'avg_time': 0
            }
        
        stats = self.performance_stats[model_name]
        stats['total_requests'] += 1
        stats['total_time'] += inference_time
        stats['min_time'] = min(stats['min_time'], inference_time)
        stats['max_time'] = max(stats['max_time'], inference_time)
        stats['avg_time'] = stats['total_time'] / stats['total_requests']
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get server statistics."""
        return {
            'request_count': self.request_count.copy(),
            'performance_stats': self.performance_stats.copy(),
            'cache_size': len(self.cache),
            'loaded_models': list(self.registry.loaded_models.keys())
        }
    
    def clear_cache(self):
        """Clear the result cache."""
        self.cache.clear()
        logger.info("Cache cleared")


class ModelDownloader:
    """
    Downloads and manages model files.
    """
    
    @staticmethod
    async def download_model(
        url: str,
        destination: str,
        verify_checksum: Optional[str] = None
    ) -> str:
        """
        Download a model from URL.
        
        Args:
            url: Model URL
            destination: Local path to save
            verify_checksum: Expected checksum (optional)
            
        Returns:
            Path to downloaded model
        """
        logger.info(f"Downloading model from {url}")
        
        async with aiofiles.open(destination, 'wb') as f:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            for chunk in response.iter_content(chunk_size=8192):
                await f.write(chunk)
                downloaded += len(chunk)
                
                if total_size > 0:
                    progress = (downloaded / total_size) * 100
                    if downloaded % (1024 * 1024) == 0:  # Log every MB
                        logger.info(f"Download progress: {progress:.1f}%")
        
        # Verify checksum if provided
        if verify_checksum:
            file_checksum = await ModelDownloader._calculate_checksum(destination)
            if file_checksum != verify_checksum:
                os.remove(destination)
                raise ValueError("Checksum verification failed")
        
        logger.info(f"Model downloaded successfully to {destination}")
        return destination
    
    @staticmethod
    async def _calculate_checksum(file_path: str) -> str:
        """Calculate SHA256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        
        async with aiofiles.open(file_path, 'rb') as f:
            while chunk := await f.read(8192):
                sha256_hash.update(chunk)
        
        return sha256_hash.hexdigest()


# Global instances
model_registry = ModelRegistry()
model_server = ModelServer(model_registry)


# Convenience functions
async def load_model(name: str) -> Union[PartDetector, PartClassifier]:
    """Load a model by name."""
    return await model_registry.load_model(name)


async def run_inference(
    model_type: str,
    input_data: Any,
    **kwargs
) -> Dict[str, Any]:
    """
    Run inference with automatic model selection.
    
    Args:
        model_type: Type of model to use
        input_data: Input data
        **kwargs: Additional inference arguments
        
    Returns:
        Inference results
    """
    model_name = await model_server.get_model(model_type)
    return await model_server.inference(model_name, input_data, **kwargs)