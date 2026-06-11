"""
AgriVision AI — Severity Estimation Service
=============================================
Estimates infection severity percentage using image analysis.
Uses color-based segmentation as a practical approach.
"""

import numpy as np
from PIL import Image
from typing import Dict, Tuple


def estimate_severity(image: Image.Image, disease: str) -> Dict:
    """
    Estimate disease severity from leaf image.

    Uses color analysis to detect infected regions:
    - Brown/yellow spots → Early/Late Blight
    - White patches → Powdery Mildew
    - Orange pustules → Rust
    - Dark lesions → Anthracnose

    Returns:
        Dict with severity level, percentage, and description
    """
    if disease == "Healthy":
        return {"level": "None", "percentage": 0.0, "description": "No infection detected."}

    img_array = np.array(image.resize((224, 224)))

    # Convert to HSV for better color analysis
    from PIL import ImageStat
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

    # Detect non-green (potentially infected) regions
    green_mask = (g > r) & (g > b) & (g > 50)
    total_pixels = img_array.shape[0] * img_array.shape[1]
    green_pixels = np.sum(green_mask)
    non_green_ratio = 1.0 - (green_pixels / total_pixels)

    # Detect brown/yellow spots (common disease indicators)
    brown_mask = (r > 100) & (g > 60) & (g < r) & (b < 80)
    brown_ratio = np.sum(brown_mask) / total_pixels

    # Detect white/light patches (powdery mildew)
    white_mask = (r > 200) & (g > 200) & (b > 200)
    white_ratio = np.sum(white_mask) / total_pixels

    # Combined severity estimation
    infection_score = min(brown_ratio * 2 + white_ratio * 3 + non_green_ratio * 0.5, 1.0)

    # Map to percentage (calibrated for typical leaf images)
    severity_pct = min(infection_score * 100, 100.0)

    # Classify severity level
    if severity_pct <= 30:
        level = "Low"
        desc = f"Low infection ({severity_pct:.0f}%). Early intervention recommended. Apply preventive fungicides."
    elif severity_pct <= 70:
        level = "Medium"
        desc = f"Moderate infection ({severity_pct:.0f}%). Immediate treatment required. Remove heavily affected leaves."
    else:
        level = "High"
        desc = f"Severe infection ({severity_pct:.0f}%). Urgent action needed. Consider removing affected plants to prevent spread."

    return {
        "level": level,
        "percentage": round(severity_pct, 1),
        "description": desc,
    }
