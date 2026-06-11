"""
AgriVision AI — ONNX Conversion
=================================
Export trained Keras model to ONNX format for cross-platform deployment.

Usage:
  python -m ml.convert_onnx --model ./ml/models/best_model.keras --output ./ml/models/
"""

import os
import argparse
import json
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"


def convert_to_onnx(model_path: str, output_dir: str, opset: int = 13) -> str:
    """Convert Keras model to ONNX format."""
    import tensorflow as tf
    import tf2onnx

    print("═" * 50)
    print("  ONNX Conversion")
    print("═" * 50)

    print(f"\n[1/2] Loading model from {model_path}...")
    model = tf.keras.models.load_model(model_path)

    print(f"[2/2] Converting to ONNX (opset {opset})...")
    output_path = Path(output_dir) / "crop_disease.onnx"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    spec = (tf.TensorSpec((None, 224, 224, 3), tf.float32, name="input"),)
    model_proto, _ = tf2onnx.convert.from_keras(model, input_signature=spec, opset=opset)

    with open(output_path, "wb") as f:
        f.write(model_proto.SerializeToString())

    model_size_mb = os.path.getsize(output_path) / (1024 * 1024)

    metadata = {
        "source_model": model_path,
        "onnx_path": str(output_path),
        "opset": opset,
        "model_size_mb": round(model_size_mb, 2),
    }

    meta_path = Path(output_dir) / "onnx_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[✓] ONNX model saved: {output_path} ({model_size_mb:.2f} MB)")
    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert to ONNX")
    parser.add_argument("--model", type=str, required=True)
    parser.add_argument("--output", type=str, default="./ml/models")
    parser.add_argument("--opset", type=int, default=13)
    args = parser.parse_args()
    convert_to_onnx(args.model, args.output, args.opset)
