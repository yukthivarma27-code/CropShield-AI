"""
AgriVision AI — Treatment Router
===================================
POST /treatment — Get treatment recommendations for a disease.
"""

from fastapi import APIRouter, Query
from app.services.treatment_engine import get_treatments, get_remedies, get_disease_info

router = APIRouter(prefix="/treatment", tags=["Treatment"])


@router.get("")
async def get_treatment(
    disease: str = Query(..., description="Disease name"),
    crop: str = Query(None, description="Crop type"),
):
    """Get chemical treatments, organic remedies, and preventive measures."""
    disease_info = get_disease_info(disease)
    treatments = get_treatments(disease)
    remedies = get_remedies(disease)

    return {
        "disease": disease,
        "crop": crop,
        "disease_info": disease_info,
        "chemical_treatments": treatments["chemical_treatments"],
        "organic_remedies": remedies,
        "preventive_measures": treatments["preventive_measures"],
    }
