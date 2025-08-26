from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List, Optional
import uuid
from datetime import datetime
from loguru import logger

from app.models.scan_models import ScanRequest, ScanResponse, ScanStatus
from app.services.scan_processor import ScanProcessor
from app.services.notification_service import NotificationService
from app.db.postgres import database
from app.utils.auth import verify_api_key

router = APIRouter()
scan_processor = ScanProcessor()
notification_service = NotificationService()

@router.post("/process-scan", response_model=ScanResponse)
async def process_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    """Process a vehicle scan request."""
    try:
        logger.info(f"Received scan request: {request.scan_id}, type: {request.scan_type}")
        
        # Update scan status to processing
        await database.execute(
            """
            UPDATE vehicle_scans 
            SET status = 'processing', updated_at = NOW()
            WHERE id = :scan_id
            """,
            {"scan_id": request.scan_id}
        )
        
        # Add to background processing queue
        background_tasks.add_task(
            process_scan_background,
            request
        )
        
        return ScanResponse(
            scan_id=request.scan_id,
            status=ScanStatus.PROCESSING,
            message="Scan processing started"
        )
        
    except Exception as e:
        logger.error(f"Error initiating scan processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_scan_background(request: ScanRequest):
    """Background task to process scan."""
    start_time = datetime.utcnow()
    
    try:
        # Process the scan based on type
        if request.scan_type == "engine_bay":
            result = await scan_processor.process_engine_bay_scan(request)
        elif request.scan_type == "vin":
            result = await scan_processor.process_vin_scan(request)
        elif request.scan_type == "part_identification":
            result = await scan_processor.process_part_identification(request)
        elif request.scan_type == "full_vehicle":
            result = await scan_processor.process_full_vehicle_scan(request)
        else:
            raise ValueError(f"Unknown scan type: {request.scan_type}")
        
        # Calculate processing time
        processing_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        # Update scan with results
        await database.execute(
            """
            UPDATE vehicle_scans 
            SET 
                status = 'completed',
                ai_results = :ai_results,
                detected_parts = :detected_parts,
                detected_modifications = :detected_modifications,
                detected_vin = :detected_vin,
                detected_vehicle_info = :detected_vehicle_info,
                confidence_score = :confidence_score,
                processing_time_ms = :processing_time_ms,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = :scan_id
            """,
            {
                "scan_id": request.scan_id,
                "ai_results": result.ai_results,
                "detected_parts": result.detected_parts,
                "detected_modifications": result.detected_modifications,
                "detected_vin": result.detected_vin,
                "detected_vehicle_info": result.detected_vehicle_info,
                "confidence_score": result.confidence_score,
                "processing_time_ms": processing_time_ms
            }
        )
        
        # Send notification to backend API
        await notification_service.notify_scan_complete(request.scan_id, result)
        
        logger.info(f"Scan {request.scan_id} completed successfully in {processing_time_ms}ms")
        
    except Exception as e:
        logger.error(f"Error processing scan {request.scan_id}: {e}")
        
        # Update scan with error
        await database.execute(
            """
            UPDATE vehicle_scans 
            SET 
                status = 'failed',
                error_message = :error,
                updated_at = NOW()
            WHERE id = :scan_id
            """,
            {
                "scan_id": request.scan_id,
                "error": str(e)
            }
        )
        
        # Notify of failure
        await notification_service.notify_scan_failed(request.scan_id, str(e))

@router.get("/status/{scan_id}")
async def get_scan_status(
    scan_id: str,
    api_key: str = Depends(verify_api_key)
):
    """Get the status of a scan."""
    scan = await database.fetch_one(
        "SELECT status, error_message FROM vehicle_scans WHERE id = :scan_id",
        {"scan_id": scan_id}
    )
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return {
        "scan_id": scan_id,
        "status": scan["status"],
        "error_message": scan["error_message"]
    }