"""
AgriVision AI — GradCAM Implementation
========================================
Gradient-weighted Class Activation Maps for visual explanations.
"""

import os
import numpy as np
from pathlib import Path
from typing import Tuple, Optional

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from PIL import Image
import io, base64


class GradCAM:
    """Grad-CAM for CNN prediction visualization."""

    def __init__(self, model: keras.Model, layer_name: Optional[str] = None):
        self.model = model
        self.layer_name = layer_name or self._find_last_conv_layer()
        self.grad_model = keras.Model(
            inputs=self.model.input,
            outputs=[self.model.get_layer(self.layer_name).output, self.model.output],
        )

    def _find_last_conv_layer(self) -> str:
        for layer in reversed(self.model.layers):
            if isinstance(layer, keras.layers.Conv2D):
                return layer.name
            if hasattr(layer, 'layers'):
                for sub in reversed(layer.layers):
                    if isinstance(sub, keras.layers.Conv2D):
                        return sub.name
        raise ValueError("No Conv2D layer found")

    def generate_heatmap(self, image: np.ndarray, class_index: Optional[int] = None) -> np.ndarray:
        image_tensor = tf.cast(image, tf.float32)
        with tf.GradientTape() as tape:
            tape.watch(image_tensor)
            conv_outputs, predictions = self.grad_model(image_tensor)
            if class_index is None:
                class_index = tf.argmax(predictions[0])
            class_output = predictions[:, class_index]

        grads = tape.gradient(class_output, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0) / (tf.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()
        heatmap_resized = np.array(
            Image.fromarray(np.uint8(heatmap * 255)).resize((224, 224), Image.LANCZOS)
        ) / 255.0
        return heatmap_resized

    def overlay_heatmap(self, original_image: Image.Image, heatmap: np.ndarray, alpha: float = 0.4) -> Image.Image:
        import matplotlib.cm as cm
        original_resized = original_image.resize((224, 224), Image.LANCZOS)
        orig_array = np.array(original_resized, dtype=np.float32) / 255.0
        cmap = cm.get_cmap("jet")
        heatmap_colored = cmap(heatmap)[:, :, :3]
        overlaid = (1 - alpha) * orig_array + alpha * heatmap_colored
        overlaid = np.clip(overlaid * 255, 0, 255).astype(np.uint8)
        return Image.fromarray(overlaid)

    def highlight_infected_regions(self, original_image: Image.Image, heatmap: np.ndarray, threshold: float = 0.5) -> Image.Image:
        original_resized = original_image.resize((224, 224), Image.LANCZOS)
        orig_array = np.array(original_resized, dtype=np.float32)
        mask = heatmap > threshold
        highlighted = orig_array.copy()
        highlighted[mask, 0] = np.minimum(highlighted[mask, 0] + 80, 255)
        highlighted[mask, 1] = highlighted[mask, 1] * 0.6
        highlighted[mask, 2] = highlighted[mask, 2] * 0.6
        return Image.fromarray(highlighted.astype(np.uint8))


def generate_gradcam(model, image, original_image, class_index=None, save_path=None):
    gradcam = GradCAM(model)
    heatmap = gradcam.generate_heatmap(image, class_index)
    overlay = gradcam.overlay_heatmap(original_image, heatmap)
    if save_path:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        overlay.save(save_path)
    return overlay, heatmap


def gradcam_to_base64(overlay_image: Image.Image) -> str:
    buf = io.BytesIO()
    overlay_image.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"
