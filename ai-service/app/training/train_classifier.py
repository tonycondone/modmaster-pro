"""
ResNet50 training script for automotive part classification.
"""

import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms, models
import numpy as np
from PIL import Image
from typing import Dict, List, Tuple, Optional, Any
import logging
from pathlib import Path
import json
import yaml
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
from tqdm import tqdm
import wandb
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AutomotivePartsDataset(Dataset):
    """
    Dataset class for automotive parts classification.
    """
    
    def __init__(
        self,
        data_dir: str,
        transform: Optional[transforms.Compose] = None,
        mode: str = 'train'
    ):
        """
        Initialize dataset.
        
        Args:
            data_dir: Root directory of dataset
            transform: Image transformations
            mode: Dataset mode ('train', 'val', 'test')
        """
        self.data_dir = Path(data_dir)
        self.transform = transform
        self.mode = mode
        
        # Load dataset metadata
        self.samples = []
        self.class_to_idx = {}
        self.idx_to_class = {}
        
        self._load_dataset()
    
    def _load_dataset(self):
        """Load dataset from directory structure."""
        # Assuming directory structure: data_dir/class_name/image.jpg
        class_dirs = sorted([d for d in self.data_dir.iterdir() if d.is_dir()])
        
        for idx, class_dir in enumerate(class_dirs):
            class_name = class_dir.name
            self.class_to_idx[class_name] = idx
            self.idx_to_class[idx] = class_name
            
            # Get all images in class directory
            for img_path in class_dir.glob('*.jpg'):
                self.samples.append({
                    'path': str(img_path),
                    'class_idx': idx,
                    'class_name': class_name
                })
        
        logger.info(f"Loaded {len(self.samples)} samples from {len(self.class_to_idx)} classes")
    
    def __len__(self) -> int:
        return len(self.samples)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        sample = self.samples[idx]
        
        # Load image
        image = Image.open(sample['path']).convert('RGB')
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        
        return image, sample['class_idx']


