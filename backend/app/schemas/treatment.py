"""
AgriVision AI — Treatment Schemas
===================================
"""

from pydantic import BaseModel
from typing import Optional, List


class ChemicalTreatment(BaseModel):
    name: str
    active_ingredient: Optional[str]
    dosage: Optional[str]
    spray_interval: Optional[str]
    precautions: Optional[str]


class OrganicRemedy(BaseModel):
    name: str
    preparation: Optional[str]
    application: Optional[str]
    frequency: Optional[str]


class TreatmentResponse(BaseModel):
    disease: str
    crop: Optional[str]
    chemical_treatments: List[ChemicalTreatment]
    organic_remedies: List[OrganicRemedy]
    preventive_measures: List[str]


class RecommendationResponse(BaseModel):
    disease: str
    crop: Optional[str]
    state: Optional[str]
    district: Optional[str]
    chemical_treatments: List[ChemicalTreatment]
    organic_remedies: List[OrganicRemedy]
    preventive_measures: List[str]
    weather_advisory: Optional[str]
    government_schemes: List[str] = []
    fertilizer_recommendation: Optional[str] = None
