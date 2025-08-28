import asyncio
import numpy as np
import cv2
from PIL import Image
from typing import List, Optional, Tuple
import torch
from ultralytics import YOLO
import torchvision.transforms as transforms
from torchvision.models import resnet50, ResNet50_Weights
import os
import json
from pathlib import Path

from app.utils.logger import logger
from app.models.scan import PartDetection, VehicleInfo, PartInfo

class ModelManager:
    def __init__(self):
        self.yolo_model = None
        self.resnet_model = None
        self.part_classes = []
        self.vehicle_classes = []
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        # Load class mappings
        self._load_class_mappings()
    
    def _load_class_mappings(self):
        """Load part and vehicle class mappings."""
        try:
            # Load part classes
            part_classes_path = Path(__file__).parent / "data" / "part_classes.json"
            if part_classes_path.exists():
                with open(part_classes_path, 'r') as f:
                    self.part_classes = json.load(f)
            
            # Load vehicle classes
            vehicle_classes_path = Path(__file__).parent / "data" / "vehicle_classes.json"
            if vehicle_classes_path.exists():
                with open(vehicle_classes_path, 'r') as f:
                    self.vehicle_classes = json.load(f)
                    
            logger.info(f"Loaded {len(self.part_classes)} part classes and {len(self.vehicle_classes)} vehicle classes")
            
        except Exception as e:
            logger.error(f"Error loading class mappings: {str(e)}")
            # Fallback to basic classes
            self.part_classes = [
                "engine", "transmission", "brake", "suspension", "exhaust",
                "radiator", "alternator", "starter", "battery", "fuel_pump"
            ]
            self.vehicle_classes = [
                "sedan", "suv", "truck", "coupe", "hatchback", "wagon", "convertible"
            ]
    
    async def load_models(self):
        """Load YOLOv8 and ResNet50 models."""
        try:
            logger.info("Loading AI models...")
            
            # Load YOLOv8 model for part detection
            model_path = Path(__file__).parent / "models" / "yolov8n.pt"
            if model_path.exists():
                self.yolo_model = YOLO(str(model_path))
                logger.info("YOLOv8 model loaded successfully")
            else:
                # Download default YOLOv8 model
                self.yolo_model = YOLO('yolov8n.pt')
                logger.info("YOLOv8 model downloaded and loaded")
            
            # Load ResNet50 model for part classification
            self.resnet_model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
            self.resnet_model.eval()
            self.resnet_model.to(self.device)
            logger.info("ResNet50 model loaded successfully")
            
            # Load custom part classification model if available
            custom_model_path = Path(__file__).parent / "models" / "part_classifier.pth"
            if custom_model_path.exists():
                self.resnet_model.load_state_dict(torch.load(custom_model_path, map_location=self.device))
                logger.info("Custom part classification model loaded")
            
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    async def detect_parts(self, image: np.ndarray) -> List[PartDetection]:
        """
        Detect vehicle parts in the image using YOLOv8.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            List of detected parts with bounding boxes and confidence scores
        """
        try:
            if self.yolo_model is None:
                raise ValueError("YOLOv8 model not loaded")
            
            # Run YOLOv8 inference
            results = self.yolo_model(image, verbose=False)
            
            detections = []
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        
                        # Filter by confidence threshold
                        if confidence > 0.5:
                            detection = PartDetection(
                                id=f"det_{len(detections)}",
                                name=self.part_classes[class_id] if class_id < len(self.part_classes) else "unknown",
                                confidence=float(confidence),
                                bounding_box=[float(x1), float(y1), float(x2), float(y2)],
                                part_number="",
                                category="",
                                brand=""
                            )
                            detections.append(detection)
            
            logger.info(f"Detected {len(detections)} parts")
            return detections
            
        except Exception as e:
            logger.error(f"Error detecting parts: {str(e)}")
            return []
    
    async def identify_part(self, image: np.ndarray, bbox: List[float]) -> PartInfo:
        """
        Identify specific part details using ResNet50.
        
        Args:
            image: Full image array
            bbox: Bounding box coordinates [x1, y1, x2, y2]
            
        Returns:
            PartInfo with detailed part information
        """
        try:
            if self.resnet_model is None:
                raise ValueError("ResNet50 model not loaded")
            
            # Extract part region
            x1, y1, x2, y2 = map(int, bbox)
            part_region = image[y1:y2, x1:x2]
            
            if part_region.size == 0:
                return PartInfo(
                    name="unknown",
                    part_number="",
                    category="",
                    brand="",
                    confidence=0.0
                )
            
            # Convert to PIL Image and preprocess
            pil_image = Image.fromarray(part_region)
            input_tensor = self.transform(pil_image).unsqueeze(0).to(self.device)
            
            # Run inference
            with torch.no_grad():
                outputs = self.resnet_model(input_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                confidence, predicted_idx = torch.max(probabilities, 1)
            
            # Get part information
            part_name = self.part_classes[predicted_idx.item()] if predicted_idx.item() < len(self.part_classes) else "unknown"
            
            # Mock part details (in real implementation, this would come from a database)
            part_info = self._get_part_details(part_name)
            
            return PartInfo(
                name=part_name,
                part_number=part_info.get("part_number", ""),
                category=part_info.get("category", ""),
                brand=part_info.get("brand", ""),
                confidence=confidence.item()
            )
            
        except Exception as e:
            logger.error(f"Error identifying part: {str(e)}")
            return PartInfo(
                name="unknown",
                part_number="",
                category="",
                brand="",
                confidence=0.0
            )
    
    async def extract_vehicle_info(self, image: np.ndarray) -> Optional[VehicleInfo]:
        """
        Extract vehicle information from the image.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            VehicleInfo with make, model, and year
        """
        try:
            # This would use a specialized vehicle recognition model
            # For now, return mock data
            return VehicleInfo(
                make="Toyota",
                model="Camry",
                year=2020,
                confidence=0.85
            )
            
        except Exception as e:
            logger.error(f"Error extracting vehicle info: {str(e)}")
            return None
    
    def _get_part_details(self, part_name: str) -> dict:
        """Get detailed part information from database or mapping."""
        # Mock part database
        part_database = {
            "engine": {
                "part_number": "ENG-001",
                "category": "Engine",
                "brand": "Toyota"
            },
            "transmission": {
                "part_number": "TRN-001",
                "category": "Transmission",
                "brand": "Aisin"
            },
            "brake": {
                "part_number": "BRK-001",
                "category": "Brakes",
                "brand": "Brembo"
            },
            "suspension": {
                "part_number": "SUS-001",
                "category": "Suspension",
                "brand": "KYB"
            },
            "exhaust": {
                "part_number": "EXH-001",
                "category": "Exhaust",
                "brand": "MagnaFlow"
            }
        }
        
        return part_database.get(part_name, {
            "part_number": "",
            "category": "",
            "brand": ""
        })
    
    async def get_model_status(self) -> dict:
        """Get status of loaded models."""
        return {
            "yolo_model_loaded": self.yolo_model is not None,
            "resnet_model_loaded": self.resnet_model is not None,
            "device": str(self.device),
            "part_classes_count": len(self.part_classes),
            "vehicle_classes_count": len(self.vehicle_classes)
        }