"""
YOLOv8 implementation for automotive part detection.
"""

import os
import torch
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from PIL import Image
import cv2
from ultralytics import YOLO
import logging
from pathlib import Path
import json
from datetime import datetime

logger = logging.getLogger(__name__)


class PartDetector:
    """
    YOLOv8-based automotive part detection model.
    """
    
    # Automotive part classes
    PART_CLASSES = {
        0: 'brake_pad',
        1: 'brake_rotor',
        2: 'air_filter',
        3: 'oil_filter',
        4: 'spark_plug',
        5: 'battery',
        6: 'alternator',
        7: 'starter_motor',
        8: 'radiator',
        9: 'water_pump',
        10: 'fuel_pump',
        11: 'exhaust_pipe',
        12: 'muffler',
        13: 'catalytic_converter',
        14: 'suspension_strut',
        15: 'control_arm',
        16: 'wheel_bearing',
        17: 'cv_joint',
        18: 'timing_belt',
        19: 'serpentine_belt',
        20: 'headlight',
        21: 'taillight',
        22: 'side_mirror',
        23: 'bumper',
        24: 'hood',
        25: 'fender',
        26: 'door_handle',
        27: 'windshield_wiper',
        28: 'tire',
        29: 'wheel_rim'
    }
    
    def __init__(self, model_path: Optional[str] = None, device: str = 'auto'):
        """
        Initialize the part detector.
        
        Args:
            model_path: Path to the YOLOv8 model weights
            device: Device to run inference on ('cpu', 'cuda', 'auto')
        """
        self.device = self._get_device(device)
        self.model_path = model_path or self._get_default_model_path()
        self.model = None
        self.confidence_threshold = 0.25
        self.iou_threshold = 0.45
        self.max_detections = 100
        
        self._load_model()
        
    def _get_device(self, device: str) -> torch.device:
        """Determine the device to use for inference."""
        if device == 'auto':
            return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        return torch.device(device)
    
    def _get_default_model_path(self) -> str:
        """Get the default model path."""
        models_dir = Path(__file__).parent.parent.parent / 'weights'
        models_dir.mkdir(exist_ok=True)
        return str(models_dir / 'yolov8_automotive_parts.pt')
    
    def _load_model(self):
        """Load the YOLOv8 model."""
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Loading model from {self.model_path}")
                self.model = YOLO(self.model_path)
            else:
                logger.warning(f"Model not found at {self.model_path}, using YOLOv8n as base")
                # Use YOLOv8n as a base model for now
                self.model = YOLO('yolov8n.pt')
                # In production, this would be a custom-trained model
                
            self.model.to(self.device)
            logger.info(f"Model loaded successfully on {self.device}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise RuntimeError(f"Failed to load YOLO model: {str(e)}")
    
    def detect_parts(
        self,
        image: np.ndarray,
        confidence_threshold: Optional[float] = None,
        iou_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect automotive parts in an image.
        
        Args:
            image: Input image as numpy array (BGR format)
            confidence_threshold: Minimum confidence score for detections
            iou_threshold: IoU threshold for non-maximum suppression
            
        Returns:
            List of detection dictionaries containing:
                - bbox: [x1, y1, x2, y2] bounding box coordinates
                - confidence: Detection confidence score
                - class_id: Class ID
                - class_name: Human-readable class name
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
            
        conf_thresh = confidence_threshold or self.confidence_threshold
        iou_thresh = iou_threshold or self.iou_threshold
        
        try:
            # Run inference
            results = self.model(
                image,
                conf=conf_thresh,
                iou=iou_thresh,
                max_det=self.max_detections,
                verbose=False
            )
            
            detections = []
            for result in results:
                if result.boxes is not None:
                    boxes = result.boxes
                    for i in range(len(boxes)):
                        bbox = boxes.xyxy[i].cpu().numpy().tolist()
                        confidence = float(boxes.conf[i].cpu().numpy())
                        class_id = int(boxes.cls[i].cpu().numpy())
                        
                        # Map to automotive part classes (simulated for now)
                        # In production, the model would be trained on automotive parts
                        mapped_class_id = class_id % len(self.PART_CLASSES)
                        
                        detection = {
                            'bbox': bbox,
                            'confidence': confidence,
                            'class_id': mapped_class_id,
                            'class_name': self.PART_CLASSES.get(mapped_class_id, 'unknown')
                        }
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Error during detection: {str(e)}")
            raise RuntimeError(f"Detection failed: {str(e)}")
    
    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Process an image file and return detection results.
        
        Args:
            image_path: Path to the input image
            
        Returns:
            Dictionary containing:
                - detections: List of detected parts
                - image_size: Original image dimensions
                - processing_time: Time taken for processing
        """
        start_time = datetime.now()
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Failed to load image from {image_path}")
        
        height, width = image.shape[:2]
        
        # Detect parts
        detections = self.detect_parts(image)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'detections': detections,
            'image_size': {'width': width, 'height': height},
            'processing_time': processing_time
        }
    
    def draw_detections(
        self,
        image: np.ndarray,
        detections: List[Dict[str, Any]],
        thickness: int = 2,
        font_scale: float = 0.5
    ) -> np.ndarray:
        """
        Draw bounding boxes and labels on the image.
        
        Args:
            image: Input image
            detections: List of detection dictionaries
            thickness: Line thickness for bounding boxes
            font_scale: Font scale for labels
            
        Returns:
            Image with drawn detections
        """
        img_copy = image.copy()
        
        for detection in detections:
            bbox = detection['bbox']
            x1, y1, x2, y2 = [int(coord) for coord in bbox]
            confidence = detection['confidence']
            class_name = detection['class_name']
            
            # Draw bounding box
            color = self._get_color_for_class(detection['class_id'])
            cv2.rectangle(img_copy, (x1, y1), (x2, y2), color, thickness)
            
            # Draw label
            label = f"{class_name}: {confidence:.2f}"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
            label_y = y1 - 10 if y1 - 10 > 10 else y1 + label_size[1] + 10
            
            cv2.rectangle(
                img_copy,
                (x1, label_y - label_size[1] - 10),
                (x1 + label_size[0], label_y),
                color,
                -1
            )
            cv2.putText(
                img_copy,
                label,
                (x1, label_y - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                font_scale,
                (255, 255, 255),
                thickness
            )
        
        return img_copy
    
    def _get_color_for_class(self, class_id: int) -> Tuple[int, int, int]:
        """Get a unique color for each class."""
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
            (128, 0, 128),  # Purple
            (255, 165, 0),  # Orange
            (0, 128, 128),  # Teal
            (128, 128, 0),  # Olive
        ]
        return colors[class_id % len(colors)]
    
    def filter_detections(
        self,
        detections: List[Dict[str, Any]],
        min_confidence: float = 0.5,
        allowed_classes: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter detections based on confidence and class.
        
        Args:
            detections: List of detection dictionaries
            min_confidence: Minimum confidence threshold
            allowed_classes: List of allowed class names (None = all classes)
            
        Returns:
            Filtered list of detections
        """
        filtered = []
        
        for detection in detections:
            # Check confidence
            if detection['confidence'] < min_confidence:
                continue
                
            # Check class
            if allowed_classes and detection['class_name'] not in allowed_classes:
                continue
                
            filtered.append(detection)
        
        return filtered
    
    def export_results(
        self,
        detections: List[Dict[str, Any]],
        output_path: str,
        format: str = 'json'
    ):
        """
        Export detection results to file.
        
        Args:
            detections: List of detection dictionaries
            output_path: Path to save the results
            format: Output format ('json', 'csv')
        """
        if format == 'json':
            with open(output_path, 'w') as f:
                json.dump(detections, f, indent=2)
        elif format == 'csv':
            import csv
            with open(output_path, 'w', newline='') as f:
                if detections:
                    fieldnames = detections[0].keys()
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(detections)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def update_model(self, new_model_path: str):
        """Update the model with new weights."""
        self.model_path = new_model_path
        self._load_model()
        logger.info(f"Model updated with weights from {new_model_path}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        if self.model is None:
            return {"status": "not_loaded"}
            
        return {
            "status": "loaded",
            "model_path": self.model_path,
            "device": str(self.device),
            "num_classes": len(self.PART_CLASSES),
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "max_detections": self.max_detections
        }


class ModelLoader:
    """
    Manages loading and caching of YOLO models.
    """
    
    def __init__(self):
        self.models = {}
        self.model_configs = {}
    
    def load_model(
        self,
        model_name: str,
        model_path: str,
        device: str = 'auto'
    ) -> PartDetector:
        """
        Load a model and cache it.
        
        Args:
            model_name: Name/identifier for the model
            model_path: Path to model weights
            device: Device to load model on
            
        Returns:
            Loaded PartDetector instance
        """
        if model_name in self.models:
            logger.info(f"Model '{model_name}' already loaded, returning cached instance")
            return self.models[model_name]
        
        logger.info(f"Loading model '{model_name}' from {model_path}")
        detector = PartDetector(model_path, device)
        
        self.models[model_name] = detector
        self.model_configs[model_name] = {
            'path': model_path,
            'device': device,
            'loaded_at': datetime.now().isoformat()
        }
        
        return detector
    
    def get_model(self, model_name: str) -> Optional[PartDetector]:
        """Get a loaded model by name."""
        return self.models.get(model_name)
    
    def unload_model(self, model_name: str):
        """Unload a model from memory."""
        if model_name in self.models:
            del self.models[model_name]
            del self.model_configs[model_name]
            logger.info(f"Model '{model_name}' unloaded")
    
    def list_models(self) -> Dict[str, Any]:
        """List all loaded models."""
        return self.model_configs.copy()


# Global model loader instance
model_loader = ModelLoader()