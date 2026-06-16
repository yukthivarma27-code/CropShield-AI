"""
AgriVision AI — Prediction Router
====================================
POST /predict — Upload leaf image and get disease prediction.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from datetime import datetime
import numpy as np

from app.services.ml_service import ml_service
from app.services.image_processing import save_upload_image, process_base64_image
from app.services.severity_service import estimate_severity
from app.services.treatment_engine import get_disease_info
from app.services.image_validator import validate_crop_image
from ml.preprocess import preprocess_for_prediction

router = APIRouter(prefix="/predict", tags=["Prediction"])

# In-memory store for demo (replace with DB in production)
_predictions_store = []
_pred_counter = 0


@router.post("")
async def predict_disease(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    crop: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
):
    """
    Predict crop disease from a leaf image.

    Accepts either a file upload or base64-encoded image.
    Returns disease prediction with confidence, severity, and top-3 results.
    """
    global _pred_counter

    # Process image
    try:
        if file:
            image_path, pil_image = await save_upload_image(file)
        elif image_base64:
            image_path, pil_image = process_base64_image(image_base64)
        else:
            raise HTTPException(status_code=400, detail="No image provided. Send a file or base64 image.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

    # Validate image is a crop leaf/plant
    is_valid, validation_msg, _metrics, confidence = validate_crop_image(pil_image)
    if not is_valid:
        raise HTTPException(status_code=400, detail=validation_msg)

    if confidence < 80.0:
        raise HTTPException(
            status_code=400,
            detail="Please upload a clear crop leaf image for disease detection.",
        )

    # Preprocess
    processed = preprocess_for_prediction(pil_image)

    # Predict
    prediction = ml_service.predict(processed, crop)

    # Severity estimation
    severity = estimate_severity(pil_image, prediction["disease"])

    # Disease info
    disease_info = get_disease_info(prediction["disease"])

    # Build response
    _pred_counter += 1
    result = {
        "id": _pred_counter,
        "crop": crop,
        "disease": prediction["disease"],
        "confidence": round(prediction["confidence"], 4),
        "severity": severity["level"],
        "severity_percentage": severity["percentage"],
        "top_3_predictions": prediction["top_3_predictions"],
        "symptoms": disease_info["symptoms"],
        "description": disease_info["description"],
        "gradcam_url": None,  # Generated separately if requested
        "image_url": f"/uploads/{image_path.split('/')[-1] if '/' in image_path else image_path.split(chr(92))[-1]}",
        "created_at": datetime.now().isoformat(),
    }

    _predictions_store.append(result)
    return result


@router.get("/classes")
async def get_disease_classes():
    """Return available disease classes and supported crops."""
    from app.services.ml_service import DISEASE_CLASSES, CROP_DISEASES
    return {
        "disease_classes": DISEASE_CLASSES,
        "supported_crops": list(CROP_DISEASES.keys()),
        "crop_diseases": CROP_DISEASES,
    }
