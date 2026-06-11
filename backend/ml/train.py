"""
AgriVision AI — Model Training (EfficientNetB3)
=================================================
Transfer learning with EfficientNetB3 for multi-class crop disease classification.

Features:
  - EfficientNetB3 backbone with ImageNet weights
  - Custom classification head
  - Data augmentation
  - Class weight balancing
  - Learning rate scheduling
  - Early stopping and model checkpointing
  - Training metrics logging

Usage:
  python -m ml.train --data ./data --epochs 50 --batch-size 32
"""

import os
import json
import argparse
import numpy as np
from pathlib import Path
from datetime import datetime

# Suppress TF warnings
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks, optimizers
from tensorflow.keras.applications import EfficientNetB3


# ── Constants ────────────────────────────────────────────────────────────────
IMG_SIZE = 224
NUM_CLASSES = 10
DISEASE_CLASSES = [
    "Anthracnose", "Bacterial Spot", "Bacterial Wilt", "Early Blight",
    "Healthy", "Late Blight", "Leaf Mold", "Mosaic Virus",
    "Powdery Mildew", "Rust"
]


def build_model(
    num_classes: int = NUM_CLASSES,
    img_size: int = IMG_SIZE,
    dropout_rate: float = 0.4,
    fine_tune_from: int = -20,
) -> keras.Model:
    """
    Build EfficientNetB3 model with custom classification head.

    Architecture:
      - Data augmentation layers
      - EfficientNetB3 backbone (pretrained on ImageNet)
      - Global Average Pooling
      - Dense 512 → BatchNorm → Dropout
      - Dense 256 → BatchNorm → Dropout
      - Output Dense (softmax)

    Args:
        num_classes: Number of output classes
        img_size: Input image size (square)
        dropout_rate: Dropout rate for regularization
        fine_tune_from: Number of layers from end to fine-tune (negative)

    Returns:
        Compiled Keras model
    """
    # ── Data Augmentation ──
    data_augmentation = keras.Sequential([
        layers.RandomFlip("horizontal_and_vertical"),
        layers.RandomRotation(0.3),
        layers.RandomZoom(0.2),
        layers.RandomBrightness(0.2),
        layers.RandomContrast(0.2),
    ], name="data_augmentation")

    # ── Input ──
    inputs = keras.Input(shape=(img_size, img_size, 3), name="input_image")

    # ── Augmentation (only during training) ──
    x = data_augmentation(inputs)

    # ── Base Model: EfficientNetB3 ──
    base_model = EfficientNetB3(
        include_top=False,
        weights="imagenet",
        input_shape=(img_size, img_size, 3),
    )

    # Freeze base model initially
    base_model.trainable = False

    x = base_model(x, training=False)

    # ── Classification Head ──
    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)

    x = layers.Dense(512, name="fc_512")(x)
    x = layers.BatchNormalization(name="bn_512")(x)
    x = layers.Activation("relu", name="relu_512")(x)
    x = layers.Dropout(dropout_rate, name="drop_512")(x)

    x = layers.Dense(256, name="fc_256")(x)
    x = layers.BatchNormalization(name="bn_256")(x)
    x = layers.Activation("relu", name="relu_256")(x)
    x = layers.Dropout(dropout_rate * 0.75, name="drop_256")(x)

    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = keras.Model(inputs=inputs, outputs=outputs, name="AgriVision_EfficientNetB3")

    # ── Compile ──
    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy", keras.metrics.TopKCategoricalAccuracy(k=3, name="top3_accuracy")],
    )

    return model, base_model


def create_data_generators(
    data_dir: str,
    batch_size: int = 32,
    img_size: int = IMG_SIZE,
):
    """
    Create train/val/test data generators using tf.keras.utils.image_dataset_from_directory.

    Returns:
        (train_ds, val_ds, test_ds, class_names)
    """
    train_dir = Path(data_dir) / "train"
    val_dir = Path(data_dir) / "val"
    test_dir = Path(data_dir) / "test"

    train_ds = keras.utils.image_dataset_from_directory(
        str(train_dir),
        image_size=(img_size, img_size),
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=True,
        seed=42,
    )

    val_ds = keras.utils.image_dataset_from_directory(
        str(val_dir),
        image_size=(img_size, img_size),
        batch_size=batch_size,
        label_mode="categorical",
        shuffle=False,
    )

    test_ds = None
    if test_dir.exists():
        test_ds = keras.utils.image_dataset_from_directory(
            str(test_dir),
            image_size=(img_size, img_size),
            batch_size=batch_size,
            label_mode="categorical",
            shuffle=False,
        )

    class_names = train_ds.class_names

    # Normalize pixel values to [0, 1]
    normalization = layers.Rescaling(1.0 / 255)
    train_ds = train_ds.map(lambda x, y: (normalization(x), y))
    val_ds = val_ds.map(lambda x, y: (normalization(x), y))
    if test_ds:
        test_ds = test_ds.map(lambda x, y: (normalization(x), y))

    # Performance optimization
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.prefetch(buffer_size=AUTOTUNE)
    if test_ds:
        test_ds = test_ds.prefetch(buffer_size=AUTOTUNE)

    return train_ds, val_ds, test_ds, class_names


def compute_class_weights(data_dir: str) -> dict:
    """Compute class weights to handle imbalanced datasets."""
    from sklearn.utils.class_weight import compute_class_weight

    train_dir = Path(data_dir) / "train"
    class_counts = {}

    for class_dir in sorted(train_dir.iterdir()):
        if class_dir.is_dir():
            count = len(list(class_dir.glob("*.*")))
            class_counts[class_dir.name] = count

    labels = []
    for i, (name, count) in enumerate(sorted(class_counts.items())):
        labels.extend([i] * count)

    labels = np.array(labels)
    unique_classes = np.unique(labels)

    weights = compute_class_weight("balanced", classes=unique_classes, y=labels)
    return {i: w for i, w in enumerate(weights)}


