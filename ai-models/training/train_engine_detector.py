"""
Engine Part Detection Model Training Script
Uses YOLOv8 for detecting automotive parts in engine bay images
"""

import os
import yaml
import torch
from pathlib import Path
from ultralytics import YOLO
import wandb
from datetime import datetime
import argparse
import json

# Initialize paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
MODELS_DIR = BASE_DIR / 'models'
CONFIGS_DIR = BASE_DIR / 'training' / 'configs'

# Ensure directories exist
MODELS_DIR.mkdir(exist_ok=True)
(DATA_DIR / 'raw').mkdir(parents=True, exist_ok=True)
(DATA_DIR / 'processed').mkdir(exist_ok=True)

class EnginePartDetector:
    """Train YOLOv8 model for automotive part detection"""
    
    # Define automotive part classes
    PART_CLASSES = [
        'air_filter', 'alternator', 'battery', 'brake_fluid_reservoir',
        'coolant_reservoir', 'engine_block', 'exhaust_manifold', 
        'fuel_injector', 'intake_manifold', 'oil_dipstick', 'oil_filter',
        'power_steering_pump', 'radiator', 'spark_plug', 'starter_motor',
        'throttle_body', 'turbocharger', 'valve_cover', 'water_pump',
        'windshield_washer_reservoir'
    ]
    
    def __init__(self, model_size='x', use_wandb=True):
        """
        Initialize the trainer
        
        Args:
            model_size: YOLO model size (n, s, m, l, x)
            use_wandb: Whether to use Weights & Biases for tracking
        """
        self.model_size = model_size
        self.use_wandb = use_wandb
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        
        # Initialize wandb if requested
        if self.use_wandb:
            wandb.init(
                project="modmaster-engine-detection",
                name=f"yolov8{model_size}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                config={
                    "model_size": model_size,
                    "classes": self.PART_CLASSES,
                    "device": self.device
                }
            )
    
    def prepare_dataset_config(self):
        """Create YAML configuration for YOLO training"""
        config = {
            'path': str(DATA_DIR / 'processed' / 'engine_parts'),
            'train': 'images/train',
            'val': 'images/val',
            'test': 'images/test',
            'names': {i: name for i, name in enumerate(self.PART_CLASSES)}
        }
        
        config_path = CONFIGS_DIR / 'engine_parts.yaml'
        config_path.parent.mkdir(exist_ok=True)
        
        with open(config_path, 'w') as f:
            yaml.dump(config, f)
        
        return config_path
    
    def augmentation_config(self):
        """Define augmentation parameters for training"""
        return {
            'hsv_h': 0.015,  # Hue augmentation
            'hsv_s': 0.7,    # Saturation augmentation
            'hsv_v': 0.4,    # Value augmentation
            'degrees': 5,     # Rotation (+/- deg)
            'translate': 0.1, # Translation (+/- fraction)
            'scale': 0.5,     # Scale (+/- gain)
            'shear': 2.0,     # Shear (+/- deg)
            'perspective': 0.0001,  # Perspective (+/- fraction)
            'flipud': 0.0,    # Flip up-down (probability)
            'fliplr': 0.5,    # Flip left-right (probability)
            'mosaic': 1.0,    # Mosaic augmentation (probability)
            'mixup': 0.2,     # Mixup augmentation (probability)
            'copy_paste': 0.1 # Copy-paste augmentation (probability)
        }
    
    def train(self, epochs=100, batch_size=16, imgsz=640):
        """
        Train the YOLOv8 model
        
        Args:
            epochs: Number of training epochs
            batch_size: Batch size for training
            imgsz: Image size for training
        """
        # Prepare dataset configuration
        data_config = self.prepare_dataset_config()
        
        # Initialize model
        model = YOLO(f'yolov8{self.model_size}.pt')
        
        # Training arguments
        train_args = {
            'data': str(data_config),
            'epochs': epochs,
            'imgsz': imgsz,
            'batch': batch_size,
            'device': self.device,
            'project': str(MODELS_DIR / 'engine_detector'),
            'name': f'yolov8{self.model_size}_engine_parts',
            'exist_ok': True,
            'pretrained': True,
            'optimizer': 'Adam',
            'lr0': 0.001,
            'lrf': 0.01,
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': 3.0,
            'warmup_momentum': 0.8,
            'warmup_bias_lr': 0.1,
            'box': 0.05,
            'cls': 0.5,
            'cls_pw': 1.0,
            'obj': 1.0,
            'obj_pw': 1.0,
            'iou_t': 0.20,
            'anchor_t': 4.0,
            'fl_gamma': 0.0,
            'label_smoothing': 0.1,
            'nbs': 64,
            'overlap_mask': True,
            'mask_ratio': 4,
            'dropout': 0.0,
            'val': True,
            'plots': True,
            'save': True,
            'save_period': 10,
            'cache': True,
            'workers': 8,
            'amp': True,  # Automatic mixed precision
            'patience': 50,  # Early stopping patience
            **self.augmentation_config()
        }
        
        # Add wandb callback if enabled
        if self.use_wandb:
            train_args['callbacks'] = [wandb]
        
        # Train the model
        print(f"Starting training on {self.device}...")
        results = model.train(**train_args)
        
        # Save best model
        best_model_path = MODELS_DIR / 'engine_detector' / f'best_yolov8{self.model_size}_engine.pt'
        model.save(best_model_path)
        
        print(f"Training completed! Best model saved to: {best_model_path}")
        
        # Log final metrics
        if self.use_wandb:
            wandb.log({
                'final_map50': results.maps[0],
                'final_map50_95': results.maps[1],
                'final_precision': results.box.p,
                'final_recall': results.box.r
            })
            wandb.finish()
        
        return model, results
    
    def validate(self, model_path, data_config=None):
        """Validate a trained model"""
        model = YOLO(model_path)
        
        if data_config is None:
            data_config = self.prepare_dataset_config()
        
        results = model.val(data=str(data_config))
        
        print("\nValidation Results:")
        print(f"mAP50: {results.maps[0]:.4f}")
        print(f"mAP50-95: {results.maps[1]:.4f}")
        print(f"Precision: {results.box.p:.4f}")
        print(f"Recall: {results.box.r:.4f}")
        
        return results
    
    def export_model(self, model_path, formats=['onnx', 'torchscript']):
        """Export model to different formats for deployment"""
        model = YOLO(model_path)
        
        exported_models = {}
        for fmt in formats:
            print(f"Exporting to {fmt}...")
            exported_path = model.export(format=fmt)
            exported_models[fmt] = exported_path
            print(f"Exported to: {exported_path}")
        
        # Save export info
        export_info = {
            'original_model': str(model_path),
            'exported_formats': exported_models,
            'export_date': datetime.now().isoformat(),
            'classes': self.PART_CLASSES
        }
        
        with open(MODELS_DIR / 'export_info.json', 'w') as f:
            json.dump(export_info, f, indent=2)
        
        return exported_models


