"""
AgriVision AI — Weather Router
=================================
GET /weather — Weather data and agricultural advisories.
"""

from fastapi import APIRouter, Query
from datetime import datetime
from app.services.weather_service import get_weather, get_weather_by_coords

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.get("")
async def weather(
    state: str = Query(..., description="Indian state"),
    district: str = Query(..., description="District name"),
):
    """Get weather data with agricultural advisory (state/district lookup)."""
    data = await get_weather(state, district)
    return {
        "state": state,
        "district": district,
        **data,
        "recorded_at": datetime.now().isoformat(),
    }


@router.get("/coordinates")
async def weather_by_coords(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    city: str = Query("", description="City name (from reverse geocode)"),
    state: str = Query("", description="State name (from reverse geocode)"),
):
    """Get weather data using GPS coordinates via Open-Meteo."""
    data = await get_weather_by_coords(lat, lon)
    return {
        "state": state,
        "district": city,
        **data,
        "recorded_at": datetime.now().isoformat(),
    }