class ResNetTrainer:
    """
    Handles training of ResNet50 for part classification.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize trainer.
        
        Args:
            config_path: Path to training configuration
        """
        self.config = self._load_config(config_path)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.best_accuracy = 0
        
    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load training configuration."""
        default_config = {
            'data_dir': 'data/automotive_parts',
            'num_classes': 30,
            'batch_size': 32,
            'num_epochs': 50,
            'learning_rate': 0.001,
            'weight_decay': 0.0001,
            'momentum': 0.9,
            'lr_scheduler': 'step',
            'lr_step_size': 10,
            'lr_gamma': 0.1,
            'train_split': 0.8,
            'val_split': 0.1,
            'test_split': 0.1,
            'num_workers': 4,
            'pin_memory': True,
            'pretrained': True,
            'freeze_backbone': False,
            'freeze_epochs': 5,
            'save_dir': 'models/resnet50_automotive',
            'log_interval': 10,
            'save_interval': 5,
            'use_wandb': False,
            'wandb_project': 'automotive-parts-classification',
            'early_stopping_patience': 10,
            'augmentation': {
                'random_rotation': 15,
                'random_horizontal_flip': 0.5,
                'color_jitter': 0.2,
                'random_resized_crop': 224,
                'normalize_mean': [0.485, 0.456, 0.406],
                'normalize_std': [0.229, 0.224, 0.225]
            }
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                custom_config = yaml.safe_load(f)
                default_config.update(custom_config)
        
        return default_config
    
    def _setup_data_loaders(self) -> Tuple[DataLoader, DataLoader, DataLoader]:
        """Setup data loaders for training."""
        # Define transforms
        train_transform = transforms.Compose([
            transforms.RandomResizedCrop(
                self.config['augmentation']['random_resized_crop']
            ),
            transforms.RandomHorizontalFlip(
                p=self.config['augmentation']['random_horizontal_flip']
            ),
            transforms.RandomRotation(
                self.config['augmentation']['random_rotation']
            ),
            transforms.ColorJitter(
                brightness=self.config['augmentation']['color_jitter'],
                contrast=self.config['augmentation']['color_jitter'],
                saturation=self.config['augmentation']['color_jitter'],
                hue=self.config['augmentation']['color_jitter']
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config['augmentation']['normalize_mean'],
                std=self.config['augmentation']['normalize_std']
            )
        ])
        
        val_transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config['augmentation']['normalize_mean'],
                std=self.config['augmentation']['normalize_std']
            )
        ])
        
        # Load full dataset
        full_dataset = AutomotivePartsDataset(
            self.config['data_dir'],
            transform=train_transform
        )
        
        # Split dataset
        total_size = len(full_dataset)
        train_size = int(self.config['train_split'] * total_size)
        val_size = int(self.config['val_split'] * total_size)
        test_size = total_size - train_size - val_size
        
        train_dataset, val_dataset, test_dataset = random_split(
            full_dataset,
            [train_size, val_size, test_size],
            generator=torch.Generator().manual_seed(42)
        )
        
        # Update transforms for validation and test
        val_dataset.dataset.transform = val_transform
        test_dataset.dataset.transform = val_transform
        
        # Create data loaders
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config['batch_size'],
            shuffle=True,
            num_workers=self.config['num_workers'],
            pin_memory=self.config['pin_memory']
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config['batch_size'],
            shuffle=False,
            num_workers=self.config['num_workers'],
            pin_memory=self.config['pin_memory']
        )
        
        test_loader = DataLoader(
            test_dataset,
            batch_size=self.config['batch_size'],
            shuffle=False,
            num_workers=self.config['num_workers'],
            pin_memory=self.config['pin_memory']
        )
        
        return train_loader, val_loader, test_loader
    
    def _setup_model(self):
        """Setup ResNet50 model."""
        # Load pretrained ResNet50
        self.model = models.resnet50(pretrained=self.config['pretrained'])
        
        # Modify final layer
        num_features = self.model.fc.in_features
        self.model.fc = nn.Linear(num_features, self.config['num_classes'])
        
        # Freeze backbone if specified
        if self.config['freeze_backbone']:
            for param in self.model.parameters():
                param.requires_grad = False
            # Unfreeze final layer
            for param in self.model.fc.parameters():
                param.requires_grad = True
        
        # Move to device
        self.model.to(self.device)
        
        logger.info(f"Model setup complete. Using device: {self.device}")
    
    def _setup_training(self):
        """Setup optimizer and loss function."""
        # Get parameters to optimize
        params_to_optimize = self.model.parameters()
        
        # Setup optimizer
        self.optimizer = optim.SGD(
            params_to_optimize,
            lr=self.config['learning_rate'],
            momentum=self.config['momentum'],
            weight_decay=self.config['weight_decay']
        )
        
        # Setup learning rate scheduler
        if self.config['lr_scheduler'] == 'step':
            self.scheduler = optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=self.config['lr_step_size'],
                gamma=self.config['lr_gamma']
            )
        elif self.config['lr_scheduler'] == 'cosine':
            self.scheduler = optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=self.config['num_epochs']
            )
        
        # Setup loss function
        self.criterion = nn.CrossEntropyLoss()
        
    def train_epoch(
        self,
        train_loader: DataLoader,
        epoch: int
    ) -> Tuple[float, float]:
        """Train for one epoch."""
        self.model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        progress_bar = tqdm(train_loader, desc=f'Epoch {epoch}')
        
        for batch_idx, (inputs, targets) in enumerate(progress_bar):
            inputs, targets = inputs.to(self.device), targets.to(self.device)
            
            # Zero gradients
            self.optimizer.zero_grad()
            
            # Forward pass
            outputs = self.model(inputs)
            loss = self.criterion(outputs, targets)
            
            # Backward pass
            loss.backward()
            self.optimizer.step()
            
            # Statistics
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
            
            # Update progress bar
            progress_bar.set_postfix({
                'loss': running_loss / (batch_idx + 1),
                'acc': 100. * correct / total
            })
        
        epoch_loss = running_loss / len(train_loader)
        epoch_acc = 100. * correct / total
        
        return epoch_loss, epoch_acc
    
    def validate(self, val_loader: DataLoader) -> Tuple[float, float]:
        """Validate the model."""
        self.model.eval()
        running_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for inputs, targets in tqdm(val_loader, desc='Validation'):
                inputs, targets = inputs.to(self.device), targets.to(self.device)
                
                outputs = self.model(inputs)
                loss = self.criterion(outputs, targets)
                
                running_loss += loss.item()
                _, predicted = outputs.max(1)
                total += targets.size(0)
                correct += predicted.eq(targets).sum().item()
        
        val_loss = running_loss / len(val_loader)
        val_acc = 100. * correct / total
        
        return val_loss, val_acc
    
    def train(self):
        """Main training loop."""
        # Setup
        train_loader, val_loader, test_loader = self._setup_data_loaders()
        self._setup_model()
        self._setup_training()
        
        # Initialize wandb if enabled
        if self.config['use_wandb']:
            wandb.init(
                project=self.config['wandb_project'],
                config=self.config
            )
        
        # Training history
        history = {
            'train_loss': [],
            'train_acc': [],
            'val_loss': [],
            'val_acc': []
        }
        
        # Early stopping
        patience_counter = 0
        
        # Create save directory
        save_dir = Path(self.config['save_dir'])
        save_dir.mkdir(parents=True, exist_ok=True)
        
        # Training loop
        for epoch in range(1, self.config['num_epochs'] + 1):
            logger.info(f"\nEpoch {epoch}/{self.config['num_epochs']}")
            
            # Unfreeze backbone after specified epochs
            if (self.config['freeze_backbone'] and 
                epoch == self.config['freeze_epochs'] + 1):
                logger.info("Unfreezing backbone layers")
                for param in self.model.parameters():
                    param.requires_grad = True
            
            # Train
            train_loss, train_acc = self.train_epoch(train_loader, epoch)
            
            # Validate
            val_loss, val_acc = self.validate(val_loader)
            
            # Update learning rate
            self.scheduler.step()
            
            # Log metrics
            logger.info(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
            logger.info(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
            
            # Update history
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['val_loss'].append(val_loss)
            history['val_acc'].append(val_acc)
            
            # Log to wandb
            if self.config['use_wandb']:
                wandb.log({
                    'train_loss': train_loss,
                    'train_acc': train_acc,
                    'val_loss': val_loss,
                    'val_acc': val_acc,
                    'learning_rate': self.optimizer.param_groups[0]['lr']
                })
            
            # Save best model
            if val_acc > self.best_accuracy:
                self.best_accuracy = val_acc
                self.save_model(save_dir / 'best_model.pth')
                patience_counter = 0
            else:
                patience_counter += 1
            
            # Save checkpoint
            if epoch % self.config['save_interval'] == 0:
                self.save_checkpoint(
                    save_dir / f'checkpoint_epoch_{epoch}.pth',
                    epoch,
                    history
                )
            
            # Early stopping
            if patience_counter >= self.config['early_stopping_patience']:
                logger.info(f"Early stopping triggered at epoch {epoch}")
                break
        
        # Final evaluation on test set
        logger.info("\nFinal evaluation on test set:")
        test_loss, test_acc = self.validate(test_loader)
        logger.info(f"Test Loss: {test_loss:.4f}, Test Acc: {test_acc:.2f}%")
        
        # Save final model
        self.save_model(save_dir / 'final_model.pth')
        
        # Save training history
        with open(save_dir / 'history.json', 'w') as f:
            json.dump(history, f)
        
        # Plot training curves
        self.plot_training_curves(history, save_dir / 'training_curves.png')
        
        return history
    
    def save_model(self, path: Path):
        """Save model weights."""
        torch.save(self.model.state_dict(), path)
        logger.info(f"Model saved to {path}")
    
    def save_checkpoint(self, path: Path, epoch: int, history: Dict):
        """Save training checkpoint."""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'best_accuracy': self.best_accuracy,
            'history': history,
            'config': self.config
        }
        torch.save(checkpoint, path)
        logger.info(f"Checkpoint saved to {path}")
    
    def load_checkpoint(self, path: Path):
        """Load training checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        self.best_accuracy = checkpoint['best_accuracy']
        
        return checkpoint['epoch'], checkpoint['history']
    
    def plot_training_curves(self, history: Dict, save_path: Path):
        """Plot training curves."""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Loss curves
        epochs = range(1, len(history['train_loss']) + 1)
        ax1.plot(epochs, history['train_loss'], 'b-', label='Train Loss')
        ax1.plot(epochs, history['val_loss'], 'r-', label='Val Loss')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Loss')
        ax1.set_title('Training and Validation Loss')
        ax1.legend()
        ax1.grid(True)
        
        # Accuracy curves
        ax2.plot(epochs, history['train_acc'], 'b-', label='Train Acc')
        ax2.plot(epochs, history['val_acc'], 'r-', label='Val Acc')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Accuracy (%)')
        ax2.set_title('Training and Validation Accuracy')
        ax2.legend()
        ax2.grid(True)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Training curves saved to {save_path}")
    
    def evaluate_with_confusion_matrix(
        self,
        test_loader: DataLoader,
        class_names: List[str],
        save_path: Optional[Path] = None
    ):
        """Evaluate model and generate confusion matrix."""
        self.model.eval()
        all_predictions = []
        all_targets = []
        
        with torch.no_grad():
            for inputs, targets in tqdm(test_loader, desc='Evaluation'):
                inputs = inputs.to(self.device)
                outputs = self.model(inputs)
                _, predicted = outputs.max(1)
                
                all_predictions.extend(predicted.cpu().numpy())
                all_targets.extend(targets.numpy())
        
        # Generate confusion matrix
        cm = confusion_matrix(all_targets, all_predictions)
        
        # Plot confusion matrix
        plt.figure(figsize=(15, 12))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            cmap='Blues',
            xticklabels=class_names,
            yticklabels=class_names
        )
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        plt.title('Confusion Matrix')
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Confusion matrix saved to {save_path}")
        
        # Generate classification report
        report = classification_report(
            all_targets,
            all_predictions,
            target_names=class_names,
            output_dict=True
        )
        
        return report


def main():
    """Main training script."""
    parser = argparse.ArgumentParser(
        description='Train ResNet50 for automotive part classification'
    )
    parser.add_argument('--config', type=str, help='Path to config file')
    parser.add_argument('--resume', type=str, help='Path to checkpoint')
    parser.add_argument('--evaluate', action='store_true', help='Evaluate only')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = ResNetTrainer(args.config)
    
    if args.evaluate:
        # Load model and evaluate
        _, _, test_loader = trainer._setup_data_loaders()
        trainer._setup_model()
        
        # Load best model
        model_path = Path(trainer.config['save_dir']) / 'best_model.pth'
        trainer.model.load_state_dict(torch.load(model_path))
        
        # Evaluate
        test_loss, test_acc = trainer.validate(test_loader)
        logger.info(f"Test Loss: {test_loss:.4f}, Test Acc: {test_acc:.2f}%")
        
    else:
        # Train model
        if args.resume:
            # Resume from checkpoint
            trainer._setup_model()
            trainer._setup_training()
            epoch, history = trainer.load_checkpoint(Path(args.resume))
            logger.info(f"Resuming from epoch {epoch}")
        
        trainer.train()


if __name__ == '__main__':
    main()