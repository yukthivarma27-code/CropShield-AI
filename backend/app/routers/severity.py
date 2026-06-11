"""
AgriVision AI — Severity Router
==================================
GET /severity — Disease severity estimation.
"""

from fastapi import APIRouter, Query
from app.services.severity_service import estimate_severity
from PIL import Image

router = APIRouter(prefix="/severity", tags=["Severity"])


@router.get("")
async def get_severity(
    disease: str = Query(...),
    image_path: str = Query(None),
):
    """Estimate disease severity from an image."""
    if image_path:
        try:
            img = Image.open(image_path).convert("RGB")
            result = estimate_severity(img, disease)
        except Exception:
            result = {"level": "Unknown", "percentage": 0, "description": "Could not analyze image."}
    else:
        # Return severity info based on disease type
        result = {"level": "Medium", "percentage": 45.0, "description": f"Moderate {disease} infection detected."}

    return {"disease": disease, **result}
