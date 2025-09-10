"""
YOLOv8 training script for automotive part detection.
"""

import os
import yaml
import torch
import argparse
from pathlib import Path
from ultralytics import YOLO
from typing import Dict, Any, Optional
import logging
from datetime import datetime
import json
import matplotlib.pyplot as plt
import numpy as np
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class YOLOTrainer:
    """
    Handles training of YOLOv8 models for automotive part detection.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the trainer.
        
        Args:
            config_path: Path to training configuration file
        """
        self.config = self._load_config(config_path)
        self.model = None
        self.results = None
        self.device = self._get_device()
        
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load training configuration."""
        default_config = {
            'model': 'yolov8n.pt',  # Base model
            'data': 'automotive_parts.yaml',  # Dataset config
            'epochs': 100,
            'imgsz': 640,
            'batch': 16,
            'patience': 50,
            'save': True,
            'device': 'auto',
            'workers': 8,
            'project': 'runs/train',
            'name': 'automotive_parts',
            'exist_ok': False,
            'pretrained': True,
            'optimizer': 'SGD',
            'verbose': True,
            'seed': 42,
            'deterministic': True,
            'single_cls': False,
            'rect': False,
            'cos_lr': False,
            'close_mosaic': 10,
            'resume': False,
            'amp': True,
            'fraction': 1.0,
            'profile': False,
            'freeze': None,
            'lr0': 0.01,
            'lrf': 0.01,
            'momentum': 0.937,
            'weight_decay': 0.0005,
            'warmup_epochs': 3.0,
            'warmup_momentum': 0.8,
            'warmup_bias_lr': 0.1,
            'box': 7.5,
            'cls': 0.5,
            'dfl': 1.5,
            'pose': 12.0,
            'kobj': 1.0,
            'label_smoothing': 0.0,
            'nbs': 64,
            'hsv_h': 0.015,
            'hsv_s': 0.7,
            'hsv_v': 0.4,
            'degrees': 0.0,
            'translate': 0.1,
            'scale': 0.5,
            'shear': 0.0,
            'perspective': 0.0,
            'flipud': 0.0,
            'fliplr': 0.5,
            'mosaic': 1.0,
            'mixup': 0.0,
            'copy_paste': 0.0,
            'auto_augment': 'randaugment',
            'erasing': 0.4,
            'crop_fraction': 1.0
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                custom_config = yaml.safe_load(f)
                default_config.update(custom_config)
        
        return default_config
    
    def _get_device(self) -> torch.device:
        """Determine the device to use for training."""
        device_config = self.config.get('device', 'auto')
        if device_config == 'auto':
            return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        return torch.device(device_config)
    
    def prepare_dataset(self, data_dir: str, output_dir: str):
        """
        Prepare dataset in YOLO format.
        
        Args:
            data_dir: Directory containing raw data
            output_dir: Directory to save YOLO-formatted data
        """
        logger.info(f"Preparing dataset from {data_dir}")
        
        # Create output directory structure
        output_path = Path(output_dir)
        (output_path / 'images' / 'train').mkdir(parents=True, exist_ok=True)
        (output_path / 'images' / 'val').mkdir(parents=True, exist_ok=True)
        (output_path / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
        (output_path / 'labels' / 'val').mkdir(parents=True, exist_ok=True)
        
        # Create dataset YAML configuration
        dataset_config = {
            'path': str(output_path),
            'train': 'images/train',
            'val': 'images/val',
            'names': {
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
        }
        
        # Save dataset configuration
        config_path = output_path / 'automotive_parts.yaml'
        with open(config_path, 'w') as f:
            yaml.dump(dataset_config, f)
        
        logger.info(f"Dataset configuration saved to {config_path}")
        return str(config_path)
    
    def train(self, resume: bool = False):
        """
        Train the YOLOv8 model.
        
        Args:
            resume: Whether to resume from a previous training run
        """
        logger.info("Starting training...")
        
        # Initialize model
        if resume and os.path.exists('runs/train/automotive_parts/weights/last.pt'):
            logger.info("Resuming from previous training")
            self.model = YOLO('runs/train/automotive_parts/weights/last.pt')
        else:
            logger.info(f"Loading base model: {self.config['model']}")
            self.model = YOLO(self.config['model'])
        
        # Update config for resuming
        self.config['resume'] = resume
        
        # Train the model
        self.results = self.model.train(**self.config)
        
        logger.info("Training completed!")
        return self.results
    
    def validate(self, model_path: Optional[str] = None):
        """
        Validate the trained model.
        
        Args:
            model_path: Path to model weights (uses best.pt if not specified)
        """
        if model_path is None:
            model_path = 'runs/train/automotive_parts/weights/best.pt'
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        logger.info(f"Validating model: {model_path}")
        model = YOLO(model_path)
        
        # Run validation
        metrics = model.val(data=self.config['data'])
        
        # Log metrics
        logger.info(f"mAP50: {metrics.box.map50:.4f}")
        logger.info(f"mAP50-95: {metrics.box.map:.4f}")
        
        return metrics
    
    def export_model(self, format: str = 'onnx', model_path: Optional[str] = None):
        """
        Export the trained model to different formats.
        
        Args:
            format: Export format ('onnx', 'torchscript', 'coreml', 'tflite')
            model_path: Path to model weights
        """
        if model_path is None:
            model_path = 'runs/train/automotive_parts/weights/best.pt'
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}")
        
        logger.info(f"Exporting model to {format} format")
        model = YOLO(model_path)
        
        # Export model
        export_path = model.export(format=format)
        logger.info(f"Model exported to: {export_path}")
        
        return export_path
    
    def plot_training_results(self, save_path: Optional[str] = None):
        """
        Plot training results and metrics.
        
        Args:
            save_path: Path to save the plots
        """
        results_path = Path('runs/train/automotive_parts/results.csv')
        
        if not results_path.exists():
            logger.warning("Results file not found")
            return
        
        # Read results
        import pandas as pd
        df = pd.read_csv(results_path)
        df.columns = [col.strip() for col in df.columns]
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        fig.suptitle('YOLOv8 Training Results', fontsize=16)
        
        # Plot loss curves
        if 'train/box_loss' in df.columns:
            axes[0, 0].plot(df.index, df['train/box_loss'], label='Box Loss')
            axes[0, 0].set_title('Box Loss')
            axes[0, 0].set_xlabel('Epoch')
            axes[0, 0].set_ylabel('Loss')
            axes[0, 0].legend()
            axes[0, 0].grid(True)
        
        if 'train/cls_loss' in df.columns:
            axes[0, 1].plot(df.index, df['train/cls_loss'], label='Class Loss')
            axes[0, 1].set_title('Classification Loss')
            axes[0, 1].set_xlabel('Epoch')
            axes[0, 1].set_ylabel('Loss')
            axes[0, 1].legend()
            axes[0, 1].grid(True)
        
        # Plot metrics
        if 'metrics/precision(B)' in df.columns:
            axes[1, 0].plot(df.index, df['metrics/precision(B)'], label='Precision')
            axes[1, 0].plot(df.index, df['metrics/recall(B)'], label='Recall')
            axes[1, 0].set_title('Precision & Recall')
            axes[1, 0].set_xlabel('Epoch')
            axes[1, 0].set_ylabel('Score')
            axes[1, 0].legend()
            axes[1, 0].grid(True)
        
        if 'metrics/mAP50(B)' in df.columns:
            axes[1, 1].plot(df.index, df['metrics/mAP50(B)'], label='mAP50')
            axes[1, 1].plot(df.index, df['metrics/mAP50-95(B)'], label='mAP50-95')
            axes[1, 1].set_title('Mean Average Precision')
            axes[1, 1].set_xlabel('Epoch')
            axes[1, 1].set_ylabel('mAP')
            axes[1, 1].legend()
            axes[1, 1].grid(True)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Plot saved to {save_path}")
        else:
            plt.show()
    
    def hyperparameter_tuning(self, n_trials: int = 10):
        """
        Perform hyperparameter tuning using Ray Tune or similar.
        
        Args:
            n_trials: Number of trials to run
        """
        logger.info(f"Starting hyperparameter tuning with {n_trials} trials")
        
        # Define hyperparameter search space
        search_space = {
            'lr0': [0.001, 0.01, 0.1],
            'momentum': [0.9, 0.937, 0.95],
            'weight_decay': [0.0001, 0.0005, 0.001],
            'warmup_epochs': [1, 3, 5],
            'box': [5.0, 7.5, 10.0],
            'cls': [0.3, 0.5, 0.7]
        }
        
        # This is a simplified version. In production, use Ray Tune or Optuna
        best_map = 0
        best_params = {}
        
        for trial in range(n_trials):
            # Sample hyperparameters
            trial_params = {}
            for param, values in search_space.items():
                trial_params[param] = np.random.choice(values)
            
            logger.info(f"Trial {trial + 1}: {trial_params}")
            
            # Update config
            trial_config = self.config.copy()
            trial_config.update(trial_params)
            trial_config['epochs'] = 30  # Shorter for tuning
            trial_config['name'] = f'trial_{trial}'
            
            # Train with trial parameters
            try:
                model = YOLO(self.config['model'])
                results = model.train(**trial_config)
                
                # Get validation mAP
                metrics = model.val(data=trial_config['data'])
                map50 = metrics.box.map50
                
                if map50 > best_map:
                    best_map = map50
                    best_params = trial_params
                    logger.info(f"New best mAP50: {map50:.4f}")
                
            except Exception as e:
                logger.error(f"Trial {trial} failed: {str(e)}")
                continue
        
        logger.info(f"Best parameters: {best_params}")
        logger.info(f"Best mAP50: {best_map:.4f}")
        
        return best_params


def main():
    """Main training script."""
    parser = argparse.ArgumentParser(description='Train YOLOv8 for automotive part detection')
    parser.add_argument('--config', type=str, help='Path to training configuration file')
    parser.add_argument('--data-dir', type=str, help='Path to dataset directory')
    parser.add_argument('--resume', action='store_true', help='Resume training from last checkpoint')
    parser.add_argument('--validate', action='store_true', help='Run validation only')
    parser.add_argument('--export', type=str, choices=['onnx', 'torchscript', 'coreml', 'tflite'],
                        help='Export model to specified format')
    parser.add_argument('--tune', action='store_true', help='Run hyperparameter tuning')
    parser.add_argument('--plot', action='store_true', help='Plot training results')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = YOLOTrainer(args.config)
    
    if args.validate:
        # Run validation
        trainer.validate()
    elif args.export:
        # Export model
        trainer.export_model(format=args.export)
    elif args.tune:
        # Run hyperparameter tuning
        trainer.hyperparameter_tuning()
    elif args.plot:
        # Plot results
        trainer.plot_training_results('training_results.png')
    else:
        # Prepare dataset if provided
        if args.data_dir:
            dataset_config = trainer.prepare_dataset(args.data_dir, 'datasets/automotive_parts')
            trainer.config['data'] = dataset_config
        
        # Train model
        trainer.train(resume=args.resume)
        
        # Validate after training
        trainer.validate()
        
        # Plot results
        trainer.plot_training_results('training_results.png')


if __name__ == '__main__':
    main()