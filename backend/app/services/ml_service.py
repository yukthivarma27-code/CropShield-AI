"""
AgriVision AI — ML Inference Service
======================================
Handles model loading and disease prediction.
Uses a mock model when the trained model is unavailable (for demo purposes).
"""

import os
import json
import random
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import Image

from app.config import settings


# Disease class labels
DISEASE_CLASSES = [
    "Anthracnose", "Bacterial Spot", "Bacterial Wilt", "Early Blight",
    "Healthy", "Late Blight", "Leaf Mold", "Mosaic Virus",
    "Powdery Mildew", "Rust"
]

# Crop-disease mapping for realistic predictions
CROP_DISEASES = {
    "tomato": ["Healthy", "Early Blight", "Late Blight", "Bacterial Spot", "Leaf Mold", "Mosaic Virus", "Bacterial Wilt"],
    "potato": ["Healthy", "Early Blight", "Late Blight", "Bacterial Wilt"],
    "rice": ["Healthy", "Bacterial Spot", "Leaf Mold", "Rust"],
    "maize": ["Healthy", "Rust", "Mosaic Virus", "Early Blight"],
    "wheat": ["Healthy", "Powdery Mildew", "Rust"],
    "cotton": ["Healthy", "Powdery Mildew", "Rust", "Anthracnose"],
    "banana": ["Healthy", "Mosaic Virus", "Anthracnose", "Bacterial Wilt"],
    "mango": ["Healthy", "Powdery Mildew", "Anthracnose"],
    "chili": ["Healthy", "Bacterial Spot", "Mosaic Virus", "Powdery Mildew", "Anthracnose", "Bacterial Wilt"],
}


class MLService:
    """Machine learning inference service."""

    def __init__(self):
        self.model = None
        self.tflite_interpreter = None
        self.class_labels = {i: name for i, name in enumerate(DISEASE_CLASSES)}
        self.is_mock = True

    async def load_model(self):
        """Load the trained model or fall back to mock mode."""
        model_path = Path(settings.base_dir) / settings.MODEL_PATH

        if model_path.exists():
            try:
                os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
                import tensorflow as tf
                self.model = tf.keras.models.load_model(str(model_path))
                self.is_mock = False
                print(f"[✓] Model loaded from {model_path}")
            except Exception as e:
                print(f"[!] Failed to load model: {e}. Using mock predictions.")
                self.is_mock = True
        else:
            print(f"[!] Model not found at {model_path}. Using mock predictions.")
            self.is_mock = True

        # Try loading TFLite model
        tflite_path = Path(settings.base_dir) / settings.TFLITE_MODEL_PATH
        if settings.USE_TFLITE and tflite_path.exists():
            try:
                import tensorflow as tf
                self.tflite_interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
                self.tflite_interpreter.allocate_tensors()
                print(f"[✓] TFLite model loaded from {tflite_path}")
            except Exception as e:
                print(f"[!] Failed to load TFLite: {e}")

        # Load class labels
        labels_path = model_path.parent / "class_labels.json"
        if labels_path.exists():
            with open(labels_path) as f:
                self.class_labels = {int(k): v for k, v in json.load(f).items()}

    def predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        """
        Run inference on preprocessed image.

        Args:
            image_array: Preprocessed image (1, 224, 224, 3)
            crop: Optional crop type for filtering predictions

        Returns:
            Dict with disease, confidence, top_3_predictions
        """
        if self.is_mock:
            return self._mock_predict(crop)

        if self.tflite_interpreter and settings.USE_TFLITE:
            return self._tflite_predict(image_array, crop)

        return self._keras_predict(image_array, crop)

    def _keras_predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        """Run prediction using full Keras model."""
        predictions = self.model.predict(image_array, verbose=0)[0]
        return self._format_predictions(predictions, crop)

    def _tflite_predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        """Run prediction using TFLite model."""
        input_details = self.tflite_interpreter.get_input_details()
        output_details = self.tflite_interpreter.get_output_details()

        self.tflite_interpreter.set_tensor(
            input_details[0]["index"],
            image_array.astype(np.float32)
        )
        self.tflite_interpreter.invoke()

        predictions = self.tflite_interpreter.get_tensor(output_details[0]["index"])[0]
        return self._format_predictions(predictions, crop)

    def _mock_predict(self, crop: str = None) -> Dict:
        """Generate realistic mock predictions for demo."""
        if crop and crop.lower() in CROP_DISEASES:
            possible = CROP_DISEASES[crop.lower()]
        else:
            possible = DISEASE_CLASSES

        # Generate realistic probability distribution
        probs = np.random.dirichlet(np.ones(len(possible)) * 0.3)
        probs = sorted(probs, reverse=True)

        predictions = []
        for i, disease in enumerate(random.sample(possible, min(len(possible), len(probs)))):
            predictions.append({"disease": disease, "confidence": float(probs[i])})

        predictions.sort(key=lambda x: x["confidence"], reverse=True)
        top_pred = predictions[0]

        return {
            "disease": top_pred["disease"],
            "confidence": top_pred["confidence"],
            "top_3_predictions": predictions[:3],
        }

    def _format_predictions(self, raw_predictions: np.ndarray, crop: str = None) -> Dict:
        """Format raw model output into structured predictions."""
        top_indices = np.argsort(raw_predictions)[::-1]

        all_preds = []
        for idx in top_indices:
            disease = self.class_labels.get(idx, f"Class_{idx}")
            conf = float(raw_predictions[idx])
            all_preds.append({"disease": disease, "confidence": conf})

        # Filter by crop if specified
        if crop and crop.lower() in CROP_DISEASES:
            valid = CROP_DISEASES[crop.lower()]
            filtered = [p for p in all_preds if p["disease"] in valid]
            if filtered:
                all_preds = filtered

        return {
            "disease": all_preds[0]["disease"],
            "confidence": all_preds[0]["confidence"],
            "top_3_predictions": all_preds[:3],
        }


# Singleton
ml_service = MLService()
