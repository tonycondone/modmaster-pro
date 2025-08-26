from fastapi import APIRouter, status
from datetime import datetime
import psutil
import torch
import tensorflow as tf
from loguru import logger

from app.db.redis_client import redis_client
from app.db.postgres import database
from app.core.model_manager import model_manager

router = APIRouter()

@router.get("/", status_code=status.HTTP_200_OK)
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-service"
    }

@router.get("/detailed", status_code=status.HTTP_200_OK)
async def detailed_health_check():
    """Detailed health check with system metrics."""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check PostgreSQL
    try:
        await database.fetch_one("SELECT 1")
        health_status["checks"]["postgres"] = {"status": "healthy"}
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        health_status["checks"]["postgres"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"
    
    # Check Redis
    try:
        await redis_client.ping()
        health_status["checks"]["redis"] = {"status": "healthy"}
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["checks"]["redis"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"
    
    # Check AI models
    try:
        models_loaded = model_manager.get_loaded_models()
        health_status["checks"]["ai_models"] = {
            "status": "healthy",
            "loaded_models": models_loaded
        }
    except Exception as e:
        logger.error(f"AI models health check failed: {e}")
        health_status["checks"]["ai_models"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"
    
    # System metrics
    health_status["metrics"] = {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "gpu_available": torch.cuda.is_available(),
        "gpu_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
        "tensorflow_version": tf.__version__,
        "torch_version": torch.__version__
    }
    
    return health_status

@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Check if service is ready to handle requests."""
    try:
        # Check if all models are loaded
        if not model_manager.is_ready():
            return {
                "ready": False,
                "reason": "Models not fully loaded"
            }
        
        # Check database connectivity
        await database.fetch_one("SELECT 1")
        
        # Check Redis connectivity
        await redis_client.ping()
        
        return {"ready": True}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "ready": False,
            "reason": str(e)
        }