import numpy as np
from PIL import Image
from typing import Dict, Tuple


MIN_WIDTH = 224
MIN_HEIGHT = 224

MIN_COLOR_STD = 8.0
MIN_ENTROPY = 0.8


def _is_green_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 50) & (h <= 120) & (s >= 40) & (v >= 30)


def _is_yellow_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 28) & (h < 50) & (s >= 60) & (v >= 50)


def _is_brown_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 5) & (h < 28) & (s >= 80) & (v >= 20) & (v <= 160)


def _is_white_pixel(s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (v > 220) & (s < 30)


def _is_black_text_pixel(v: np.ndarray) -> np.ndarray:
    return v < 40


def _is_skin_pixel(h: np.ndarray, s: np.ndarray, v: np.ndarray) -> np.ndarray:
    return (h >= 0) & (h <= 25) & (s >= 20) & (s <= 150) & (v >= 60) & (v <= 200)


def _edge_density_and_orientation(gray: np.ndarray) -> Tuple[float, float, float]:
    sobel_x = np.abs(np.diff(gray.astype(np.float32), axis=1))
    sobel_y = np.abs(np.diff(gray.astype(np.float32), axis=0))
    hw = sobel_x.shape[0]
    hh = sobel_y.shape[1]
    min_h = min(hw, sobel_y.shape[0])
    min_w = min(sobel_x.shape[1], hh)
    edge_mag = np.sqrt(sobel_x[:min_h, :min_w] ** 2 + sobel_y[:min_h, :min_w] ** 2)
    threshold = 50.0
    dense = float((edge_mag > threshold).sum() / edge_mag.size)
    horiz = sobel_x[:min_h, :min_w] > threshold
    vert = sobel_y[:min_h, :min_w] > threshold
    both = horiz & vert
    h_only = horiz & ~vert
    v_only = vert & ~horiz
    hv = float((h_only.sum() + v_only.sum()) / (both.sum() + 1))
    return dense, hv, float(edge_mag.std())


def validate_crop_image(pil_image: Image.Image) -> Tuple[bool, str, Dict, float]:
    """
    Validate that an image contains a crop leaf/plant.
    Returns (is_valid, error_message, metrics, confidence).
    Confidence is 0-100; values below 80 are rejected.
    """
    metrics = {}
    width, height = pil_image.size
    metrics["width"] = width
    metrics["height"] = height

    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return False, "Please upload a clear crop leaf image for disease detection.", metrics, 0.0

    img_rgb = np.array(pil_image.convert("RGB"), dtype=np.uint8)
    if img_rgb.ndim != 3 or img_rgb.shape[2] != 3:
        return False, "Please upload a clear crop leaf image for disease detection.", metrics, 0.0

    std_per_channel = img_rgb.std(axis=(0, 1)).mean()
    metrics["color_std"] = float(round(std_per_channel, 2))

    gray = np.array(pil_image.convert("L"), dtype=np.float32)
    hist, _ = np.histogram(gray, bins=256, range=(0, 256))
    hist_norm = hist / (hist.sum() + 1e-8)
    ent = -np.sum(hist_norm * np.log2(hist_norm + 1e-8))
    metrics["entropy"] = float(round(ent, 2))

    if std_per_channel < MIN_COLOR_STD or ent < MIN_ENTROPY:
        return False, "Please upload a clear crop leaf image for disease detection.", metrics, 0.0

    hsv = np.array(pil_image.convert("HSV"), dtype=np.uint8)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    total = float(h.size)

    # ── Color masks ──────────────────────────────────────────────
    white_mask = _is_white_pixel(s, v)
    white_ratio = float(white_mask.sum() / total)
    metrics["white_ratio"] = float(round(white_ratio, 4))

    black_mask = _is_black_text_pixel(v)
    black_ratio = float(black_mask.sum() / total)
    metrics["black_ratio"] = float(round(black_ratio, 4))

    skin_mask = _is_skin_pixel(h, s, v)
    skin_ratio = float(skin_mask.sum() / total)
    metrics["skin_ratio"] = float(round(skin_ratio, 4))

    green_mask = _is_green_pixel(h, s, v)
    yellow_mask = _is_yellow_pixel(h, s, v)
    brown_mask = _is_brown_pixel(h, s, v)

    green_ratio = float(green_mask.sum() / total)
    yellow_ratio = float(yellow_mask.sum() / total)
    brown_ratio = float(brown_mask.sum() / total)
    natural_mask = green_mask | yellow_mask | brown_mask
    natural_ratio = float(natural_mask.sum() / total)

    metrics["green_ratio"] = float(round(green_ratio, 4))
    metrics["yellow_ratio"] = float(round(yellow_ratio, 4))
    metrics["brown_ratio"] = float(round(brown_ratio, 4))
    metrics["natural_ratio"] = float(round(natural_ratio, 4))

    # ── Edge analysis ────────────────────────────────────────────
    edge_density, hv_ratio, edge_std = _edge_density_and_orientation(gray)
    metrics["edge_density"] = float(round(edge_density, 4))
    metrics["hv_edge_ratio"] = float(round(hv_ratio, 4))
    metrics["edge_std"] = float(round(edge_std, 2))

    # ── Green spatial distribution ───────────────────────────────
    # Leaves have green spread across the image; logos/clusters don't
    block_size = 32
    bh = max(1, height // block_size)
    bw = max(1, width // block_size)
    green_blocks = np.zeros((bh, bw), dtype=float)
    for by in range(bh):
        for bx in range(bw):
            y0 = by * height // bh
            y1 = (by + 1) * height // bh
            x0 = bx * width // bw
            x1 = (bx + 1) * width // bw
            block = green_mask[y0:y1, x0:x1]
            green_blocks[by, bx] = float(block.sum()) / block.size
    green_spread = float((green_blocks > 0.02).sum()) / green_blocks.size
    metrics["green_spread"] = float(round(green_spread, 4))

    # ═══════════════════════════════════════════════════════════════
    # ── HARD REJECTION RULES ──
    # ═══════════════════════════════════════════════════════════════

    # Rule 1: White document background → certificate / ID card / document
    if white_ratio > 0.35 and natural_ratio < 0.10:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 2: Mostly black text on white → document / screenshot of text
    if black_ratio > 0.15 and white_ratio > 0.20 and natural_ratio < 0.10:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 3: Skin-toned pixels → human face / person
    if skin_ratio > 0.15:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 4: Very high edge density → screenshot / dense text
    if edge_density > 0.35:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 5: High edge density with low natural → text-heavy / artificial
    if edge_density > 0.20 and natural_ratio < 0.10:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 6: Almost no natural content → not a plant
    if natural_ratio < 0.05:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # Rule 7: Moderate white with very low green → document with colored accent
    if white_ratio > 0.20 and green_ratio < 0.05:
        return False, "Image is not a crop leaf.", metrics, 0.0

    # ═══════════════════════════════════════════════════════════════
    # ── CONFIDENCE SCORE ──
    # ═══════════════════════════════════════════════════════════════

    # Natural content score (green heavily weighted)
    nat_score = min(green_ratio * 12 + natural_ratio * 2, 1.0)

    # Edge cleanliness (leaves have fewer sharp edges)
    edge_score = max(1.0 - edge_density / 0.3, 0.0)

    # Color richness
    col_score = min(std_per_channel / 50.0, 1.0)

    # Green distribution (spread across image, not a small logo)
    spread_score = min(green_spread * 2.0, 1.0)

    # White penalty
    white_penalty = max(0.0, 1.0 - white_ratio * 3)

    confidence = round(
        (nat_score * 0.35 + edge_score * 0.20 + col_score * 0.15 + spread_score * 0.15 + white_penalty * 0.15) * 100,
        1,
    )
    metrics["confidence"] = confidence

    if confidence < 80.0:
        return False, "Image is not a crop leaf.", metrics, confidence

    return True, "", metrics, confidence
