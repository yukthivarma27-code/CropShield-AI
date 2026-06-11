"""
AgriVision AI — Recommendation Router
========================================
GET /recommendation — Location-aware treatment recommendations.
"""

from fastapi import APIRouter, Query
from typing import Optional
from app.services.treatment_engine import get_full_recommendation
from app.services.weather_service import get_weather

router = APIRouter(prefix="/recommendation", tags=["Recommendation"])


@router.get("")
async def get_recommendation(
    disease: str = Query(...),
    crop: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
):
    """Get full recommendation with location and weather context."""
    weather_advisory = None
    if state and district:
        weather = await get_weather(state, district)
        weather_advisory = weather.get("advisory")

    rec = get_full_recommendation(disease, crop, state, district, weather_advisory)
    return rec
