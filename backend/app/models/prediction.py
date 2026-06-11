"""
AgriVision AI — Prediction Model
==================================
Stores each disease prediction result with confidence, severity, and GradCAM path.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    image_path = Column(String(255), nullable=False)
    crop = Column(String(50), nullable=True)
    disease = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), nullable=True)  # Low, Medium, High
    severity_percentage = Column(Float, nullable=True)
    top_3_predictions = Column(JSON, nullable=True)
    gradcam_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="predictions")
    history_entries = relationship("History", back_populates="prediction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Prediction(id={self.id}, disease='{self.disease}', confidence={self.confidence})>"
