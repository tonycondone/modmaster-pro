"""
ResNet50 implementation for automotive part classification.
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
import numpy as np
from typing import List, Dict, Tuple, Optional, Any, Union
from PIL import Image
import cv2
import logging
from pathlib import Path
import json
from datetime import datetime
from collections import OrderedDict

logger = logging.getLogger(__name__)


class PartClassifier:
    """
    ResNet50-based automotive part classifier.
    """
    
    # Automotive part categories with subcategories
    PART_CATEGORIES = {
        'engine': [
            'air_filter', 'oil_filter', 'spark_plug', 'fuel_injector',
            'timing_belt', 'serpentine_belt', 'valve_cover', 'piston'
        ],
        'brakes': [
            'brake_pad', 'brake_rotor', 'brake_caliper', 'brake_line',
            'master_cylinder', 'brake_booster'
        ],
        'suspension': [
            'shock_absorber', 'strut', 'control_arm', 'ball_joint',
            'sway_bar', 'coil_spring', 'leaf_spring'
        ],
        'electrical': [
            'battery', 'alternator', 'starter_motor', 'ignition_coil',
            'fuse', 'relay', 'wiring_harness'
        ],
        'cooling': [
            'radiator', 'water_pump', 'thermostat', 'cooling_fan',
            'coolant_reservoir', 'radiator_hose'
        ],
        'exhaust': [
            'muffler', 'catalytic_converter', 'exhaust_pipe', 'oxygen_sensor',
            'exhaust_manifold', 'tailpipe'
        ],
        'transmission': [
            'clutch', 'torque_converter', 'transmission_filter', 'cv_joint',
            'drive_shaft', 'differential'
        ],
        'body': [
            'headlight', 'taillight', 'side_mirror', 'bumper',
            'hood', 'fender', 'door_handle', 'windshield'
        ],
        'interior': [
            'seat', 'steering_wheel', 'dashboard', 'center_console',
            'floor_mat', 'seat_belt'
        ],
        'wheels': [
            'tire', 'wheel_rim', 'wheel_bearing', 'lug_nut',
            'tire_pressure_sensor', 'wheel_hub'
        ]
    }
    
    # Flatten categories for class mapping
    ALL_CLASSES = []
    CLASS_TO_CATEGORY = {}
    for category, parts in PART_CATEGORIES.items():
        for part in parts:
            ALL_CLASSES.append(part)
            CLASS_TO_CATEGORY[part] = category
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        device: str = 'auto',
        num_classes: Optional[int] = None,
        pretrained: bool = True
    ):
        """
        Initialize the part classifier.
        
        Args:
            model_path: Path to saved model weights
            device: Device to run inference on
            num_classes: Number of output classes
            pretrained: Whether to use pretrained ImageNet weights
        """
        self.device = self._get_device(device)
        self.model_path = model_path
        self.num_classes = num_classes or len(self.ALL_CLASSES)
        self.pretrained = pretrained
        
        self.model = None
        self.transform = None
        self.feature_extractor = None
        
        self._initialize_model()
        self._setup_transforms()
    
    def _get_device(self, device: str) -> torch.device:
        """Determine the device to use."""
        if device == 'auto':
            return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        return torch.device(device)
    
    def _initialize_model(self):
        """Initialize the ResNet50 model."""
        try:
            # Load base ResNet50
            self.model = models.resnet50(pretrained=self.pretrained)
            
            # Modify the final layer for our classes
            num_features = self.model.fc.in_features
            self.model.fc = nn.Linear(num_features, self.num_classes)
            
            # Load saved weights if provided
            if self.model_path and os.path.exists(self.model_path):
                logger.info(f"Loading model weights from {self.model_path}")
                state_dict = torch.load(self.model_path, map_location=self.device)
                self.model.load_state_dict(state_dict)
            
            # Move to device and set to eval mode
            self.model.to(self.device)
            self.model.eval()
            
            # Create feature extractor (without final FC layer)
            self.feature_extractor = nn.Sequential(*list(self.model.children())[:-1])
            self.feature_extractor.to(self.device)
            self.feature_extractor.eval()
            
            logger.info(f"Model initialized on {self.device}")
            
        except Exception as e:
            logger.error(f"Error initializing model: {str(e)}")
            raise RuntimeError(f"Failed to initialize ResNet50: {str(e)}")
    
    def _setup_transforms(self):
        """Setup image preprocessing transforms."""
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
    
    def preprocess_image(self, image: Union[np.ndarray, Image.Image, str]) -> torch.Tensor:
        """
        Preprocess an image for classification.
        
        Args:
            image: Input image (numpy array, PIL Image, or file path)
            
        Returns:
            Preprocessed tensor ready for inference
        """
        # Load image if path is provided
        if isinstance(image, str):
            image = Image.open(image).convert('RGB')
        elif isinstance(image, np.ndarray):
            # Convert BGR to RGB if needed
            if len(image.shape) == 3 and image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image)
        
        # Apply transforms
        tensor = self.transform(image)
        
        # Add batch dimension
        return tensor.unsqueeze(0)
    
    def classify_part(
        self,
        image: Union[np.ndarray, Image.Image, str],
        top_k: int = 5,
        return_features: bool = False
    ) -> Dict[str, Any]:
        """
        Classify an automotive part.
        
        Args:
            image: Input image
            top_k: Number of top predictions to return
            return_features: Whether to return feature vector
            
        Returns:
            Classification results dictionary
        """
        if self.model is None:
            raise RuntimeError("Model not initialized")
        
        # Preprocess image
        input_tensor = self.preprocess_image(image).to(self.device)
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)
            
            # Get top-k predictions
            top_probs, top_indices = torch.topk(probabilities, top_k)
            
            # Convert to numpy
            top_probs = top_probs.cpu().numpy()[0]
            top_indices = top_indices.cpu().numpy()[0]
        
        # Build results
        predictions = []
        for i in range(top_k):
            class_idx = top_indices[i]
            class_name = self.ALL_CLASSES[class_idx] if class_idx < len(self.ALL_CLASSES) else 'unknown'
            category = self.CLASS_TO_CATEGORY.get(class_name, 'unknown')
            
            predictions.append({
                'class_id': int(class_idx),
                'class_name': class_name,
                'category': category,
                'confidence': float(top_probs[i])
            })
        
        result = {
            'predictions': predictions,
            'top_prediction': predictions[0] if predictions else None
        }
        
        # Add features if requested
        if return_features:
            with torch.no_grad():
                features = self.feature_extractor(input_tensor)
                features = features.squeeze().cpu().numpy()
                result['features'] = features.tolist()
        
        return result
    
    def batch_classify(
        self,
        images: List[Union[np.ndarray, Image.Image, str]],
        top_k: int = 5,
        batch_size: int = 32
    ) -> List[Dict[str, Any]]:
        """
        Classify a batch of images.
        
        Args:
            images: List of input images
            top_k: Number of top predictions per image
            batch_size: Batch size for processing
            
        Returns:
            List of classification results
        """
        results = []
        
        for i in range(0, len(images), batch_size):
            batch_images = images[i:i + batch_size]
            
            # Preprocess batch
            batch_tensors = []
            for img in batch_images:
                try:
                    tensor = self.preprocess_image(img)
                    batch_tensors.append(tensor)
                except Exception as e:
                    logger.error(f"Error preprocessing image: {str(e)}")
                    results.append({'error': str(e)})
                    continue
            
            if not batch_tensors:
                continue
            
            # Stack tensors
            batch_input = torch.cat(batch_tensors, dim=0).to(self.device)
            
            # Run batch inference
            with torch.no_grad():
                outputs = self.model(batch_input)
                probabilities = F.softmax(outputs, dim=1)
                
                # Process each image in batch
                for j in range(probabilities.size(0)):
                    probs = probabilities[j]
                    top_probs, top_indices = torch.topk(probs, top_k)
                    
                    predictions = []
                    for k in range(top_k):
                        class_idx = int(top_indices[k].cpu().numpy())
                        class_name = self.ALL_CLASSES[class_idx] if class_idx < len(self.ALL_CLASSES) else 'unknown'
                        category = self.CLASS_TO_CATEGORY.get(class_name, 'unknown')
                        
                        predictions.append({
                            'class_id': class_idx,
                            'class_name': class_name,
                            'category': category,
                            'confidence': float(top_probs[k].cpu().numpy())
                        })
                    
                    results.append({
                        'predictions': predictions,
                        'top_prediction': predictions[0] if predictions else None
                    })
        
        return results
    
    def extract_features(
        self,
        image: Union[np.ndarray, Image.Image, str]
    ) -> np.ndarray:
        """
        Extract feature vector from an image.
        
        Args:
            image: Input image
            
        Returns:
            Feature vector (2048-dimensional for ResNet50)
        """
        # Preprocess image
        input_tensor = self.preprocess_image(image).to(self.device)
        
        # Extract features
        with torch.no_grad():
            features = self.feature_extractor(input_tensor)
            features = features.squeeze().cpu().numpy()
        
        return features
    
    def compute_similarity(
        self,
        image1: Union[np.ndarray, Image.Image, str],
        image2: Union[np.ndarray, Image.Image, str],
        metric: str = 'cosine'
    ) -> float:
        """
        Compute similarity between two images based on features.
        
        Args:
            image1: First image
            image2: Second image
            metric: Similarity metric ('cosine', 'euclidean')
            
        Returns:
            Similarity score
        """
        # Extract features
        features1 = self.extract_features(image1)
        features2 = self.extract_features(image2)
        
        if metric == 'cosine':
            # Cosine similarity
            similarity = np.dot(features1, features2) / (
                np.linalg.norm(features1) * np.linalg.norm(features2)
            )
        elif metric == 'euclidean':
            # Negative Euclidean distance (closer = higher similarity)
            similarity = -np.linalg.norm(features1 - features2)
        else:
            raise ValueError(f"Unknown metric: {metric}")
        
        return float(similarity)
    
    def fine_tune(
        self,
        dataset_path: str,
        epochs: int = 10,
        learning_rate: float = 0.001,
        batch_size: int = 32
    ):
        """
        Fine-tune the model on a custom dataset.
        
        Args:
            dataset_path: Path to training dataset
            epochs: Number of training epochs
            learning_rate: Learning rate
            batch_size: Training batch size
        """
        # This is a placeholder for fine-tuning logic
        # In production, implement proper training loop
        logger.info(f"Fine-tuning model on {dataset_path}")
        
        # Set model to training mode
        self.model.train()
        
        # Setup optimizer
        optimizer = torch.optim.Adam(
            self.model.parameters(),
            lr=learning_rate
        )
        
        # Training loop would go here
        
        # Set back to eval mode
        self.model.eval()
    
    def save_model(self, save_path: str):
        """Save the model weights."""
        if self.model is None:
            raise RuntimeError("No model to save")
        
        torch.save(self.model.state_dict(), save_path)
        logger.info(f"Model saved to {save_path}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        if self.model is None:
            return {"status": "not_initialized"}
        
        return {
            "status": "initialized",
            "architecture": "ResNet50",
            "num_classes": self.num_classes,
            "device": str(self.device),
            "pretrained": self.pretrained,
            "model_path": self.model_path,
            "categories": list(self.PART_CATEGORIES.keys()),
            "total_parts": len(self.ALL_CLASSES)
        }


class ClassificationEnsemble:
    """
    Ensemble of multiple classifiers for improved accuracy.
    """
    
    def __init__(self, models: List[PartClassifier]):
        """
        Initialize ensemble with multiple models.
        
        Args:
            models: List of PartClassifier instances
        """
        self.models = models
        
    def classify(
        self,
        image: Union[np.ndarray, Image.Image, str],
        top_k: int = 5,
        voting: str = 'soft'
    ) -> Dict[str, Any]:
        """
        Classify using ensemble voting.
        
        Args:
            image: Input image
            top_k: Number of top predictions
            voting: Voting method ('soft' or 'hard')
            
        Returns:
            Ensemble classification results
        """
        all_predictions = []
        
        # Get predictions from all models
        for model in self.models:
            result = model.classify_part(image, top_k=len(model.ALL_CLASSES))
            all_predictions.append(result['predictions'])
        
        if voting == 'soft':
            # Average probabilities
            class_scores = {}
            
            for predictions in all_predictions:
                for pred in predictions:
                    class_name = pred['class_name']
                    if class_name not in class_scores:
                        class_scores[class_name] = []
                    class_scores[class_name].append(pred['confidence'])
            
            # Average scores
            averaged_scores = []
            for class_name, scores in class_scores.items():
                avg_score = np.mean(scores)
                category = self.models[0].CLASS_TO_CATEGORY.get(class_name, 'unknown')
                averaged_scores.append({
                    'class_name': class_name,
                    'category': category,
                    'confidence': float(avg_score)
                })
            
            # Sort by confidence
            averaged_scores.sort(key=lambda x: x['confidence'], reverse=True)
            
            return {
                'predictions': averaged_scores[:top_k],
                'top_prediction': averaged_scores[0] if averaged_scores else None,
                'ensemble_size': len(self.models)
            }
        
        else:  # hard voting
            # Count votes
            votes = {}
            
            for predictions in all_predictions:
                if predictions:
                    top_class = predictions[0]['class_name']
                    votes[top_class] = votes.get(top_class, 0) + 1
            
            # Sort by votes
            sorted_votes = sorted(votes.items(), key=lambda x: x[1], reverse=True)
            
            predictions = []
            for class_name, vote_count in sorted_votes[:top_k]:
                category = self.models[0].CLASS_TO_CATEGORY.get(class_name, 'unknown')
                predictions.append({
                    'class_name': class_name,
                    'category': category,
                    'votes': vote_count,
                    'confidence': vote_count / len(self.models)
                })
            
            return {
                'predictions': predictions,
                'top_prediction': predictions[0] if predictions else None,
                'ensemble_size': len(self.models)
            }


# Global classifier instance
classifier = None


def get_classifier(
    model_path: Optional[str] = None,
    device: str = 'auto'
) -> PartClassifier:
    """
    Get or create the global classifier instance.
    
    Args:
        model_path: Path to model weights
        device: Device to use
        
    Returns:
        PartClassifier instance
    """
    global classifier
    
    if classifier is None:
        classifier = PartClassifier(model_path, device)
    
    return classifier