from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from loguru import logger
import sys

from app.config import settings
from app.api import health, scan, recommendation, analysis
from app.core.model_manager import ModelManager
from app.db.redis_client import redis_client
from app.db.postgres import database

# Configure logger
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL
)
logger.add(
    "logs/ai_service.log",
    rotation="500 MB",
    retention="30 days",
    level=settings.LOG_LEVEL
)

# Initialize model manager
model_manager = ModelManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting AI Service...")
    
    # Connect to databases
    await database.connect()
    logger.info("Connected to PostgreSQL")
    
    # Load AI models
    await model_manager.load_models()
    logger.info("AI models loaded successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Service...")
    await database.disconnect()
    await redis_client.close()
    logger.info("Cleanup completed")

# Create FastAPI app
app = FastAPI(
    title="ModMaster Pro AI Service",
    description="AI/ML service for vehicle scanning and part recommendations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(scan.router, prefix="/api/v1/scan", tags=["Scan Processing"])
app.include_router(recommendation.router, prefix="/api/v1/recommendations", tags=["Recommendations"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "ModMaster Pro AI Service",
        "version": "1.0.0",
        "status": "operational"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )