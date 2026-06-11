"""
AgriVision AI — History Model
===============================
Tracks user actions for disease progression monitoring.
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=True)
    action = Column(String(50), nullable=False)  # predict, view_treatment, save_report
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="history")
    prediction = relationship("Prediction", back_populates="history_entries")

    def __repr__(self):
        return f"<History(id={self.id}, action='{self.action}')>"