def main():
    parser = argparse.ArgumentParser(description='Train Engine Part Detection Model')
    parser.add_argument('--model-size', type=str, default='x', 
                        choices=['n', 's', 'm', 'l', 'x'],
                        help='YOLOv8 model size')
    parser.add_argument('--epochs', type=int, default=100,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16,
                        help='Batch size for training')
    parser.add_argument('--img-size', type=int, default=640,
                        help='Image size for training')
    parser.add_argument('--no-wandb', action='store_true',
                        help='Disable Weights & Biases logging')
    parser.add_argument('--validate-only', type=str,
                        help='Path to model for validation only')
    parser.add_argument('--export', type=str,
                        help='Path to model for export')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = EnginePartDetector(
        model_size=args.model_size,
        use_wandb=not args.no_wandb
    )
    
    if args.validate_only:
        # Validation mode
        trainer.validate(args.validate_only)
    elif args.export:
        # Export mode
        trainer.export_model(args.export)
    else:
        # Training mode
        model, results = trainer.train(
            epochs=args.epochs,
            batch_size=args.batch_size,
            imgsz=args.img_size
        )
        
        # Validate the trained model
        trainer.validate(MODELS_DIR / 'engine_detector' / f'best_yolov8{args.model_size}_engine.pt')


if __name__ == '__main__':
    main()