"""
AgriVision AI — Treatment Model
=================================
Chemical treatments with dosage, intervals, and safety info.
"""

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Treatment(Base):
    __tablename__ = "treatments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disease_id = Column(Integer, ForeignKey("diseases.id"), nullable=False)
    type = Column(String(20), nullable=False)  # chemical, biological
    name = Column(String(150), nullable=False)
    active_ingredient = Column(String(150), nullable=True)
    dosage = Column(String(100), nullable=True)  # e.g., "2g per litre"
    spray_interval = Column(String(100), nullable=True)  # e.g., "Every 7 days"
    precautions = Column(Text, nullable=True)

    # Relationships
    disease = relationship("Disease", back_populates="treatments")

    def __repr__(self):
        return f"<Treatment(id={self.id}, name='{self.name}', type='{self.type}')>"