def get_callbacks(output_dir: str, patience: int = 10) -> list:
    """Create training callbacks."""
    cb_dir = Path(output_dir)
    cb_dir.mkdir(parents=True, exist_ok=True)

    return [
        # Early stopping
        callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=patience,
            restore_best_weights=True,
            verbose=1,
        ),

        # Model checkpoint
        callbacks.ModelCheckpoint(
            filepath=str(cb_dir / "best_model.keras"),
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),

        # Learning rate reduction
        callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1,
        ),

        # TensorBoard logging
        callbacks.TensorBoard(
            log_dir=str(cb_dir / "logs" / datetime.now().strftime("%Y%m%d-%H%M%S")),
            histogram_freq=1,
        ),

        # CSV logging
        callbacks.CSVLogger(str(cb_dir / "training_log.csv")),
    ]


def train(
    data_dir: str,
    output_dir: str = "./ml/models",
    epochs: int = 50,
    batch_size: int = 32,
    fine_tune_epochs: int = 20,
    fine_tune_lr: float = 1e-5,
) -> dict:
    """
    Full training pipeline:
      1. Train classification head with frozen backbone
      2. Fine-tune last N layers of backbone

    Args:
        data_dir: Path to split dataset
        output_dir: Path to save models
        epochs: Initial training epochs
        batch_size: Batch size
        fine_tune_epochs: Additional fine-tuning epochs
        fine_tune_lr: Learning rate for fine-tuning

    Returns:
        Training history and metrics
    """
    print("═" * 60)
    print("  AgriVision AI — Model Training")
    print("═" * 60)

    # ── Step 1: Create data generators ──
    print("\n[1/5] Loading dataset...")
    train_ds, val_ds, test_ds, class_names = create_data_generators(data_dir, batch_size)
    print(f"      Classes: {class_names}")

    # ── Step 2: Build model ──
    print("\n[2/5] Building EfficientNetB3 model...")
    model, base_model = build_model(num_classes=len(class_names))
    model.summary()

    # ── Step 3: Compute class weights ──
    print("\n[3/5] Computing class weights...")
    try:
        class_weights = compute_class_weights(data_dir)
        print(f"      Weights: {class_weights}")
    except Exception:
        class_weights = None
        print("      Using uniform weights (sklearn not available)")

    # ── Step 4: Phase 1 — Train classification head ──
    print(f"\n[4/5] Phase 1: Training classification head ({epochs} epochs)...")
    cb = get_callbacks(output_dir)

    history1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        class_weight=class_weights,
        callbacks=cb,
    )

    # ── Step 5: Phase 2 — Fine-tune backbone ──
    print(f"\n[5/5] Phase 2: Fine-tuning backbone ({fine_tune_epochs} epochs)...")

    # Unfreeze last 20 layers
    base_model.trainable = True
    for layer in base_model.layers[:-20]:
        layer.trainable = False

    # Recompile with lower learning rate
    model.compile(
        optimizer=optimizers.Adam(learning_rate=fine_tune_lr),
        loss="categorical_crossentropy",
        metrics=["accuracy", keras.metrics.TopKCategoricalAccuracy(k=3, name="top3_accuracy")],
    )

    total_epochs = epochs + fine_tune_epochs
    history2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=total_epochs,
        initial_epoch=len(history1.history["loss"]),
        class_weight=class_weights,
        callbacks=get_callbacks(output_dir, patience=15),
    )

    # ── Save final model ──
    final_path = Path(output_dir) / "efficientnet_b3_crop_disease.keras"
    model.save(str(final_path))
    print(f"\n[✓] Model saved to {final_path}")

    # Save H5 format too
    h5_path = Path(output_dir) / "efficientnet_b3_crop_disease.h5"
    model.save(str(h5_path))

    # ── Save class labels ──
    labels_path = Path(output_dir) / "class_labels.json"
    with open(labels_path, "w") as f:
        json.dump({i: name for i, name in enumerate(class_names)}, f, indent=2)

    # ── Evaluate on test set ──
    results = {}
    if test_ds:
        print("\n[✓] Evaluating on test set...")
        test_metrics = model.evaluate(test_ds)
        results = {
            "test_loss": float(test_metrics[0]),
            "test_accuracy": float(test_metrics[1]),
            "test_top3_accuracy": float(test_metrics[2]),
        }
        print(f"    Test Accuracy: {results['test_accuracy']:.4f}")
        print(f"    Top-3 Accuracy: {results['test_top3_accuracy']:.4f}")

    # ── Save training metadata ──
    metadata = {
        "model_name": "EfficientNetB3",
        "num_classes": len(class_names),
        "class_names": class_names,
        "img_size": IMG_SIZE,
        "initial_epochs": epochs,
        "fine_tune_epochs": fine_tune_epochs,
        "batch_size": batch_size,
        "trained_at": datetime.now().isoformat(),
        **results,
    }

    with open(Path(output_dir) / "training_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "═" * 60)
    print("  Training Complete!")
    print("═" * 60)

    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train EfficientNetB3 model")
    parser.add_argument("--data", type=str, required=True, help="Path to split dataset")
    parser.add_argument("--output", type=str, default="./ml/models", help="Output directory")
    parser.add_argument("--epochs", type=int, default=50, help="Initial training epochs")
    parser.add_argument("--fine-tune-epochs", type=int, default=20, help="Fine-tuning epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--fine-tune-lr", type=float, default=1e-5, help="Fine-tuning LR")

    args = parser.parse_args()
    train(args.data, args.output, args.epochs, args.batch_size, args.fine_tune_epochs, args.fine_tune_lr)
