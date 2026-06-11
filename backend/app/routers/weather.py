"""
AgriVision AI — Weather Router
=================================
GET /weather — Weather data and agricultural advisories.
"""

from fastapi import APIRouter, Query
from datetime import datetime
from app.services.weather_service import get_weather

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("")
async def weather(
    state: str = Query(..., description="Indian state"),
    district: str = Query(..., description="District name"),
):
    """Get weather data with agricultural advisory."""
    data = await get_weather(state, district)
    return {
        "state": state,
        "district": district,
        **data,
        "recorded_at": datetime.now().isoformat(),
    }
