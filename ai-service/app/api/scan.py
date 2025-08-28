from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Optional
import numpy as np
import cv2
from PIL import Image
import io
import base64
import uuid
from datetime import datetime
import asyncio

from app.core.model_manager import ModelManager
from app.core.image_processor import ImageProcessor
from app.core.part_identifier import PartIdentifier
from app.db.postgres import database
from app.models.scan import ScanResult, PartDetection, VehicleInfo
from app.utils.logger import logger

router = APIRouter()
model_manager = ModelManager()
image_processor = ImageProcessor()
part_identifier = PartIdentifier()

@router.post("/process", response_model=ScanResult)
async def process_scan(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    vehicle_id: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Process a vehicle part scan using AI models.
    
    Args:
        image: Uploaded image file
        vehicle_id: Optional vehicle ID for context
        user_id: Optional user ID for tracking
        
    Returns:
        ScanResult with detected parts and vehicle information
    """
    try:
        # Generate scan ID
        scan_id = str(uuid.uuid4())
        logger.info(f"Processing scan {scan_id}")
        
        # Read and validate image
        image_data = await image.read()
        if not image_data:
            raise HTTPException(status_code=400, detail="Empty image file")
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Preprocess image
        processed_image = image_processor.preprocess(pil_image)
        
        # Detect parts using YOLOv8
        detections = await model_manager.detect_parts(processed_image)
        
        # Identify parts using ResNet50
        identified_parts = []
        for detection in detections:
            part_info = await model_manager.identify_part(
                processed_image, 
                detection.bbox
            )
            identified_parts.append(PartDetection(
                id=str(uuid.uuid4()),
                name=part_info.name,
                confidence=detection.confidence,
                bounding_box=detection.bbox,
                part_number=part_info.part_number,
                category=part_info.category,
                brand=part_info.brand
            ))
        
        # Extract vehicle information
        vehicle_info = await model_manager.extract_vehicle_info(processed_image)
        
        # Create scan result
        scan_result = ScanResult(
            scan_id=scan_id,
            user_id=user_id,
            vehicle_id=vehicle_id,
            timestamp=datetime.utcnow(),
            image_url=f"scans/{scan_id}.jpg",  # Would be uploaded to cloud storage
            parts=identified_parts,
            vehicle_info=vehicle_info,
            processing_time=0.0,  # Would be calculated
            model_version="v1.0.0"
        )
        
        # Save to database in background
        background_tasks.add_task(save_scan_result, scan_result)
        
        logger.info(f"Scan {scan_id} processed successfully with {len(identified_parts)} parts detected")
        
        return scan_result
        
    except Exception as e:
        logger.error(f"Error processing scan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process scan: {str(e)}")

@router.get("/{scan_id}", response_model=ScanResult)
async def get_scan_result(scan_id: str):
    """
    Retrieve scan results by scan ID.
    """
    try:
        # Query database for scan result
        query = """
            SELECT * FROM scan_results 
            WHERE scan_id = :scan_id
        """
        result = await database.fetch_one(query, {"scan_id": scan_id})
        
        if not result:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        return ScanResult(**result)
        
    except Exception as e:
        logger.error(f"Error retrieving scan {scan_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scan: {str(e)}")

@router.get("/user/{user_id}/history")
async def get_user_scan_history(
    user_id: str,
    limit: int = 20,
    offset: int = 0
):
    """
    Get scan history for a user.
    """
    try:
        query = """
            SELECT * FROM scan_results 
            WHERE user_id = :user_id 
            ORDER BY timestamp DESC 
            LIMIT :limit OFFSET :offset
        """
        results = await database.fetch_all(
            query, 
            {"user_id": user_id, "limit": limit, "offset": offset}
        )
        
        return [ScanResult(**result) for result in results]
        
    except Exception as e:
        logger.error(f"Error retrieving scan history for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scan history: {str(e)}")

@router.delete("/{scan_id}")
async def delete_scan(scan_id: str):
    """
    Delete a scan result.
    """
    try:
        query = "DELETE FROM scan_results WHERE scan_id = :scan_id"
        result = await database.execute(query, {"scan_id": scan_id})
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Scan not found")
        
        return {"message": "Scan deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting scan {scan_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete scan: {str(e)}")

async def save_scan_result(scan_result: ScanResult):
    """
    Save scan result to database.
    """
    try:
        query = """
            INSERT INTO scan_results (
                scan_id, user_id, vehicle_id, timestamp, image_url,
                parts, vehicle_info, processing_time, model_version
            ) VALUES (
                :scan_id, :user_id, :vehicle_id, :timestamp, :image_url,
                :parts, :vehicle_info, :processing_time, :model_version
            )
        """
        
        await database.execute(query, scan_result.dict())
        logger.info(f"Scan result {scan_result.scan_id} saved to database")
        
    except Exception as e:
        logger.error(f"Error saving scan result: {str(e)}")

@router.post("/batch")
async def process_batch_scan(
    background_tasks: BackgroundTasks,
    images: List[UploadFile] = File(...),
    vehicle_id: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Process multiple images in batch.
    """
    try:
        results = []
        
        for image in images:
            # Process each image
            result = await process_scan(
                background_tasks=background_tasks,
                image=image,
                vehicle_id=vehicle_id,
                user_id=user_id
            )
            results.append(result)
        
        return {
            "message": f"Processed {len(results)} images",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error processing batch scan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process batch scan: {str(e)}") 