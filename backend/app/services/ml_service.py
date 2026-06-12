"""
AgriVision AI — ML Inference Service
======================================
Handles model loading and disease prediction.
Falls back to numpy-based inference when TensorFlow is unavailable.
"""

import os
import json
import random
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import Image

from app.config import settings


DISEASE_CLASSES = [
    "Anthracnose", "Bacterial Spot", "Bacterial Wilt", "Early Blight",
    "Healthy", "Late Blight", "Leaf Mold", "Mosaic Virus",
    "Powdery Mildew", "Rust"
]

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


class FeatureModel:
    """Lightweight feature-based model using only numpy.
    
    Extracts simple color/texture features from the image and
    passes them through a small neural network.
    """
    
    def __init__(self, weights_path: str):
        self.weights = {}
        self._load_weights(weights_path)
    
    def _load_weights(self, path: str):
        import h5py
        with h5py.File(path, "r") as f:
            for key in f.keys():
                self.weights[key] = np.array(f[key])
    
    def _extract_features(self, image_array: np.ndarray) -> np.ndarray:
        img = image_array[0]
        h, w, c = img.shape
        
        features = []
        
        for ch in range(c):
            channel = img[:, :, ch]
            features.append(float(np.mean(channel)))
            features.append(float(np.std(channel)))
            features.append(float(np.percentile(channel, 25)))
            features.append(float(np.percentile(channel, 75)))
        
        return np.array(features, dtype=np.float32)
    
    def _relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)
    
    def _softmax(self, x: np.ndarray) -> np.ndarray:
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / (np.sum(e_x, axis=-1, keepdims=True) + 1e-8)
    
    def predict(self, image_array: np.ndarray) -> np.ndarray:
        features = self._extract_features(image_array)
        
        x = features @ self.weights["fc1_weight"] + self.weights["fc1_bias"]
        x = self._relu(x)
        
        x = x @ self.weights["fc2_weight"] + self.weights["fc2_bias"]
        x = self._relu(x)
        
        x = x @ self.weights["fc3_weight"] + self.weights["fc3_bias"]
        x = self._softmax(x)
        
        return x


class MLService:
    def __init__(self):
        self.model = None
        self.tflite_interpreter = None
        self.class_labels = {i: name for i, name in enumerate(DISEASE_CLASSES)}
        self.is_mock = True

    async def load_model(self):
        model_path = Path(settings.base_dir) / settings.MODEL_PATH
        self.is_mock = True
        
        tf_available = False
        try:
            os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
            import tensorflow as tf
            tf_available = True
        except ImportError:
            print("[!] TensorFlow not available. Will try numpy-based inference.")
        
        if tf_available and model_path.exists():
            try:
                import tensorflow as tf
                self.model = tf.keras.models.load_model(str(model_path))
                self.is_mock = False
                print(f"[✓] Model loaded with TF from {model_path}")
            except Exception as e:
                print(f"[!] Failed to load model with TF: {e}.")
        
        if self.is_mock and model_path.exists():
            try:
                import h5py
                with h5py.File(str(model_path), "r") as f:
                    keys = list(f.keys())
                if keys:
                    self.model = FeatureModel(str(model_path))
                    self.is_mock = False
                    print(f"[OK] Feature-based model loaded from {model_path}")
            except Exception as e:
                print(f"[!] Failed to load feature model: {e}")
        
        if self.is_mock:
            print(f"[!] No valid model found. Using mock predictions.")
        
        tflite_path = Path(settings.base_dir) / settings.TFLITE_MODEL_PATH
        if settings.USE_TFLITE and tflite_path.exists() and tf_available:
            try:
                import tensorflow as tf
                self.tflite_interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
                self.tflite_interpreter.allocate_tensors()
                print(f"[✓] TFLite model loaded from {tflite_path}")
            except Exception as e:
                print(f"[!] Failed to load TFLite: {e}")

        labels_path = model_path.parent / "class_labels.json"
        if labels_path.exists():
            with open(labels_path) as f:
                self.class_labels = {int(k): v for k, v in json.load(f).items()}

    def predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        if self.is_mock:
            return self._mock_predict(crop)

        if isinstance(self.model, FeatureModel):
            return self._feature_predict(image_array, crop)

        if self.tflite_interpreter and settings.USE_TFLITE:
            return self._tflite_predict(image_array, crop)

        return self._keras_predict(image_array, crop)

    def _keras_predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        predictions = self.model.predict(image_array, verbose=0)[0]
        return self._format_predictions(predictions, crop)

    def _tflite_predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        input_details = self.tflite_interpreter.get_input_details()
        output_details = self.tflite_interpreter.get_output_details()
        self.tflite_interpreter.set_tensor(
            input_details[0]["index"],
            image_array.astype(np.float32)
        )
        self.tflite_interpreter.invoke()
        predictions = self.tflite_interpreter.get_tensor(output_details[0]["index"])[0]
        return self._format_predictions(predictions, crop)

    def _feature_predict(self, image_array: np.ndarray, crop: str = None) -> Dict:
        raw_preds = self.model.predict(image_array)
        return self._format_predictions(raw_preds, crop)

    def _mock_predict(self, crop: str = None) -> Dict:
        if crop and crop.lower() in CROP_DISEASES:
            possible = CROP_DISEASES[crop.lower()]
        else:
            possible = DISEASE_CLASSES

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
        top_indices = np.argsort(raw_predictions)[::-1]

        all_preds = []
        for idx in top_indices:
            disease = self.class_labels.get(int(idx), f"Class_{idx}")
            conf = float(raw_predictions[int(idx)])
            all_preds.append({"disease": disease, "confidence": conf})

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


ml_service = MLService()
