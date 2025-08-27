"""
Part Recommendation Engine Training Script
Uses collaborative filtering and content-based filtering for personalized recommendations
"""

import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, ndcg_score
import pickle
import json
from pathlib import Path
from datetime import datetime
import wandb
import argparse


class ModMasterDataset(Dataset):
    """Custom dataset for ModMaster recommendation engine"""
    
    def __init__(self, interactions_df, user_features, item_features):
        self.interactions = interactions_df
        self.user_features = user_features
        self.item_features = item_features
        
    def __len__(self):
        return len(self.interactions)
    
    def __getitem__(self, idx):
        row = self.interactions.iloc[idx]
        
        user_id = row['user_id']
        item_id = row['part_id']
        rating = row['rating']
        
        user_feat = self.user_features[user_id]
        item_feat = self.item_features[item_id]
        
        return {
            'user_features': torch.FloatTensor(user_feat),
            'item_features': torch.FloatTensor(item_feat),
            'rating': torch.FloatTensor([rating])
        }


class NeuralCollaborativeFiltering(nn.Module):
    """Neural Collaborative Filtering model for part recommendations"""
    
    def __init__(self, n_users, n_items, n_user_features, n_item_features, 
                 embedding_dim=64, hidden_dims=[128, 64, 32]):
        super().__init__()
        
        # User and item embeddings
        self.user_embedding = nn.Embedding(n_users, embedding_dim)
        self.item_embedding = nn.Embedding(n_items, embedding_dim)
        
        # Feature processing networks
        self.user_feature_net = nn.Sequential(
            nn.Linear(n_user_features, hidden_dims[0]),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dims[0], embedding_dim),
            nn.ReLU()
        )
        
        self.item_feature_net = nn.Sequential(
            nn.Linear(n_item_features, hidden_dims[0]),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dims[0], embedding_dim),
            nn.ReLU()
        )
        
        # Interaction network
        interaction_input_dim = embedding_dim * 4  # user_emb + item_emb + user_feat + item_feat
        
        layers = []
        prev_dim = interaction_input_dim
        for hidden_dim in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_dim),
                nn.Dropout(0.3)
            ])
            prev_dim = hidden_dim
        
        layers.append(nn.Linear(prev_dim, 1))
        self.interaction_net = nn.Sequential(*layers)
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        for module in self.modules():
            if isinstance(module, nn.Embedding):
                nn.init.normal_(module.weight, mean=0, std=0.01)
            elif isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
    
    def forward(self, user_ids, item_ids, user_features, item_features):
        # Get embeddings
        user_emb = self.user_embedding(user_ids)
        item_emb = self.item_embedding(item_ids)
        
        # Process features
        user_feat_processed = self.user_feature_net(user_features)
        item_feat_processed = self.item_feature_net(item_features)
        
        # Concatenate all representations
        combined = torch.cat([
            user_emb, item_emb, 
            user_feat_processed, item_feat_processed
        ], dim=1)
        
        # Get prediction
        rating = self.interaction_net(combined)
        
        return rating.squeeze()


