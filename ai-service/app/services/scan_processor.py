import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from loguru import logger
import httpx
import base64
from io import BytesIO
from PIL import Image

from app.models.scan_models import ScanRequest, ScanResult
from app.core.model_manager import model_manager
from app.services.part_matcher import PartMatcher
from app.db.redis_client import redis_client
from app.config import settings

class ScanProcessor:
    """Processes different types of vehicle scans."""
    
    def __init__(self):
        self.part_matcher = PartMatcher()
    
    async def process_engine_bay_scan(self, request: ScanRequest) -> ScanResult:
        """Process engine bay scan to identify parts and modifications."""
        logger.info(f"Processing engine bay scan: {request.scan_id}")
        
        detected_parts = []
        detected_modifications = []
        confidence_scores = []
        
        for image_url in request.images:
            # Download and process image
            image = await self._download_image(image_url)
            
            # Detect objects in the image
            detections = await model_manager.detect_objects(image)
            
            # Process each detection
            for detection in detections:
                # Try to match with known parts
                part_match = await self.part_matcher.match_detection(detection, image)
                
                if part_match:
                    detected_parts.append({
                        'part_id': part_match['part_id'],
                        'part_name': part_match['part_name'],
                        'confidence': detection['confidence'],
                        'location': detection['bbox'],
                        'detected_as': detection['class_name']
                    })
                    
                    # Check if it's a modification
                    if await self._is_modification(part_match, request.vehicle_id):
                        detected_modifications.append({
                            'part_id': part_match['part_id'],
                            'modification_type': part_match.get('modification_type', 'upgrade'),
                            'confidence': detection['confidence']
                        })
                
                confidence_scores.append(detection['confidence'])
        
        # Calculate overall confidence
        overall_confidence = np.mean(confidence_scores) if confidence_scores else 0.0
        
        return ScanResult(
            ai_results={
                'detection_count': len(detections),
                'part_matches': len(detected_parts),
                'modifications_found': len(detected_modifications),
                'scan_quality': self._assess_image_quality(image)
            },
            detected_parts=detected_parts,
            detected_modifications=detected_modifications,
            confidence_score=float(overall_confidence)
        )
    
    async def process_vin_scan(self, request: ScanRequest) -> ScanResult:
        """Process VIN scan to extract vehicle information."""
        logger.info(f"Processing VIN scan: {request.scan_id}")
        
        detected_vin = None
        vehicle_info = {}
        best_confidence = 0.0
        
        for image_url in request.images:
            # Download and process image
            image = await self._download_image(image_url)
            
            # Try to detect VIN
            vin = await model_manager.detect_vin(image)
            
            if vin:
                # Validate VIN
                if self._validate_vin(vin):
                    detected_vin = vin
                    
                    # Decode VIN information
                    vehicle_info = await self._decode_vin(vin)
                    best_confidence = 0.95  # High confidence for valid VIN
                    break
        
        return ScanResult(
            ai_results={
                'vin_detected': detected_vin is not None,
                'decode_success': bool(vehicle_info)
            },
            detected_vin=detected_vin,
            detected_vehicle_info=vehicle_info,
            confidence_score=best_confidence
        )
    
    async def process_part_identification(self, request: ScanRequest) -> ScanResult:
        """Process part identification scan."""
        logger.info(f"Processing part identification scan: {request.scan_id}")
        
        identified_parts = []
        confidence_scores = []
        
        for image_url in request.images:
            # Download and process image
            image = await self._download_image(image_url)
            
            # Classify the part
            classification = await model_manager.classify_part(image)
            
            # Try to match with database
            part_match = await self.part_matcher.match_classification(
                classification,
                image
            )
            
            if part_match:
                identified_parts.append({
                    'part_id': part_match['part_id'],
                    'part_name': part_match['part_name'],
                    'part_number': part_match.get('part_number'),
                    'manufacturer': part_match.get('manufacturer'),
                    'confidence': classification['top_prediction']['confidence'],
                    'alternative_matches': part_match.get('alternatives', [])
                })
                confidence_scores.append(classification['top_prediction']['confidence'])
        
        overall_confidence = np.mean(confidence_scores) if confidence_scores else 0.0
        
        return ScanResult(
            ai_results={
                'parts_identified': len(identified_parts),
                'classification_details': classification if identified_parts else None
            },
            detected_parts=identified_parts,
            confidence_score=float(overall_confidence)
        )
    
    async def process_full_vehicle_scan(self, request: ScanRequest) -> ScanResult:
        """Process full vehicle scan combining multiple detection types."""
        logger.info(f"Processing full vehicle scan: {request.scan_id}")
        
        # Process as engine bay scan but with additional analysis
        result = await self.process_engine_bay_scan(request)
        
        # Also try VIN detection
        vin_result = await self.process_vin_scan(request)
        
        # Combine results
        if vin_result.detected_vin:
            result.detected_vin = vin_result.detected_vin
            result.detected_vehicle_info = vin_result.detected_vehicle_info
        
        # Additional full vehicle analysis
        result.ai_results['scan_completeness'] = self._calculate_scan_completeness(result)
        
        return result
    
    async def _download_image(self, image_url: str) -> np.ndarray:
        """Download image from URL and convert to numpy array."""
        try:
            if image_url.startswith('data:'):
                # Handle base64 encoded images
                header, encoded = image_url.split(',', 1)
                data = base64.b64decode(encoded)
                image = Image.open(BytesIO(data))
            else:
                # Download from URL
                async with httpx.AsyncClient() as client:
                    response = await client.get(image_url)
                    response.raise_for_status()
                    image = Image.open(BytesIO(response.content))
            
            # Convert to numpy array
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            logger.error(f"Failed to download/process image: {e}")
            raise
    
    async def _is_modification(self, part_match: Dict, vehicle_id: Optional[str]) -> bool:
        """Check if a detected part is a modification."""
        if not vehicle_id:
            return False
        
        # Check cache first
        cache_key = f"vehicle:{vehicle_id}:stock_parts"
        stock_parts = await redis_client.get(cache_key)
        
        if stock_parts and part_match['part_id'] not in stock_parts:
            return True
        
        # TODO: Implement more sophisticated modification detection
        # For now, use simple heuristics
        modification_keywords = [
            'performance', 'racing', 'turbo', 'supercharger',
            'exhaust', 'intake', 'suspension', 'coilover'
        ]
        
        part_name = part_match.get('part_name', '').lower()
        return any(keyword in part_name for keyword in modification_keywords)
    
    def _validate_vin(self, vin: str) -> bool:
        """Validate VIN format and checksum."""
        if len(vin) != 17:
            return False
        
        # Exclude invalid characters
        invalid_chars = ['I', 'O', 'Q']
        if any(char in vin for char in invalid_chars):
            return False
        
        # TODO: Implement proper VIN checksum validation
        return True
    
    async def _decode_vin(self, vin: str) -> Dict[str, Any]:
        """Decode VIN to get vehicle information."""
        # TODO: Integrate with VIN decoding API
        # For now, return mock data
        return {
            'make': 'Unknown',
            'model': 'Unknown',
            'year': int(vin[9]) + 2010 if vin[9].isdigit() else 2020,
            'engine': 'Unknown',
            'trim': 'Unknown',
            'country': 'Unknown'
        }
    
    def _assess_image_quality(self, image: np.ndarray) -> Dict[str, Any]:
        """Assess the quality of the scan image."""
        height, width = image.shape[:2]
        
        # Calculate sharpness using Laplacian
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Assess brightness
        brightness = np.mean(gray)
        
        return {
            'resolution': f"{width}x{height}",
            'sharpness_score': float(laplacian_var),
            'brightness': float(brightness),
            'quality_rating': 'good' if laplacian_var > 100 else 'poor'
        }
    
    def _calculate_scan_completeness(self, result: ScanResult) -> float:
        """Calculate how complete the scan is."""
        scores = []
        
        # Check different aspects
        if result.detected_parts:
            scores.append(min(len(result.detected_parts) / 10, 1.0))
        
        if result.detected_vin:
            scores.append(1.0)
        
        if result.confidence_score > 0.7:
            scores.append(1.0)
        
        return float(np.mean(scores)) if scores else 0.0