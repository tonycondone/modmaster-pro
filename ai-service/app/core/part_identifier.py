import numpy as np
from typing import List, Dict, Optional
import json
from pathlib import Path
import asyncio

from app.models.scan import PartInfo, PartCategory
from app.utils.logger import logger

class PartIdentifier:
    """Identifies and classifies vehicle parts."""
    
    def __init__(self):
        self.part_database = {}
        self.brand_mapping = {}
        self.category_mapping = {}
        self._load_part_database()
    
    def _load_part_database(self):
        """Load part database from file."""
        try:
            # Load part database
            db_path = Path(__file__).parent / "data" / "parts_database.json"
            if db_path.exists():
                with open(db_path, 'r') as f:
                    self.part_database = json.load(f)
            
            # Load brand mapping
            brand_path = Path(__file__).parent / "data" / "brand_mapping.json"
            if brand_path.exists():
                with open(brand_path, 'r') as f:
                    self.brand_mapping = json.load(f)
            
            # Load category mapping
            category_path = Path(__file__).parent / "data" / "category_mapping.json"
            if category_path.exists():
                with open(category_path, 'r') as f:
                    self.category_mapping = json.load(f)
            
            logger.info(f"Loaded {len(self.part_database)} parts from database")
            
        except Exception as e:
            logger.error(f"Error loading part database: {str(e)}")
            # Initialize with default data
            self._initialize_default_database()
    
    def _initialize_default_database(self):
        """Initialize with default part database."""
        self.part_database = {
            "engine": {
                "name": "Engine",
                "part_number": "ENG-001",
                "category": "Engine",
                "brand": "Toyota",
                "description": "Internal combustion engine",
                "compatibility": ["Toyota", "Honda", "Ford"],
                "price_range": {"min": 2000, "max": 8000}
            },
            "transmission": {
                "name": "Transmission",
                "part_number": "TRN-001",
                "category": "Transmission",
                "brand": "Aisin",
                "description": "Automatic transmission system",
                "compatibility": ["Toyota", "Lexus"],
                "price_range": {"min": 1500, "max": 5000}
            },
            "brake": {
                "name": "Brake System",
                "part_number": "BRK-001",
                "category": "Brakes",
                "brand": "Brembo",
                "description": "Disc brake system",
                "compatibility": ["Universal"],
                "price_range": {"min": 200, "max": 800}
            },
            "suspension": {
                "name": "Suspension System",
                "part_number": "SUS-001",
                "category": "Suspension",
                "brand": "KYB",
                "description": "Shock absorber and suspension components",
                "compatibility": ["Universal"],
                "price_range": {"min": 100, "max": 500}
            },
            "exhaust": {
                "name": "Exhaust System",
                "part_number": "EXH-001",
                "category": "Exhaust",
                "brand": "MagnaFlow",
                "description": "Performance exhaust system",
                "compatibility": ["Universal"],
                "price_range": {"min": 300, "max": 1200}
            },
            "radiator": {
                "name": "Radiator",
                "part_number": "RAD-001",
                "category": "Cooling",
                "brand": "Denso",
                "description": "Engine cooling radiator",
                "compatibility": ["Toyota", "Honda"],
                "price_range": {"min": 150, "max": 400}
            },
            "alternator": {
                "name": "Alternator",
                "part_number": "ALT-001",
                "category": "Electrical",
                "brand": "Denso",
                "description": "Battery charging alternator",
                "compatibility": ["Universal"],
                "price_range": {"min": 100, "max": 300}
            },
            "starter": {
                "name": "Starter Motor",
                "part_number": "STR-001",
                "category": "Electrical",
                "brand": "Denso",
                "description": "Engine starter motor",
                "compatibility": ["Universal"],
                "price_range": {"min": 80, "max": 250}
            },
            "battery": {
                "name": "Battery",
                "part_number": "BAT-001",
                "category": "Electrical",
                "brand": "Optima",
                "description": "12V automotive battery",
                "compatibility": ["Universal"],
                "price_range": {"min": 100, "max": 300}
            },
            "fuel_pump": {
                "name": "Fuel Pump",
                "part_number": "FP-001",
                "category": "Fuel",
                "brand": "Bosch",
                "description": "Electric fuel pump",
                "compatibility": ["Universal"],
                "price_range": {"min": 50, "max": 200}
            }
        }
    
    async def identify_part(self, part_name: str, confidence: float = 0.0) -> PartInfo:
        """
        Identify part details from detected part name.
        
        Args:
            part_name: Detected part name
            confidence: Detection confidence
            
        Returns:
            PartInfo with detailed information
        """
        try:
            # Normalize part name
            normalized_name = self._normalize_part_name(part_name)
            
            # Get part details from database
            part_details = self.part_database.get(normalized_name, {})
            
            if not part_details:
                # Try fuzzy matching
                matched_name = self._fuzzy_match_part(part_name)
                if matched_name:
                    part_details = self.part_database.get(matched_name, {})
            
            # Create PartInfo
            part_info = PartInfo(
                name=part_details.get("name", part_name.title()),
                part_number=part_details.get("part_number", ""),
                category=part_details.get("category", "Unknown"),
                brand=part_details.get("brand", ""),
                confidence=confidence
            )
            
            return part_info
            
        except Exception as e:
            logger.error(f"Error identifying part {part_name}: {str(e)}")
            return PartInfo(
                name=part_name.title(),
                part_number="",
                category="Unknown",
                brand="",
                confidence=confidence
            )
    
    def _normalize_part_name(self, part_name: str) -> str:
        """Normalize part name for database lookup."""
        # Convert to lowercase and remove special characters
        normalized = part_name.lower().strip()
        normalized = normalized.replace("_", " ").replace("-", " ")
        
        # Common variations
        variations = {
            "engine": ["motor", "powerplant"],
            "transmission": ["trans", "gearbox"],
            "brake": ["brakes", "braking"],
            "suspension": ["shock", "absorber"],
            "exhaust": ["muffler", "tailpipe"],
            "radiator": ["cooling", "heat exchanger"],
            "alternator": ["generator", "charging"],
            "starter": ["start motor", "cranking"],
            "battery": ["accumulator", "power cell"],
            "fuel_pump": ["fuel pump", "gas pump"]
        }
        
        # Check for variations
        for key, values in variations.items():
            if normalized in values or normalized == key:
                return key
        
        return normalized
    
    def _fuzzy_match_part(self, part_name: str) -> Optional[str]:
        """Fuzzy match part name to database entries."""
        try:
            from difflib import SequenceMatcher
            
            normalized_name = self._normalize_part_name(part_name)
            best_match = None
            best_ratio = 0.0
            
            for db_name in self.part_database.keys():
                ratio = SequenceMatcher(None, normalized_name, db_name).ratio()
                if ratio > best_ratio and ratio > 0.6:  # 60% similarity threshold
                    best_ratio = ratio
                    best_match = db_name
            
            return best_match
            
        except Exception as e:
            logger.error(f"Error in fuzzy matching: {str(e)}")
            return None
    
    async def get_part_recommendations(self, part_name: str, vehicle_info: Optional[Dict] = None) -> List[Dict]:
        """
        Get part recommendations based on detected part and vehicle info.
        
        Args:
            part_name: Detected part name
            vehicle_info: Optional vehicle information
            
        Returns:
            List of recommended parts
        """
        try:
            normalized_name = self._normalize_part_name(part_name)
            part_details = self.part_database.get(normalized_name, {})
            
            if not part_details:
                return []
            
            recommendations = []
            
            # Get compatible parts
            compatibility = part_details.get("compatibility", [])
            price_range = part_details.get("price_range", {})
            
            # Mock recommendations (in real implementation, this would query a parts marketplace)
            mock_recommendations = [
                {
                    "part_number": part_details.get("part_number", ""),
                    "brand": part_details.get("brand", ""),
                    "name": part_details.get("name", ""),
                    "price": price_range.get("min", 0) + (price_range.get("max", 0) - price_range.get("min", 0)) * 0.7,
                    "condition": "new",
                    "rating": 4.5,
                    "reviews": 125,
                    "seller": "AutoParts Pro",
                    "shipping": 15.99,
                    "in_stock": True
                },
                {
                    "part_number": f"{part_details.get('part_number', '')}-ALT",
                    "brand": "Generic",
                    "name": f"Generic {part_details.get('name', '')}",
                    "price": price_range.get("min", 0) * 0.6,
                    "condition": "new",
                    "rating": 3.8,
                    "reviews": 89,
                    "seller": "Budget Parts",
                    "shipping": 9.99,
                    "in_stock": True
                }
            ]
            
            recommendations.extend(mock_recommendations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting part recommendations: {str(e)}")
            return []
    
    async def get_part_compatibility(self, part_name: str, vehicle_make: str, vehicle_model: str, vehicle_year: int) -> bool:
        """
        Check if a part is compatible with a specific vehicle.
        
        Args:
            part_name: Part name
            vehicle_make: Vehicle make
            vehicle_model: Vehicle model
            vehicle_year: Vehicle year
            
        Returns:
            True if compatible, False otherwise
        """
        try:
            normalized_name = self._normalize_part_name(part_name)
            part_details = self.part_database.get(normalized_name, {})
            
            if not part_details:
                return False
            
            compatibility = part_details.get("compatibility", [])
            
            # Check if vehicle make is in compatibility list
            if "Universal" in compatibility:
                return True
            
            if vehicle_make in compatibility:
                return True
            
            # Additional compatibility logic could be added here
            # (e.g., checking specific model compatibility, year ranges, etc.)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking part compatibility: {str(e)}")
            return False
    
    async def get_part_statistics(self) -> Dict:
        """Get statistics about parts in the database."""
        try:
            total_parts = len(self.part_database)
            categories = {}
            brands = {}
            
            for part_name, details in self.part_database.items():
                category = details.get("category", "Unknown")
                brand = details.get("brand", "Unknown")
                
                categories[category] = categories.get(category, 0) + 1
                brands[brand] = brands.get(brand, 0) + 1
            
            return {
                "total_parts": total_parts,
                "categories": categories,
                "brands": brands,
                "top_categories": sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5],
                "top_brands": sorted(brands.items(), key=lambda x: x[1], reverse=True)[:5]
            }
            
        except Exception as e:
            logger.error(f"Error getting part statistics: {str(e)}")
            return {}