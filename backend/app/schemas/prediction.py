"""
AgriVision AI — Prediction Schemas
====================================
Request/response models for the prediction endpoint.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PredictionItem(BaseModel):
    """Single prediction with disease name and confidence."""
    disease: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class PredictionRequest(BaseModel):
    """Request body for prediction (used when sending base64 image)."""
    image_base64: Optional[str] = None
    crop: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    user_id: Optional[int] = None


class PredictionResponse(BaseModel):
    """Full prediction response with top-3 results, severity, and GradCAM."""
    id: int
    crop: Optional[str]
    disease: str
    confidence: float
    severity: str
    severity_percentage: float
    top_3_predictions: List[PredictionItem]
    symptoms: str
    description: str
    gradcam_url: Optional[str]
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class PredictionHistoryItem(BaseModel):
    """Simplified prediction for history listing."""
    id: int
    crop: Optional[str]
    disease: str
    confidence: float
    severity: str
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True
