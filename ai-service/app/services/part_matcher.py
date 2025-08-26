import numpy as np
from typing import Dict, List, Any, Optional
from loguru import logger
import httpx

from app.db.postgres import database
from app.db.redis_client import redis_client
from app.config import settings

class PartMatcher:
    """Matches detected objects and classifications to parts in the database."""
    
    def __init__(self):
        self.category_mappings = {
            # YOLO class to part category mappings
            'car': 'exterior',
            'truck': 'exterior',
            'wheel': 'wheels_tires',
            'tire': 'wheels_tires',
            # Add more mappings as needed
        }
    
    async def match_detection(self, detection: Dict[str, Any], image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Match a detection to a part in the database."""
        class_name = detection['class_name'].lower()
        
        # Check cache first
        cache_key = f"part_match:{class_name}:{detection['confidence']:.2f}"
        cached_match = await redis_client.get(cache_key)
        if cached_match:
            return cached_match
        
        # Map to part category
        category = self.category_mappings.get(class_name)
        if not category:
            return None
        
        # Query database for matching parts
        query = """
            SELECT id, name, part_number, manufacturer, category
            FROM parts
            WHERE category = :category
            AND is_active = true
            ORDER BY trending_score DESC
            LIMIT 10
        """
        
        parts = await database.fetch_all(query, {"category": category})
        
        if not parts:
            return None
        
        # For now, return the most popular part in the category
        # In production, use more sophisticated matching
        best_match = dict(parts[0])
        result = {
            'part_id': best_match['id'],
            'part_name': best_match['name'],
            'part_number': best_match['part_number'],
            'manufacturer': best_match['manufacturer'],
            'match_confidence': detection['confidence']
        }
        
        # Cache the result
        await redis_client.set(cache_key, result, ttl=3600)
        
        return result
    
    async def match_classification(self, classification: Dict[str, Any], image: np.ndarray) -> Optional[Dict[str, Any]]:
        """Match a classification result to a part in the database."""
        top_pred = classification['top_prediction']
        class_name = top_pred['class_name'].lower()
        
        # Search for parts with similar names
        query = """
            SELECT id, name, part_number, manufacturer, category,
                   ts_rank(to_tsvector('english', name || ' ' || coalesce(description, '')), 
                          plainto_tsquery('english', :search_term)) as relevance
            FROM parts
            WHERE to_tsvector('english', name || ' ' || coalesce(description, '')) 
                  @@ plainto_tsquery('english', :search_term)
            AND is_active = true
            ORDER BY relevance DESC, trending_score DESC
            LIMIT 5
        """
        
        parts = await database.fetch_all(query, {"search_term": class_name})
        
        if not parts:
            # Try fuzzy matching
            return await self._fuzzy_match_part(class_name)
        
        # Return best match with alternatives
        best_match = dict(parts[0])
        alternatives = [dict(p) for p in parts[1:3]]  # Top 3 alternatives
        
        return {
            'part_id': best_match['id'],
            'part_name': best_match['name'],
            'part_number': best_match.get('part_number'),
            'manufacturer': best_match.get('manufacturer'),
            'relevance_score': float(best_match['relevance']),
            'alternatives': alternatives
        }
    
    async def _fuzzy_match_part(self, search_term: str) -> Optional[Dict[str, Any]]:
        """Perform fuzzy matching for parts."""
        # Use trigram similarity for fuzzy matching
        query = """
            SELECT id, name, part_number, manufacturer, category,
                   similarity(name, :search_term) as sim
            FROM parts
            WHERE similarity(name, :search_term) > 0.3
            AND is_active = true
            ORDER BY sim DESC
            LIMIT 1
        """
        
        result = await database.fetch_one(query, {"search_term": search_term})
        
        if result and result['sim'] > 0.5:
            return {
                'part_id': result['id'],
                'part_name': result['name'],
                'part_number': result.get('part_number'),
                'manufacturer': result.get('manufacturer'),
                'similarity_score': float(result['sim'])
            }
        
        return None