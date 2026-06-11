"""
AgriVision AI — TensorFlow Lite Conversion
============================================
Convert trained Keras model to TFLite format for mobile/edge deployment.

Supports:
  - Float32 (full precision)
  - Float16 quantization
  - Int8 quantization (with representative dataset)

Usage:
  python -m ml.convert_tflite --model ./ml/models/best_model.keras --output ./ml/models/
"""

import os
import argparse
import json
import time
import numpy as np
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf


def convert_to_tflite(
    model_path: str,
    output_dir: str,
    quantize: str = "float16",
    representative_data_dir: str = None,
) -> str:
    """
    Convert Keras model to TFLite.

    Args:
        model_path: Path to .keras or .h5 model
        output_dir: Directory to save .tflite file
        quantize: Quantization type: 'none', 'float16', 'int8'
        representative_data_dir: Path to calibration images (needed for int8)

    Returns:
        Path to saved .tflite model
    """
    print("═" * 50)
    print("  TFLite Conversion")
    print("═" * 50)

    # Load model
    print(f"\n[1/3] Loading model from {model_path}...")
    model = tf.keras.models.load_model(model_path)

    # Convert
    print("[2/3] Converting to TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if quantize == "float16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
        suffix = "_fp16"
    elif quantize == "int8":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        if representative_data_dir:
            def representative_dataset():
                data_dir = Path(representative_data_dir) / "train"
                for class_dir in sorted(data_dir.iterdir()):
                    if not class_dir.is_dir():
                        continue
                    for img_path in list(class_dir.glob("*.jpg"))[:5]:
                        img = tf.io.read_file(str(img_path))
                        img = tf.image.decode_jpeg(img, channels=3)
                        img = tf.image.resize(img, [224, 224])
                        img = tf.cast(img, tf.float32) / 255.0
                        yield [tf.expand_dims(img, 0)]
            converter.representative_dataset = representative_dataset
        suffix = "_int8"
    else:
        suffix = "_fp32"

    tflite_model = converter.convert()

    # Save
    output_path = Path(output_dir) / f"crop_disease{suffix}.tflite"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(tflite_model)

    # Benchmark
    print("[3/3] Benchmarking...")
    interpreter = tf.lite.Interpreter(model_path=str(output_path))
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    dummy_input = np.random.rand(1, 224, 224, 3).astype(np.float32)
    interpreter.set_tensor(input_details[0]["index"], dummy_input)

    times = []
    for _ in range(10):
        start = time.time()
        interpreter.invoke()
        times.append(time.time() - start)

    avg_time = np.mean(times) * 1000

    # Save metadata
    model_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    metadata = {
        "source_model": model_path,
        "tflite_path": str(output_path),
        "quantization": quantize,
        "model_size_mb": round(model_size_mb, 2),
        "avg_inference_ms": round(avg_time, 2),
        "input_shape": input_details[0]["shape"].tolist(),
        "output_shape": output_details[0]["shape"].tolist(),
    }

    meta_path = Path(output_dir) / f"tflite_metadata{suffix}.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[✓] TFLite model saved: {output_path}")
    print(f"    Size: {model_size_mb:.2f} MB")
    print(f"    Avg inference: {avg_time:.2f} ms")

    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert to TFLite")
    parser.add_argument("--model", type=str, required=True)
    parser.add_argument("--output", type=str, default="./ml/models")
    parser.add_argument("--quantize", choices=["none", "float16", "int8"], default="float16")
    parser.add_argument("--calibration-data", type=str, default=None)

    args = parser.parse_args()
    convert_to_tflite(args.model, args.output, args.quantize, args.calibration_data)
