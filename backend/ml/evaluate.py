"""
AgriVision AI — Model Evaluation
==================================
Comprehensive evaluation with confusion matrix, classification report,
and per-class metrics.

Usage:
  python -m ml.evaluate --model ./ml/models/best_model.keras --data ./data
"""

import os
import json
import argparse
import numpy as np
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from sklearn.metrics import classification_report, confusion_matrix


def evaluate_model(model_path: str, data_dir: str, batch_size: int = 32) -> dict:
    """Evaluate model on test set and generate metrics."""

    print("═" * 60)
    print("  AgriVision AI — Model Evaluation")
    print("═" * 60)

    # Load model
    print("\n[1/3] Loading model...")
    model = keras.models.load_model(model_path)

    # Load test data
    print("[2/3] Loading test data...")
    test_dir = Path(data_dir) / "test"
    test_ds = keras.utils.image_dataset_from_directory(
        str(test_dir),
        image_size=(224, 224),
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=False,
    )
    class_names = test_ds.class_names

    # Normalize
    normalization = tf.keras.layers.Rescaling(1.0 / 255)
    test_ds = test_ds.map(lambda x, y: (normalization(x), y))

    # Predict
    print("[3/3] Running predictions...")
    y_true = []
    y_pred = []

    for images, labels in test_ds:
        predictions = model.predict(images, verbose=0)
        y_true.extend(np.argmax(labels.numpy(), axis=1))
        y_pred.extend(np.argmax(predictions, axis=1))

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    # Classification report
    report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
    report_text = classification_report(y_true, y_pred, target_names=class_names)

    print("\n" + "─" * 60)
    print("Classification Report:")
    print("─" * 60)
    print(report_text)

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    print("\nConfusion Matrix:")
    print(cm)

    # Overall metrics
    accuracy = np.mean(y_true == y_pred)
    print(f"\nOverall Accuracy: {accuracy:.4f}")

    results = {
        "accuracy": float(accuracy),
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
    }

    # Save results
    output_path = Path(model_path).parent / "evaluation_results.json"
    save_results = {k: v for k, v in results.items()}
    with open(output_path, "w") as f:
        json.dump(save_results, f, indent=2)

    print(f"\n[✓] Results saved to {output_path}")
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate trained model")
    parser.add_argument("--model", type=str, required=True, help="Path to model")
    parser.add_argument("--data", type=str, required=True, help="Path to dataset")
    parser.add_argument("--batch-size", type=int, default=32)

    args = parser.parse_args()
    evaluate_model(args.model, args.data, args.batch_size)
