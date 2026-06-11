"""
AgriVision AI — Location Model
================================
Supported regions with common crops and soil types.
"""

from sqlalchemy import Column, Integer, String, JSON
from app.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state = Column(String(50), nullable=False)
    district = Column(String(50), nullable=False)
    common_crops = Column(JSON, nullable=True)
    soil_type = Column(JSON, nullable=True)

    def __repr__(self):
        return f"<Location(state='{self.state}', district='{self.district}')>"
