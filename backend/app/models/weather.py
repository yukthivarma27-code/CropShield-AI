"""
AgriVision AI — Weather Record Model
======================================
Cached weather data with agricultural advisories.
"""

from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class WeatherRecord(Base):
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, autoincrement=True)
    state = Column(String(50), nullable=False)
    district = Column(String(50), nullable=False)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    rain_probability = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    description = Column(String(100), nullable=True)
    advisory = Column(Text, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<WeatherRecord(state='{self.state}', district='{self.district}', temp={self.temperature})>"