class RecommendationEngine:
    """Main recommendation engine trainer"""
    
    def __init__(self, data_dir='data/processed', model_dir='models'):
        self.data_dir = Path(data_dir)
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
    def prepare_features(self, users_df, parts_df, vehicles_df):
        """Extract and engineer features for users and items"""
        
        # User features
        user_features = {}
        for _, user in users_df.iterrows():
            features = []
            
            # User preferences
            features.extend([
                user.get('subscription_tier', 0),
                user.get('total_scans', 0),
                user.get('total_projects', 0),
                user.get('reputation_score', 0),
                user.get('experience_level', 0),  # 0=beginner, 1=intermediate, 2=expert
            ])
            
            # Vehicle preferences (averaged across user's vehicles)
            user_vehicles = vehicles_df[vehicles_df['user_id'] == user['id']]
            if not user_vehicles.empty:
                features.extend([
                    user_vehicles['year'].mean(),
                    user_vehicles['performance_score'].mean(),
                    user_vehicles['modification_count'].mean(),
                ])
            else:
                features.extend([2020, 0, 0])  # Default values
            
            user_features[user['id']] = np.array(features)
        
        # Item (part) features
        item_features = {}
        category_encoder = LabelEncoder()
        parts_df['category_encoded'] = category_encoder.fit_transform(parts_df['category'])
        
        for _, part in parts_df.iterrows():
            features = []
            
            # Part characteristics
            features.extend([
                part['category_encoded'],
                part.get('price', 0),
                part.get('difficulty_score', 5),  # 1-10 installation difficulty
                part.get('performance_gain', 0),
                part.get('popularity_score', 0),
                part.get('quality_rating', 0),
                part.get('is_universal', 0),
                part.get('requires_tuning', 0),
            ])
            
            item_features[part['id']] = np.array(features)
        
        return user_features, item_features
    
    def create_interaction_matrix(self, interactions_df):
        """Create user-item interaction matrix from transaction/rating data"""
        
        # Create implicit feedback from various signals
        interaction_scores = []
        
        for _, interaction in interactions_df.iterrows():
            score = 0
            
            # Purchase signal (strongest)
            if interaction.get('purchased', False):
                score += 5
            
            # View signal
            if interaction.get('viewed', False):
                score += 1
            
            # Save/wishlist signal
            if interaction.get('saved', False):
                score += 3
            
            # Click signal
            if interaction.get('clicked', False):
                score += 2
            
            # Time spent signal (normalized to 0-2)
            time_spent = interaction.get('time_spent_seconds', 0)
            score += min(time_spent / 60, 2)
            
            # Rating signal (if available)
            if pd.notna(interaction.get('rating')):
                score = interaction['rating']  # Override with explicit rating
            
            interaction_scores.append(score)
        
        interactions_df['score'] = interaction_scores
        return interactions_df
    
    def train(self, interactions_df, users_df, parts_df, vehicles_df, 
              epochs=50, batch_size=256, learning_rate=0.001, use_wandb=True):
        """Train the recommendation model"""
        
        if use_wandb:
            wandb.init(
                project="modmaster-recommendations",
                name=f"ncf_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                config={
                    "epochs": epochs,
                    "batch_size": batch_size,
                    "learning_rate": learning_rate,
                    "device": str(self.device)
                }
            )
        
        # Prepare features
        print("Preparing features...")
        user_features, item_features = self.prepare_features(users_df, parts_df, vehicles_df)
        
        # Create interaction matrix
        print("Creating interaction matrix...")
        interactions = self.create_interaction_matrix(interactions_df)
        
        # Split data
        train_data, val_data = train_test_split(interactions, test_size=0.2, random_state=42)
        
        # Create datasets
        train_dataset = ModMasterDataset(train_data, user_features, item_features)
        val_dataset = ModMasterDataset(val_data, user_features, item_features)
        
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
        
        # Initialize model
        n_users = len(user_features)
        n_items = len(item_features)
        n_user_features = len(next(iter(user_features.values())))
        n_item_features = len(next(iter(item_features.values())))
        
        model = NeuralCollaborativeFiltering(
            n_users, n_items, n_user_features, n_item_features
        ).to(self.device)
        
        # Loss and optimizer
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', patience=5, factor=0.5
        )
        
        # Training loop
        print("Starting training...")
        best_val_loss = float('inf')
        
        for epoch in range(epochs):
            # Training
            model.train()
            train_loss = 0
            
            for batch in train_loader:
                user_feat = batch['user_features'].to(self.device)
                item_feat = batch['item_features'].to(self.device)
                ratings = batch['rating'].to(self.device)
                
                # Forward pass
                predictions = model(
                    torch.arange(len(user_feat)).to(self.device),
                    torch.arange(len(item_feat)).to(self.device),
                    user_feat, item_feat
                )
                
                loss = criterion(predictions, ratings)
                
                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item()
            
            # Validation
            model.eval()
            val_loss = 0
            
            with torch.no_grad():
                for batch in val_loader:
                    user_feat = batch['user_features'].to(self.device)
                    item_feat = batch['item_features'].to(self.device)
                    ratings = batch['rating'].to(self.device)
                    
                    predictions = model(
                        torch.arange(len(user_feat)).to(self.device),
                        torch.arange(len(item_feat)).to(self.device),
                        user_feat, item_feat
                    )
                    
                    loss = criterion(predictions, ratings)
                    val_loss += loss.item()
            
            # Calculate average losses
            avg_train_loss = train_loss / len(train_loader)
            avg_val_loss = val_loss / len(val_loader)
            
            print(f"Epoch {epoch+1}/{epochs} - Train Loss: {avg_train_loss:.4f}, Val Loss: {avg_val_loss:.4f}")
            
            # Learning rate scheduling
            scheduler.step(avg_val_loss)
            
            # Save best model
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_loss': avg_val_loss,
                    'config': {
                        'n_users': n_users,
                        'n_items': n_items,
                        'n_user_features': n_user_features,
                        'n_item_features': n_item_features
                    }
                }, self.model_dir / 'best_recommendation_model.pt')
            
            # Log to wandb
            if use_wandb:
                wandb.log({
                    'train_loss': avg_train_loss,
                    'val_loss': avg_val_loss,
                    'learning_rate': optimizer.param_groups[0]['lr']
                })
        
        print(f"Training completed! Best validation loss: {best_val_loss:.4f}")
        
        # Save feature encoders
        with open(self.model_dir / 'feature_encoders.pkl', 'wb') as f:
            pickle.dump({
                'user_features': user_features,
                'item_features': item_features
            }, f)
        
        if use_wandb:
            wandb.finish()
        
        return model


def main():
    parser = argparse.ArgumentParser(description='Train Recommendation Engine')
    parser.add_argument('--data-dir', type=str, default='data/processed',
                        help='Directory containing processed data')
    parser.add_argument('--epochs', type=int, default=50,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=256,
                        help='Batch size for training')
    parser.add_argument('--lr', type=float, default=0.001,
                        help='Learning rate')
    parser.add_argument('--no-wandb', action='store_true',
                        help='Disable Weights & Biases logging')
    
    args = parser.parse_args()
    
    # Load data (placeholder - replace with actual data loading)
    print("Loading data...")
    # interactions_df = pd.read_csv(f"{args.data_dir}/interactions.csv")
    # users_df = pd.read_csv(f"{args.data_dir}/users.csv")
    # parts_df = pd.read_csv(f"{args.data_dir}/parts.csv")
    # vehicles_df = pd.read_csv(f"{args.data_dir}/vehicles.csv")
    
    # Initialize trainer
    trainer = RecommendationEngine(data_dir=args.data_dir)
    
    # Train model
    # model = trainer.train(
    #     interactions_df, users_df, parts_df, vehicles_df,
    #     epochs=args.epochs,
    #     batch_size=args.batch_size,
    #     learning_rate=args.lr,
    #     use_wandb=not args.no_wandb
    # )


if __name__ == '__main__':
    main()