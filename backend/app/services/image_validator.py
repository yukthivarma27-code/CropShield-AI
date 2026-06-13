import numpy as np
from PIL import Image
from typing import Dict, Tuple, Optional


MIN_WIDTH = 100
MIN_HEIGHT = 100

MIN_GREEN_RATIO = 0.15

MAX_TEXT_EDGE_DENSITY = 0.35

MIN_COLOR_STD = 15.0
MIN_ENTROPY = 3.0

LEAF_GREEN_HUE_RANGE = (40, 170)
LEAF_GREEN_SAT_MIN = 30


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

    green_mask = (
        (h >= LEAF_GREEN_HUE_RANGE[0]) & (h <= LEAF_GREEN_HUE_RANGE[1]) &
        (s >= LEAF_GREEN_SAT_MIN)
    )
    green_ratio = float(green_mask.sum() / green_mask.size)
    metrics["green_ratio"] = float(round(green_ratio, 4))

    sobel_x = np.abs(np.diff(gray.astype(np.float32), axis=1))
    sobel_y = np.abs(np.diff(gray.astype(np.float32), axis=0))
    edge_magnitude = np.sqrt(
        sobel_x[:, :-1] ** 2 + sobel_y[:-1, :] ** 2
    )
    edge_threshold = 50.0
    edge_density = float((edge_magnitude > edge_threshold).sum() / edge_magnitude.size)
    metrics["edge_density"] = float(round(edge_density, 4))

    color_var_per_channel = img_array.var(axis=(0, 1))
    color_variance = float(color_var_per_channel.mean())
    metrics["color_variance"] = float(round(color_variance, 2))

    low_var_mask = color_var_per_channel < 500.0
    low_var_channels = int(low_var_mask.sum())
    metrics["low_var_channels"] = low_var_channels

    if green_ratio < MIN_GREEN_RATIO:
        metrics["rejection_reason"] = "low_green"
        return False, "Please upload a clear image of a crop leaf.", metrics

    if edge_density > MAX_TEXT_EDGE_DENSITY:
        metrics["rejection_reason"] = "high_edge_density"
        return False, "Please upload a clear image of a crop leaf.", metrics

    if low_var_channels >= 2:
        R, G, B = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]
        r_ratio = float((R > G + 10).sum() / R.size)
        b_ratio = float((B > G + 10).sum() / B.size)
        metrics["r_ratio"] = float(round(r_ratio, 4))
        metrics["b_ratio"] = float(round(b_ratio, 4))

        if r_ratio > 0.4 or b_ratio > 0.4:
            metrics["rejection_reason"] = "dominant_non_green"
            return False, "Please upload a clear image of a crop leaf.", metrics

    return True, "", metrics


def estimate_entropy(image: Image.Image) -> float:
    gray = np.array(image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    return float(-np.sum(hist_norm * np.log2(hist_norm + 1e-8)))
