"""
AgriVision AI — Weather Schemas
=================================
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WeatherRequest(BaseModel):
    state: str
    district: str


class WeatherAlert(BaseModel):
    type: str  # warning, info, caution
    message: str


class WeatherResponse(BaseModel):
    state: str
    district: str
    temperature: float
    humidity: float
    rain_probability: float
    wind_speed: float
    description: str
    advisory: str
    alerts: List[WeatherAlert] = []
    recorded_at: datetime
