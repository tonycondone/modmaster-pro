import os
import torch
import tensorflow as tf
from ultralytics import YOLO
import cv2
import numpy as np
from typing import Dict, List, Any, Optional
from loguru import logger
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.config import settings

class ModelManager:
    """Manages loading and inference for all AI models."""
    
    def __init__(self):
        self.models: Dict[str, Any] = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        self._ready = False
    
    async def load_models(self):
        """Load all AI models."""
        logger.info("Loading AI models...")
        
        # Load YOLOv8 for object detection
        await self._load_yolo_model()
        
        # Load ResNet for part classification
        await self._load_resnet_model()
        
        # Load OCR model (Tesseract is loaded on-demand)
        
        self._ready = True
        logger.info("All models loaded successfully")
    
    async def _load_yolo_model(self):
        """Load YOLOv8 model for object detection."""
        try:
            model_path = os.path.join(settings.MODEL_PATH, "weights", settings.YOLO_MODEL)
            
            # Check if model exists
            if not os.path.exists(model_path):
                logger.warning(f"YOLOv8 model not found at {model_path}")
                # In production, download the model
                return
            
            # Load model
            loop = asyncio.get_event_loop()
            self.models['yolo'] = await loop.run_in_executor(
                self.executor,
                lambda: YOLO(model_path)
            )
            
            logger.info("YOLOv8 model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            raise
    
    async def _load_resnet_model(self):
        """Load ResNet model for part classification."""
        try:
            # Load pre-trained ResNet50
            self.models['resnet'] = tf.keras.applications.ResNet50(
                weights='imagenet',
                include_top=True
            )
            
            logger.info("ResNet50 model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load ResNet model: {e}")
            raise
    
    def is_ready(self) -> bool:
        """Check if all models are loaded and ready."""
        return self._ready
    
    def get_loaded_models(self) -> List[str]:
        """Get list of loaded models."""
        return list(self.models.keys())
    
    async def detect_objects(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in an image using YOLOv8."""
        if 'yolo' not in self.models:
            raise ValueError("YOLO model not loaded")
        
        try:
            # Run inference
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                self.executor,
                lambda: self.models['yolo'](image, conf=settings.CONFIDENCE_THRESHOLD)
            )
            
            # Process results
            detections = []
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        detection = {
                            'class_id': int(box.cls),
                            'class_name': r.names[int(box.cls)],
                            'confidence': float(box.conf),
                            'bbox': box.xyxy[0].tolist(),  # [x1, y1, x2, y2]
                        }
                        detections.append(detection)
            
            return detections[:settings.MAX_DETECTIONS]
            
        except Exception as e:
            logger.error(f"Object detection failed: {e}")
            raise
    
    async def classify_part(self, image: np.ndarray) -> Dict[str, Any]:
        """Classify a part using ResNet."""
        if 'resnet' not in self.models:
            raise ValueError("ResNet model not loaded")
        
        try:
            # Preprocess image
            img_resized = cv2.resize(image, (224, 224))
            img_array = tf.keras.preprocessing.image.img_to_array(img_resized)
            img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
            img_array = np.expand_dims(img_array, axis=0)
            
            # Run inference
            predictions = self.models['resnet'].predict(img_array)
            decoded_predictions = tf.keras.applications.resnet50.decode_predictions(
                predictions, top=5
            )[0]
            
            # Format results
            classifications = []
            for pred in decoded_predictions:
                classifications.append({
                    'class_name': pred[1],
                    'confidence': float(pred[2])
                })
            
            return {
                'top_prediction': classifications[0],
                'all_predictions': classifications
            }
            
        except Exception as e:
            logger.error(f"Part classification failed: {e}")
            raise
    
    async def extract_text(self, image: np.ndarray) -> str:
        """Extract text from image using OCR."""
        try:
            import pytesseract
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply thresholding
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Run OCR
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                self.executor,
                lambda: pytesseract.image_to_string(
                    thresh,
                    lang=settings.OCR_LANG,
                    config='--psm 6'  # Assume uniform block of text
                )
            )
            
            return text.strip()
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise
    
    async def detect_vin(self, image: np.ndarray) -> Optional[str]:
        """Detect and extract VIN from image."""
        try:
            # Extract text
            text = await self.extract_text(image)
            
            # VIN pattern: 17 characters, excluding I, O, Q
            import re
            vin_pattern = r'[A-HJ-NPR-Z0-9]{17}'
            
            matches = re.findall(vin_pattern, text.upper())
            
            if matches:
                # Return the first valid VIN found
                return matches[0]
            
            return None
            
        except Exception as e:
            logger.error(f"VIN detection failed: {e}")
            return None

# Global instance
model_manager = ModelManager()