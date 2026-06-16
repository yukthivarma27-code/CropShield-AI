import numpy as np
from PIL import Image
from typing import Dict, Tuple


MIN_WIDTH = 224
MIN_HEIGHT = 224

MIN_COLOR_STD = 8.0
MIN_ENTROPY = 2.5

MAX_TEXT_EDGE_DENSITY = 0.35


def _is_green_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 50) & (h <= 120) & (s >= 40) & (v >= 30)


def _is_yellow_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 28) & (h < 50) & (s >= 60) & (v >= 50)


def _is_brown_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 5) & (h < 28) & (s >= 80) & (v >= 20) & (v <= 160)


def compute_crop_confidence(metrics: Dict) -> float:
    """
    Compute a crop-leaf confidence score (0-100) from validation metrics.
    Combines natural content, edge smoothness, and color richness.
    """
    green_ratio = metrics.get("green_ratio", 0)
    natural_ratio = metrics.get("natural_ratio", 0)
    edge_density = metrics.get("edge_density", 1.0)
    color_std = metrics.get("color_std", 0)

    natural_score = min(green_ratio * 8 + natural_ratio * 1.5, 1.0)
    edge_score = max(1.0 - edge_density / 0.5, 0.0)
    color_score = min(color_std / 30.0, 1.0)

    return round((natural_score * 0.5 + edge_score * 0.3 + color_score * 0.2) * 100, 1)


def validate_crop_image(pil_image: Image.Image) -> Tuple[bool, str, Dict, float]:
    """
    Validate that an image contains a crop leaf/plant.
    Returns (is_valid, error_message, metrics, confidence).
    Confidence is 0-100; values below 80 indicate the image is not a crop leaf.
    """
    metrics = {}
    width, height = pil_image.size
    metrics["width"] = width
    metrics["height"] = height

    if width < MIN_WIDTH or height < MIN_HEIGHT:
        msg = f"Image too small ({width}x{height}). Minimum {MIN_WIDTH}x{MIN_HEIGHT}px."
        metrics["confidence"] = 0.0
        return False, msg, metrics, 0.0

    img_array = np.array(pil_image.convert("RGB"), dtype=np.uint8)
    if img_array.ndim != 3 or img_array.shape[2] != 3:
        msg = "Invalid image format. Expected RGB image."
        metrics["confidence"] = 0.0
        return False, msg, metrics, 0.0

    std_per_channel = img_array.std(axis=(0, 1)).mean()
    metrics["color_std"] = float(round(std_per_channel, 2))

    gray = np.array(pil_image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    entropy = -np.sum(hist_norm * np.log2(hist_norm + 1e-8))
    metrics["entropy"] = float(round(entropy, 2))

    if std_per_channel < MIN_COLOR_STD:
        confidence = compute_crop_confidence(metrics)
        msg = "Please upload a clear crop leaf image for disease detection."
        metrics["confidence"] = confidence
        return False, msg, metrics, confidence

    if entropy < MIN_ENTROPY:
        confidence = compute_crop_confidence(metrics)
        msg = "Please upload a clear crop leaf image for disease detection."
        metrics["confidence"] = confidence
        return False, msg, metrics, confidence

    hsv = np.array(pil_image.convert("HSV"), dtype=np.uint8)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    green_mask = _is_green_pixel(h, s, v)
    yellow_mask = _is_yellow_pixel(h, s, v)
    brown_mask = _is_brown_pixel(h, s, v)

    total_px = green_mask.size
    green_ratio = float(green_mask.sum() / total_px)
    yellow_ratio = float(yellow_mask.sum() / total_px)
    brown_ratio = float(brown_mask.sum() / total_px)
    natural_ratio = float((green_mask | yellow_mask | brown_mask).sum() / total_px)

    metrics["green_ratio"] = float(round(green_ratio, 4))
    metrics["yellow_ratio"] = float(round(yellow_ratio, 4))
    metrics["brown_ratio"] = float(round(brown_ratio, 4))
    metrics["natural_ratio"] = float(round(natural_ratio, 4))

    sobel_x = np.abs(np.diff(gray.astype(np.float32), axis=1))
    sobel_y = np.abs(np.diff(gray.astype(np.float32), axis=0))
    edge_magnitude = np.sqrt(
        sobel_x[:-1, :] ** 2 + sobel_y[:, :-1] ** 2
    )
    edge_threshold = 50.0
    edge_density = float((edge_magnitude > edge_threshold).sum() / edge_magnitude.size)
    metrics["edge_density"] = float(round(edge_density, 4))

    confidence = compute_crop_confidence(metrics)
    metrics["confidence"] = confidence

    if green_ratio >= 0.05:
        pass
    elif natural_ratio >= 0.20:
        pass
    else:
        metrics["rejection_reason"] = "low_natural"
        msg = "Please upload a clear crop leaf image for disease detection."
        return False, msg, metrics, confidence

    if edge_density > MAX_TEXT_EDGE_DENSITY:
        metrics["rejection_reason"] = "high_edge_density"
        msg = "Please upload a clear crop leaf image for disease detection."
        return False, msg, metrics, confidence

    msg = ""
    return True, msg, metrics, confidence


def estimate_entropy(image: Image.Image) -> float:
    gray = np.array(image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    return float(-np.sum(hist_norm * np.log2(hist_norm + 1e-8)))
