import httpx
from typing import Dict, Any
from loguru import logger

from app.config import settings
from app.models.scan_models import ScanResult

class NotificationService:
    """Handles notifications to the backend API."""
    
    def __init__(self):
        self.backend_url = settings.BACKEND_API_URL
        self.api_key = settings.API_KEY
    
    async def notify_scan_complete(self, scan_id: str, result: ScanResult):
        """Notify backend API that scan processing is complete."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/api/v1/scans/{scan_id}/results",
                    json={
                        "ai_results": result.ai_results,
                        "detected_parts": result.detected_parts,
                        "detected_modifications": result.detected_modifications,
                        "detected_vin": result.detected_vin,
                        "detected_vehicle_info": result.detected_vehicle_info,
                        "confidence_score": result.confidence_score
                    },
                    headers={
                        "X-API-Key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"Successfully notified backend about scan {scan_id} completion")
                
        except Exception as e:
            logger.error(f"Failed to notify backend about scan {scan_id}: {e}")
            # Don't raise - notification failure shouldn't fail the scan
    
    async def notify_scan_failed(self, scan_id: str, error: str):
        """Notify backend API that scan processing failed."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/api/v1/scans/{scan_id}/status",
                    json={
                        "status": "failed",
                        "error_message": error
                    },
                    headers={
                        "X-API-Key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                logger.info(f"Successfully notified backend about scan {scan_id} failure")
                
        except Exception as e:
            logger.error(f"Failed to notify backend about scan {scan_id} failure: {e}")
    
    async def send_recommendation_ready(self, user_id: str, recommendations: List[Dict[str, Any]]):
        """Notify that recommendations are ready."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/api/v1/notifications/recommendations-ready",
                    json={
                        "user_id": user_id,
                        "recommendation_count": len(recommendations),
                        "top_recommendations": recommendations[:3]
                    },
                    headers={
                        "X-API-Key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                
        except Exception as e:
            logger.error(f"Failed to send recommendation notification: {e}")