"""
FastAPI inference server for automotive part detection and classification.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
import numpy as np
import cv2
from PIL import Image
import io
import base64
import asyncio
from datetime import datetime
import logging
import os
from pathlib import Path
import uuid
import redis.asyncio as redis
import json
from concurrent.futures import ThreadPoolExecutor
import torch

from ..models.yolo.part_detector import PartDetector, model_loader
from ..models.resnet.part_classifier import PartClassifier, get_classifier
from ..inference.part_detector_engine import get_inference_engine, InferenceEngine
from ..config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="ModMaster Pro AI Service",
    description="AI-powered automotive part detection and classification API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
redis_client = None
executor = ThreadPoolExecutor(max_workers=4)
inference_engine = None
classifier = None


# Pydantic models
class DetectionRequest(BaseModel):
    """Request model for part detection."""
    image_base64: str = Field(..., description="Base64 encoded image")
    confidence_threshold: float = Field(0.25, ge=0, le=1, description="Minimum confidence threshold")
    return_visualization: bool = Field(False, description="Return visualized image")
    filter_classes: Optional[List[str]] = Field(None, description="Filter by specific part classes")


class ClassificationRequest(BaseModel):
    """Request model for part classification."""
    image_base64: str = Field(..., description="Base64 encoded image")
    top_k: int = Field(5, ge=1, le=10, description="Number of top predictions")
    return_features: bool = Field(False, description="Return feature vector")


class AnalysisRequest(BaseModel):
    """Request model for complete part analysis."""
    image_base64: str = Field(..., description="Base64 encoded image")
    detection_threshold: float = Field(0.25, ge=0, le=1, description="Detection confidence threshold")
    classification_top_k: int = Field(3, ge=1, le=5, description="Top K classifications per detection")
    vehicle_id: Optional[str] = Field(None, description="Vehicle ID for compatibility check")


class BatchRequest(BaseModel):
    """Request model for batch processing."""
    images: List[str] = Field(..., description="List of base64 encoded images")
    operation: str = Field("detect", description="Operation type: 'detect' or 'classify'")
    async_processing: bool = Field(False, description="Process asynchronously")


class ModelInfo(BaseModel):
    """Model information response."""
    name: str
    type: str
    status: str
    device: str
    version: str
    last_updated: str
    performance_metrics: Dict[str, float]


class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    models_loaded: Dict[str, bool]
    redis_connected: bool
    gpu_available: bool
    memory_usage: Dict[str, float]


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global redis_client, inference_engine, classifier
    
    logger.info("Starting AI service...")
    
    # Initialize Redis
    try:
        redis_client = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as e:
        logger.warning(f"Redis connection failed: {str(e)}")
    
    # Initialize inference engine
    try:
        inference_engine = get_inference_engine(
            model_name='default',
            enable_gpu=True,
            batch_size=4
        )
        logger.info("Inference engine initialized")
    except Exception as e:
        logger.error(f"Failed to initialize inference engine: {str(e)}")
        raise
    
    # Initialize classifier
    try:
        classifier = get_classifier(device='auto')
        logger.info("Classifier initialized")
    except Exception as e:
        logger.error(f"Failed to initialize classifier: {str(e)}")
        raise
    
    logger.info("AI service started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    global redis_client
    
    logger.info("Shutting down AI service...")
    
    if redis_client:
        await redis_client.close()
    
    if inference_engine:
        inference_engine.shutdown()
    
    executor.shutdown(wait=True)
    
    logger.info("AI service shutdown complete")


# Utility functions
def decode_image(image_base64: str) -> np.ndarray:
    """Decode base64 image to numpy array."""
    try:
        # Remove data URL prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_base64)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        return image
    except Exception as e:
        logger.error(f"Image decode error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid image data")


def encode_image(image: np.ndarray) -> str:
    """Encode numpy array to base64."""
    _, buffer = cv2.imencode('.jpg', image)
    return base64.b64encode(buffer).decode('utf-8')


async def cache_result(key: str, result: Dict[str, Any], ttl: int = 3600):
    """Cache result in Redis."""
    if redis_client:
        try:
            await redis_client.setex(
                key,
                ttl,
                json.dumps(result)
            )
        except Exception as e:
            logger.warning(f"Failed to cache result: {str(e)}")


async def get_cached_result(key: str) -> Optional[Dict[str, Any]]:
    """Get cached result from Redis."""
    if redis_client:
        try:
            result = await redis_client.get(key)
            if result:
                return json.loads(result)
        except Exception as e:
            logger.warning(f"Failed to get cached result: {str(e)}")
    return None


# API Endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint."""
    return {
        "service": "ModMaster Pro AI Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    import psutil
    
    # Check models
    models_loaded = {
        "yolo_detector": inference_engine is not None and inference_engine.detector is not None,
        "resnet_classifier": classifier is not None and classifier.model is not None
    }
    
    # Check Redis
    redis_connected = False
    if redis_client:
        try:
            await redis_client.ping()
            redis_connected = True
        except:
            pass
    
    # Memory usage
    memory = psutil.virtual_memory()
    
    return HealthCheck(
        status="healthy" if all(models_loaded.values()) else "degraded",
        timestamp=datetime.now().isoformat(),
        models_loaded=models_loaded,
        redis_connected=redis_connected,
        gpu_available=torch.cuda.is_available(),
        memory_usage={
            "percent": memory.percent,
            "available_gb": memory.available / (1024**3),
            "total_gb": memory.total / (1024**3)
        }
    )


@app.post("/detect", response_model=Dict[str, Any])
async def detect_parts(request: DetectionRequest):
    """
    Detect automotive parts in an image.
    
    Returns detected parts with bounding boxes and confidence scores.
    """
    # Decode image
    image = decode_image(request.image_base64)
    
    # Check cache
    cache_key = f"detect:{hash(request.image_base64)}:{request.confidence_threshold}"
    cached = await get_cached_result(cache_key)
    if cached:
        return cached
    
    # Run detection
    try:
        result = await inference_engine.process_image_async(
            image,
            confidence_threshold=request.confidence_threshold,
            return_visualization=request.return_visualization
        )
        
        # Filter by classes if specified
        if request.filter_classes:
            result['detections'] = [
                d for d in result['detections']
                if d['class_name'] in request.filter_classes
            ]
        
        # Add visualization if requested
        if request.return_visualization and 'visualization' in result:
            result['visualization'] = base64.b64encode(result['visualization']).decode('utf-8')
        
        # Cache result
        await cache_result(cache_key, result)
        
        return result
        
    except Exception as e:
        logger.error(f"Detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@app.post("/classify", response_model=Dict[str, Any])
async def classify_part(request: ClassificationRequest):
    """
    Classify an automotive part.
    
    Returns top K predictions with confidence scores and categories.
    """
    # Decode image
    image = decode_image(request.image_base64)
    
    # Check cache
    cache_key = f"classify:{hash(request.image_base64)}:{request.top_k}"
    cached = await get_cached_result(cache_key)
    if cached:
        return cached
    
    # Run classification
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            classifier.classify_part,
            image,
            request.top_k,
            request.return_features
        )
        
        # Add timestamp
        result['timestamp'] = datetime.now().isoformat()
        
        # Cache result
        await cache_result(cache_key, result)
        
        return result
        
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@app.post("/analyze", response_model=Dict[str, Any])
async def analyze_image(request: AnalysisRequest):
    """
    Complete analysis: detect parts and classify each detection.
    
    Combines detection and classification for comprehensive part analysis.
    """
    # Decode image
    image = decode_image(request.image_base64)
    
    try:
        # Step 1: Detect parts
        detection_result = await inference_engine.process_image_async(
            image,
            confidence_threshold=request.detection_threshold
        )
        
        # Step 2: Classify each detection
        classified_detections = []
        
        for detection in detection_result['detections']:
            # Crop detected region
            bbox = detection['bbox']
            x1, y1, x2, y2 = [int(coord) for coord in bbox]
            
            # Ensure valid crop
            h, w = image.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            if x2 > x1 and y2 > y1:
                cropped = image[y1:y2, x1:x2]
                
                # Classify cropped region
                loop = asyncio.get_event_loop()
                classification = await loop.run_in_executor(
                    executor,
                    classifier.classify_part,
                    cropped,
                    request.classification_top_k,
                    False
                )
                
                # Combine detection and classification
                detection['classifications'] = classification['predictions']
                detection['top_classification'] = classification['top_prediction']
            
            classified_detections.append(detection)
        
        # Check vehicle compatibility if specified
        if request.vehicle_id:
            # This would check against a database of compatible parts
            # For now, we'll add a placeholder
            for detection in classified_detections:
                detection['compatible_with_vehicle'] = True
        
        result = {
            'detections': classified_detections,
            'total_parts_found': len(classified_detections),
            'processing_time': detection_result['inference_time'],
            'timestamp': datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/batch", response_model=Union[List[Dict[str, Any]], Dict[str, str]])
async def batch_process(request: BatchRequest, background_tasks: BackgroundTasks):
    """
    Process multiple images in batch.
    
    Can run synchronously or asynchronously with job tracking.
    """
    if request.async_processing:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Start background processing
        background_tasks.add_task(
            process_batch_background,
            job_id,
            request.images,
            request.operation
        )
        
        return {
            "job_id": job_id,
            "status": "processing",
            "message": f"Processing {len(request.images)} images",
            "check_status_url": f"/batch/status/{job_id}"
        }
    
    else:
        # Process synchronously
        images = [decode_image(img) for img in request.images]
        
        if request.operation == "detect":
            results = await inference_engine.process_batch_async(
                images,
                confidence_threshold=0.25
            )
        elif request.operation == "classify":
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                executor,
                classifier.batch_classify,
                images,
                5,
                32
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        return results


async def process_batch_background(job_id: str, images: List[str], operation: str):
    """Background task for batch processing."""
    try:
        # Update job status
        if redis_client:
            await redis_client.setex(
                f"job:{job_id}:status",
                3600,
                json.dumps({"status": "processing", "progress": 0})
            )
        
        # Decode images
        decoded_images = []
        for i, img in enumerate(images):
            try:
                decoded_images.append(decode_image(img))
                
                # Update progress
                if redis_client:
                    progress = (i + 1) / len(images) * 50
                    await redis_client.setex(
                        f"job:{job_id}:status",
                        3600,
                        json.dumps({"status": "processing", "progress": progress})
                    )
            except Exception as e:
                logger.error(f"Failed to decode image {i}: {str(e)}")
        
        # Process images
        if operation == "detect":
            results = await inference_engine.process_batch_async(decoded_images)
        elif operation == "classify":
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                executor,
                classifier.batch_classify,
                decoded_images
            )
        else:
            raise ValueError("Invalid operation")
        
        # Save results
        if redis_client:
            await redis_client.setex(
                f"job:{job_id}:results",
                3600,
                json.dumps(results)
            )
            await redis_client.setex(
                f"job:{job_id}:status",
                3600,
                json.dumps({"status": "completed", "progress": 100})
            )
        
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        if redis_client:
            await redis_client.setex(
                f"job:{job_id}:status",
                3600,
                json.dumps({"status": "failed", "error": str(e)})
            )


@app.get("/batch/status/{job_id}")
async def get_batch_status(job_id: str):
    """Get status of batch processing job."""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Job tracking not available")
    
    # Get status
    status = await redis_client.get(f"job:{job_id}:status")
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status_data = json.loads(status)
    
    # Get results if completed
    if status_data.get("status") == "completed":
        results = await redis_client.get(f"job:{job_id}:results")
        if results:
            status_data["results"] = json.loads(results)
    
    return status_data


@app.get("/models", response_model=List[ModelInfo])
async def list_models():
    """List available models and their information."""
    models = []
    
    # YOLO detector info
    if inference_engine and inference_engine.detector:
        detector_info = inference_engine.detector.get_model_info()
        models.append(ModelInfo(
            name="yolo_detector",
            type="YOLOv8",
            status=detector_info.get("status", "unknown"),
            device=detector_info.get("device", "unknown"),
            version="8.0",
            last_updated=datetime.now().isoformat(),
            performance_metrics=inference_engine.get_metrics()
        ))
    
    # ResNet classifier info
    if classifier:
        classifier_info = classifier.get_model_info()
        models.append(ModelInfo(
            name="resnet_classifier",
            type="ResNet50",
            status=classifier_info.get("status", "unknown"),
            device=classifier_info.get("device", "unknown"),
            version="1.0",
            last_updated=datetime.now().isoformat(),
            performance_metrics={
                "num_classes": classifier_info.get("num_classes", 0),
                "categories": len(classifier_info.get("categories", []))
            }
        ))
    
    return models


@app.get("/metrics")
async def get_metrics():
    """Get performance metrics."""
    metrics = {
        "inference_engine": inference_engine.get_metrics() if inference_engine else {},
        "timestamp": datetime.now().isoformat()
    }
    
    # Add Redis metrics if available
    if redis_client:
        try:
            info = await redis_client.info()
            metrics["redis"] = {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_mb": info.get("used_memory", 0) / (1024 * 1024),
                "total_commands_processed": info.get("total_commands_processed", 0)
            }
        except:
            pass
    
    return metrics


@app.post("/feedback")
async def submit_feedback(
    scan_id: str = Query(..., description="Scan ID"),
    accurate: bool = Query(..., description="Was the detection accurate?"),
    corrections: Optional[Dict[str, Any]] = None
):
    """Submit feedback on detection/classification accuracy."""
    feedback_data = {
        "scan_id": scan_id,
        "accurate": accurate,
        "corrections": corrections,
        "timestamp": datetime.now().isoformat()
    }
    
    # Store feedback (in production, save to database)
    if redis_client:
        await redis_client.lpush(
            "feedback_queue",
            json.dumps(feedback_data)
        )
    
    return {"message": "Feedback received", "scan_id": scan_id}


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.now().isoformat()
        }
    )


# Main entry point
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.api.inference_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )