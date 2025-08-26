from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime

class ScanType(str, Enum):
    ENGINE_BAY = "engine_bay"
    VIN = "vin"
    PART_IDENTIFICATION = "part_identification"
    FULL_VEHICLE = "full_vehicle"

class ScanStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ScanRequest(BaseModel):
    scan_id: str = Field(..., description="Unique scan identifier")
    scan_type: ScanType = Field(..., description="Type of scan to process")
    images: List[str] = Field(..., description="List of image URLs to process")
    user_id: str = Field(..., description="User who initiated the scan")
    vehicle_id: Optional[str] = Field(None, description="Associated vehicle ID")
    
    @validator('images')
    def validate_images(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one image is required")
        if len(v) > 10:
            raise ValueError("Maximum 10 images allowed")
        return v

class DetectedPart(BaseModel):
    part_id: Optional[str] = None
    part_name: str
    part_number: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    location: Optional[List[float]] = None  # Bounding box coordinates
    manufacturer: Optional[str] = None

class DetectedModification(BaseModel):
    part_id: str
    modification_type: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    description: Optional[str] = None

class ScanResult(BaseModel):
    ai_results: Dict[str, Any] = Field(default_factory=dict)
    detected_parts: List[Dict[str, Any]] = Field(default_factory=list)
    detected_modifications: List[Dict[str, Any]] = Field(default_factory=list)
    detected_vin: Optional[str] = None
    detected_vehicle_info: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)

class ScanResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    result: Optional[ScanResult] = None