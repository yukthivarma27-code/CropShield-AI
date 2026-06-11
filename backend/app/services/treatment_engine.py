"""
AgriVision AI — Treatment Recommendation Engine
==================================================
Loads treatment/remedy data and provides disease-specific recommendations.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional


# Load data at module level
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(filename: str) -> dict:
    path = _DATA_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


_TREATMENTS_DB = _load_json("treatments.json").get("treatments", {})
_REMEDIES_DB = _load_json("remedies.json").get("remedies", {})
_DISEASES_DB = {d["name"]: d for d in _load_json("diseases.json").get("diseases", [])}
_LOCATIONS_DB = _load_json("locations.json").get("locations", {})


def get_disease_info(disease: str) -> Dict:
    """Get disease symptoms and description."""
    info = _DISEASES_DB.get(disease, {})
    return {
        "name": disease,
        "symptoms": info.get("symptoms", ""),
        "description": info.get("description", ""),
        "severity_info": info.get("severity_info", ""),
    }


def get_treatments(disease: str) -> Dict:
    """Get chemical treatments and preventive measures for a disease."""
    data = _TREATMENTS_DB.get(disease, {})
    return {
        "chemical_treatments": data.get("chemical", []),
        "preventive_measures": data.get("preventive", []),
    }


def get_remedies(disease: str) -> List[Dict]:
    """Get organic remedies for a disease."""
    return _REMEDIES_DB.get(disease, [])


def get_full_recommendation(
    disease: str,
    crop: str = None,
    state: str = None,
    district: str = None,
    weather_advisory: str = None,
) -> Dict:
    """
    Get complete recommendation including treatments, remedies,
    preventive measures, and localized information.
    """
    disease_info = get_disease_info(disease)
    treatments = get_treatments(disease)
    remedies = get_remedies(disease)

    # Location-specific recommendations
    location_info = {}
    gov_schemes = []
    fertilizer_rec = None

    if state:
        loc_data = _LOCATIONS_DB.get(state, {})
        location_info = {
            "common_crops": loc_data.get("common_crops", []),
            "soil_types": loc_data.get("soil_types", []),
        }

        # Government schemes (static data for demo)
        gov_schemes = _get_government_schemes(state, crop)
        fertilizer_rec = _get_fertilizer_recommendation(crop, state)

    return {
        "disease": disease,
        "disease_info": disease_info,
        "crop": crop,
        "state": state,
        "district": district,
        "chemical_treatments": treatments["chemical_treatments"],
        "organic_remedies": remedies,
        "preventive_measures": treatments["preventive_measures"],
        "weather_advisory": weather_advisory,
        "government_schemes": gov_schemes,
        "fertilizer_recommendation": fertilizer_rec,
        "location_info": location_info,
    }


def _get_government_schemes(state: str, crop: str = None) -> List[str]:
    """Get relevant government schemes for the region."""
    schemes = [
        "PM-KISAN: ₹6000/year direct income support for farmers",
        "Pradhan Mantri Fasal Bima Yojana (PMFBY): Crop insurance scheme",
        "Soil Health Card Scheme: Free soil testing and nutrient recommendations",
        "National Mission on Sustainable Agriculture (NMSA)",
    ]

    state_schemes = {
        "Andhra Pradesh": ["YSR Rythu Bharosa: ₹13,500/year investment support"],
        "Telangana": ["Rythu Bandhu: ₹10,000/acre/year investment support"],
        "Karnataka": ["Raitha Siri: Interest-free crop loans"],
        "Tamil Nadu": ["TN Crop Insurance: State-subsidized crop insurance"],
        "Maharashtra": ["Shetkari Sanman Yojana: ₹6000/year income support"],
    }

    if state in state_schemes:
        schemes.extend(state_schemes[state])

    return schemes


def _get_fertilizer_recommendation(crop: str, state: str = None) -> str:
    """Get crop-specific fertilizer recommendations."""
    recommendations = {
        "tomato": "Apply NPK 120:60:60 kg/ha. Use 20-25 tonnes FYM/ha before planting. Side-dress with 30kg N/ha at flowering.",
        "potato": "Apply NPK 180:80:100 kg/ha. Incorporate 25 tonnes FYM/ha. Apply K in split doses.",
        "rice": "Apply NPK 120:60:40 kg/ha. Apply N in 3 splits: basal, tillering, panicle initiation.",
        "maize": "Apply NPK 120:60:40 kg/ha. Apply N in 2 splits: at knee-high and tasseling stages.",
        "wheat": "Apply NPK 120:60:40 kg/ha. Apply half N + full P&K as basal, remaining N at first irrigation.",
        "cotton": "Apply NPK 120:60:60 kg/ha. Apply N in 3 equal splits. Apply foliar spray of 2% DAP at flowering.",
        "banana": "Apply NPK 200:60:300 g/plant/year. Apply in 4 equal splits at 2-month intervals.",
        "mango": "Apply NPK 1.0:0.5:1.0 kg/tree/year for bearing trees. Apply after harvest and before flowering.",
        "chili": "Apply NPK 120:60:50 kg/ha. Side-dress with 30kg N/ha at first picking.",
    }
    return recommendations.get(crop, "Follow local agricultural extension office recommendations for your crop and soil type.")
