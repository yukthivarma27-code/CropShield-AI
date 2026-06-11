"""
AgriVision AI — Image Preprocessing Pipeline
==============================================
Handles all image transformations: resize, background removal,
noise reduction, contrast enhancement, normalization, and augmentation.
"""

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import io
import base64
from typing import Tuple, Optional


# ── Constants ────────────────────────────────────────────────────────────────
TARGET_SIZE = (224, 224)
NORMALIZATION_MEAN = [0.485, 0.456, 0.406]  # ImageNet means
NORMALIZATION_STD = [0.229, 0.224, 0.225]    # ImageNet stds


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Load a PIL Image from raw bytes."""
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def load_image_from_base64(b64_string: str) -> Image.Image:
    """Load a PIL Image from a base64-encoded string."""
    # Strip data URI prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    image_bytes = base64.b64decode(b64_string)
    return load_image_from_bytes(image_bytes)


def load_image_from_path(path: str) -> Image.Image:
    """Load a PIL Image from a file path."""
    return Image.open(path).convert("RGB")


def resize_image(image: Image.Image, size: Tuple[int, int] = TARGET_SIZE) -> Image.Image:
    """Resize image to target size using LANCZOS resampling."""
    return image.resize(size, Image.LANCZOS)


def remove_background(image: Image.Image) -> Image.Image:
    """
    Remove background from leaf image using rembg.
    Falls back to original image if rembg is not available.
    """
    try:
        from rembg import remove
        # Convert to bytes for rembg
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        result = remove(buf.getvalue())
        result_img = Image.open(io.BytesIO(result)).convert("RGB")
        return result_img
    except ImportError:
        print("[!] rembg not installed. Skipping background removal.")
        return image
    except Exception as e:
        print(f"[!] Background removal failed: {e}")
        return image


def reduce_noise(image: Image.Image, radius: int = 1) -> Image.Image:
    """Apply Gaussian blur for noise reduction."""
    return image.filter(ImageFilter.GaussianBlur(radius=radius))


def enhance_contrast(image: Image.Image, factor: float = 1.5) -> Image.Image:
    """Enhance image contrast using CLAHE-like approach via PIL."""
    enhancer = ImageEnhance.Contrast(image)
    return enhancer.enhance(factor)


def enhance_sharpness(image: Image.Image, factor: float = 1.3) -> Image.Image:
    """Enhance image sharpness."""
    enhancer = ImageEnhance.Sharpness(image)
    return enhancer.enhance(factor)


def normalize_image(image: Image.Image) -> np.ndarray:
    """
    Normalize image to [0, 1] range and apply ImageNet normalization.

    Returns:
        numpy array of shape (224, 224, 3) with float32 values
    """
    arr = np.array(image, dtype=np.float32) / 255.0

    # Apply ImageNet normalization
    arr[:, :, 0] = (arr[:, :, 0] - NORMALIZATION_MEAN[0]) / NORMALIZATION_STD[0]
    arr[:, :, 1] = (arr[:, :, 1] - NORMALIZATION_MEAN[1]) / NORMALIZATION_STD[1]
    arr[:, :, 2] = (arr[:, :, 2] - NORMALIZATION_MEAN[2]) / NORMALIZATION_STD[2]

    return arr


def normalize_simple(image: Image.Image) -> np.ndarray:
    """Simple normalization to [0, 1] range without ImageNet stats."""
    return np.array(image, dtype=np.float32) / 255.0


def preprocess_for_prediction(
    image: Image.Image,
    apply_bg_removal: bool = False,
    apply_noise_reduction: bool = True,
    apply_contrast_enhancement: bool = True,
) -> np.ndarray:
    """
    Full preprocessing pipeline for model inference.

    Args:
        image: Input PIL Image
        apply_bg_removal: Whether to remove background (slow)
        apply_noise_reduction: Whether to apply Gaussian blur
        apply_contrast_enhancement: Whether to enhance contrast

    Returns:
        Preprocessed numpy array ready for model input, shape (1, 224, 224, 3)
    """
    # Step 1: Optional background removal
    if apply_bg_removal:
        image = remove_background(image)

    # Step 2: Resize
    image = resize_image(image, TARGET_SIZE)

    # Step 3: Noise reduction
    if apply_noise_reduction:
        image = reduce_noise(image, radius=1)

    # Step 4: Contrast enhancement
    if apply_contrast_enhancement:
        image = enhance_contrast(image, factor=1.3)

    # Step 5: Normalize
    arr = normalize_simple(image)

    # Step 6: Add batch dimension
    return np.expand_dims(arr, axis=0)


def image_to_base64(image: Image.Image, fmt: str = "JPEG") -> str:
    """Convert PIL Image to base64 string with data URI prefix."""
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    mime = "image/jpeg" if fmt == "JPEG" else "image/png"
    return f"data:{mime};base64,{b64}"


def get_tf_augmentation_layers():
    """
    Get TensorFlow data augmentation layers for training.
    Returns a Sequential model of augmentation layers.
    """
    try:
        import tensorflow as tf

        return tf.keras.Sequential([
            tf.keras.layers.RandomFlip("horizontal_and_vertical"),
            tf.keras.layers.RandomRotation(0.3),
            tf.keras.layers.RandomZoom(0.2),
            tf.keras.layers.RandomBrightness(0.2),
            tf.keras.layers.RandomContrast(0.2),
        ], name="data_augmentation")
    except ImportError:
        print("[!] TensorFlow not available for augmentation layers.")
        return None
