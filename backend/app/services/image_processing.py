"""
AgriVision AI — Image Processing Service
==========================================
Server-side image processing for uploads.
"""

import uuid
from pathlib import Path
from PIL import Image
from fastapi import UploadFile
import io

from app.config import settings


async def save_upload_image(file: UploadFile) -> tuple:
    """
    Save uploaded image and return (file_path, PIL Image).
    """
    upload_dir = Path(settings.base_dir) / settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = upload_dir / filename

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    pil_image = Image.open(io.BytesIO(contents)).convert("RGB")

    return str(filepath), pil_image


def process_base64_image(b64_string: str) -> tuple:
    """Process base64 image and save to disk."""
    import base64

    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    image_bytes = base64.b64decode(b64_string)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    upload_dir = Path(settings.base_dir) / settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = upload_dir / filename
    pil_image.save(str(filepath), "JPEG")

    return str(filepath), pil_image
