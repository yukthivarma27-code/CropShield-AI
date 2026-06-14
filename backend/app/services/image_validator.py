import numpy as np
from PIL import Image
from typing import Dict, Tuple


MIN_WIDTH = 100
MIN_HEIGHT = 100

MIN_COLOR_STD = 8.0
MIN_ENTROPY = 2.5

MAX_TEXT_EDGE_DENSITY = 0.35


def _is_green_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 50) & (h <= 120) & (s >= 40) & (v >= 30)


def _is_yellow_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 28) & (h < 50) & (s >= 60) & (v >= 50)


def _is_brown_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 5) & (h < 28) & (s >= 80) & (v >= 20) & (v <= 160)


def validate_crop_image(pil_image: Image.Image) -> Tuple[bool, str, Dict]:
    """
    Validate that an image contains a crop leaf/plant.
    Returns (is_valid, error_message, metrics).
    """
    metrics = {}
    width, height = pil_image.size
    metrics["width"] = width
    metrics["height"] = height

    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return False, f"Image too small ({width}x{height}). Minimum {MIN_WIDTH}x{MIN_HEIGHT}px.", metrics

    img_array = np.array(pil_image.convert("RGB"), dtype=np.uint8)
    if img_array.ndim != 3 or img_array.shape[2] != 3:
        return False, "Invalid image format. Expected RGB image.", metrics

    std_per_channel = img_array.std(axis=(0, 1)).mean()
    metrics["color_std"] = float(round(std_per_channel, 2))

    gray = np.array(pil_image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    entropy = -np.sum(hist_norm * np.log2(hist_norm + 1e-8))
    metrics["entropy"] = float(round(entropy, 2))

    if std_per_channel < MIN_COLOR_STD:
        return False, "Image appears blank or lacks sufficient visual information.", metrics

    if entropy < MIN_ENTROPY:
        return False, "Image appears blank or lacks sufficient visual information.", metrics

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

    if green_ratio >= 0.05:
        pass
    elif natural_ratio >= 0.20:
        pass
    else:
        metrics["rejection_reason"] = "low_natural"
        return False, "Please upload a clear image of a crop leaf.", metrics

    sobel_x = np.abs(np.diff(gray.astype(np.float32), axis=1))
    sobel_y = np.abs(np.diff(gray.astype(np.float32), axis=0))
    edge_magnitude = np.sqrt(
        sobel_x[:-1, :] ** 2 + sobel_y[:, :-1] ** 2
    )
    edge_threshold = 50.0
    edge_density = float((edge_magnitude > edge_threshold).sum() / edge_magnitude.size)
    metrics["edge_density"] = float(round(edge_density, 4))

    if edge_density > MAX_TEXT_EDGE_DENSITY:
        metrics["rejection_reason"] = "high_edge_density"
        return False, "Please upload a clear image of a crop leaf.", metrics

    return True, "", metrics


def estimate_entropy(image: Image.Image) -> float:
    gray = np.array(image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    return float(-np.sum(hist_norm * np.log2(hist_norm + 1e-8)))
