from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class PartCategory(str, Enum):
    ENGINE = "engine"
    TRANSMISSION = "transmission"
    BRAKES = "brakes"
    SUSPENSION = "suspension"
    ELECTRICAL = "electrical"
    BODY = "body"
    INTERIOR = "interior"
    EXHAUST = "exhaust"
    COOLING = "cooling"
    FUEL = "fuel"

class PartCondition(str, Enum):
    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"

class PartInfo(BaseModel):
    """Detailed part information."""
    name: str
    part_number: str
    category: str
    brand: str
    confidence: float = Field(ge=0.0, le=1.0)

class PartDetection(BaseModel):
    """Detected part with bounding box and confidence."""
    id: str
    name: str
    confidence: float = Field(ge=0.0, le=1.0)
    bounding_box: List[float] = Field(min_items=4, max_items=4)  # [x1, y1, x2, y2]
    part_number: str = ""
    category: str = ""
    brand: str = ""

class VehicleInfo(BaseModel):
    """Vehicle information extracted from scan."""
    make: str
    model: str
    year: int
    confidence: float = Field(ge=0.0, le=1.0)

class ScanStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ScanResult(BaseModel):
    """Complete scan result."""
    scan_id: str
    user_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    timestamp: datetime
    image_url: str
    parts: List[PartDetection] = []
    vehicle_info: Optional[VehicleInfo] = None
    processing_time: float = 0.0
    model_version: str = "v1.0.0"
    status: ScanStatus = ScanStatus.COMPLETED

class ScanRequest(BaseModel):
    """Scan request model."""
    vehicle_id: Optional[str] = None
    user_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high

class ScanResponse(BaseModel):
    """Scan response model."""
    success: bool
    scan_id: Optional[str] = None
    message: str
    data: Optional[ScanResult] = None

class BatchScanRequest(BaseModel):
    """Batch scan request model."""
    vehicle_id: Optional[str] = None
    user_id: Optional[str] = None
    images: List[str] = []  # Base64 encoded images

class BatchScanResponse(BaseModel):
    """Batch scan response model."""
    success: bool
    scan_ids: List[str] = []
    message: str
    results: List[ScanResult] = []