from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Application settings
    APP_NAME: str = "ModMaster Pro AI Service"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    PORT: int = int(os.getenv("PORT", "8001"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Security
    API_KEY: str = os.getenv("INTERNAL_API_KEY") or (lambda: (_ for _ in ()).throw(ValueError("INTERNAL_API_KEY environment variable is required for security")))()
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL") or (lambda: (_ for _ in ()).throw(ValueError("DATABASE_URL environment variable is required")))()
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/1")
    
    # AI Model settings
    MODEL_PATH: str = "/app/models"
    YOLO_MODEL: str = "yolov8x.pt"
    CONFIDENCE_THRESHOLD: float = 0.5
    MAX_DETECTIONS: int = 100
    
    # OCR settings
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    OCR_LANG: str = "eng"
    
    # Processing settings
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    PROCESSING_TIMEOUT: int = 300  # 5 minutes
    
    # Storage
    UPLOAD_PATH: str = "/app/data/uploads"
    PROCESSED_PATH: str = "/app/data/processed"
    
    # External services
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://backend-api:3000")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:19006",  # Expo
    ]
    
    # Model URLs (for downloading if not present)
    MODEL_URLS: dict = {
        "yolov8x": "https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8x.pt",
        "resnet50": "https://download.pytorch.org/models/resnet50-19c8e357.pth",
    }
    
    class Config:
        case_sensitive = True

settings = Settings()