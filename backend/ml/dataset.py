"""
AgriVision AI — Dataset Preparation
=====================================
Scripts to download, organize, and split the PlantVillage dataset
for crop disease classification training.

Supported datasets:
  - PlantVillage (via Kaggle)
  - Rice Leaf Disease Dataset
  - Custom augmented dataset

Usage:
  python -m ml.dataset --download --split --output ./data
"""

import os
import shutil
import random
import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple


# ── Class Mapping ────────────────────────────────────────────────────────────
# Maps PlantVillage folder names to our unified (crop, disease) labels
PLANTVILLAGE_MAPPING: Dict[str, Tuple[str, str]] = {
    "Tomato___healthy": ("tomato", "Healthy"),
    "Tomato___Early_blight": ("tomato", "Early Blight"),
    "Tomato___Late_blight": ("tomato", "Late Blight"),
    "Tomato___Bacterial_spot": ("tomato", "Bacterial Spot"),
    "Tomato___Leaf_Mold": ("tomato", "Leaf Mold"),
    "Tomato___Tomato_mosaic_virus": ("tomato", "Mosaic Virus"),
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": ("tomato", "Mosaic Virus"),
    "Potato___healthy": ("potato", "Healthy"),
    "Potato___Early_blight": ("potato", "Early Blight"),
    "Potato___Late_blight": ("potato", "Late Blight"),
    "Corn_(maize)___healthy": ("maize", "Healthy"),
    "Corn_(maize)___Common_rust_": ("maize", "Rust"),
    "Corn_(maize)___Northern_Leaf_Blight": ("maize", "Early Blight"),
    "Pepper,_bell___healthy": ("chili", "Healthy"),
    "Pepper,_bell___Bacterial_spot": ("chili", "Bacterial Spot"),
}

# Our target disease classes
DISEASE_CLASSES = [
    "Healthy",
    "Early Blight",
    "Late Blight",
    "Bacterial Spot",
    "Leaf Mold",
    "Mosaic Virus",
    "Powdery Mildew",
    "Rust",
    "Anthracnose",
    "Bacterial Wilt",
]

# Supported crops
CROPS = ["tomato", "potato", "rice", "maize", "wheat", "cotton", "banana", "mango", "chili"]


def create_directory_structure(base_path: str) -> None:
    """Create organized directory structure for training data."""
    splits = ["train", "val", "test"]

    for split in splits:
        for disease in DISEASE_CLASSES:
            dir_path = Path(base_path) / split / disease.replace(" ", "_")
            dir_path.mkdir(parents=True, exist_ok=True)

    print(f"[✓] Created directory structure at {base_path}")
    print(f"    Splits: {splits}")
    print(f"    Classes: {len(DISEASE_CLASSES)}")


def organize_plantvillage(source_dir: str, output_dir: str) -> Dict[str, int]:
    """
    Organize PlantVillage dataset into our unified class structure.

    Args:
        source_dir: Path to extracted PlantVillage dataset
        output_dir: Path to output organized dataset

    Returns:
        Dictionary with class counts
    """
    source = Path(source_dir)
    output = Path(output_dir) / "all"
    output.mkdir(parents=True, exist_ok=True)

    class_counts = {d: 0 for d in DISEASE_CLASSES}

    for folder_name, (crop, disease) in PLANTVILLAGE_MAPPING.items():
        src_folder = source / folder_name
        if not src_folder.exists():
            print(f"  [!] Folder not found: {folder_name}")
            continue

        dst_folder = output / disease.replace(" ", "_")
        dst_folder.mkdir(parents=True, exist_ok=True)

        images = list(src_folder.glob("*.jpg")) + list(src_folder.glob("*.JPG")) + \
                 list(src_folder.glob("*.png")) + list(src_folder.glob("*.PNG"))

        for img in images:
            dst_name = f"{crop}_{img.name}"
            shutil.copy2(str(img), str(dst_folder / dst_name))
            class_counts[disease] += 1

        print(f"  [✓] {folder_name} → {disease}: {len(images)} images")

    return class_counts


def split_dataset(
    data_dir: str,
    output_dir: str,
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42,
) -> None:
    """
    Split organized dataset into train/val/test splits.

    Args:
        data_dir: Path to 'all' directory with organized images
        output_dir: Path to output split dataset
        train_ratio: Proportion for training (default 0.8)
        val_ratio: Proportion for validation (default 0.1)
        test_ratio: Proportion for testing (default 0.1)
        seed: Random seed for reproducibility
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, \
        "Ratios must sum to 1.0"

    random.seed(seed)
    source = Path(data_dir) / "all"
    output = Path(output_dir)

    # Create split directories
    create_directory_structure(str(output))

    split_info = {}

    for class_dir in sorted(source.iterdir()):
        if not class_dir.is_dir():
            continue

        class_name = class_dir.name
        images = list(class_dir.glob("*.*"))
        random.shuffle(images)

        n = len(images)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)

        train_imgs = images[:n_train]
        val_imgs = images[n_train:n_train + n_val]
        test_imgs = images[n_train + n_val:]

        # Copy to split directories
        for img in train_imgs:
            shutil.copy2(str(img), str(output / "train" / class_name / img.name))
        for img in val_imgs:
            shutil.copy2(str(img), str(output / "val" / class_name / img.name))
        for img in test_imgs:
            shutil.copy2(str(img), str(output / "test" / class_name / img.name))

        split_info[class_name] = {
            "total": n,
            "train": len(train_imgs),
            "val": len(val_imgs),
            "test": len(test_imgs),
        }

        print(f"  [✓] {class_name}: {len(train_imgs)} train / {len(val_imgs)} val / {len(test_imgs)} test")

    # Save split metadata
    metadata = {
        "seed": seed,
        "ratios": {"train": train_ratio, "val": val_ratio, "test": test_ratio},
        "classes": split_info,
        "total_classes": len(split_info),
    }

    with open(output / "split_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[✓] Dataset split complete. Metadata saved to split_metadata.json")


def generate_class_labels_file(output_dir: str) -> None:
    """Generate a class labels JSON file mapping index to class name."""
    labels = {i: name for i, name in enumerate(DISEASE_CLASSES)}
    labels_path = Path(output_dir) / "class_labels.json"

    with open(labels_path, "w") as f:
        json.dump(labels, f, indent=2)

    print(f"[✓] Class labels saved to {labels_path}")
    print(f"    {len(labels)} classes: {list(labels.values())}")


def create_dummy_dataset(output_dir: str, images_per_class: int = 50) -> None:
    """
    Create a small dummy dataset with synthetic images for testing.
    Useful when real dataset is not available.
    """
    import numpy as np
    from PIL import Image

    output = Path(output_dir)

    for split in ["train", "val", "test"]:
        n = images_per_class if split == "train" else images_per_class // 5
        for i, disease in enumerate(DISEASE_CLASSES):
            class_dir = output / split / disease.replace(" ", "_")
            class_dir.mkdir(parents=True, exist_ok=True)

            for j in range(n):
                # Create synthetic 224x224 image with class-specific color
                np.random.seed(i * 1000 + j)
                base_color = np.array([
                    (i * 25 + 50) % 256,
                    (i * 40 + 80) % 256,
                    (i * 15 + 30) % 256,
                ], dtype=np.uint8)
                noise = np.random.randint(0, 50, (224, 224, 3), dtype=np.uint8)
                img_array = np.clip(base_color + noise, 0, 255).astype(np.uint8)
                img = Image.fromarray(img_array)
                img.save(str(class_dir / f"dummy_{j:04d}.jpg"))

        print(f"  [✓] {split}: {n} images per class × {len(DISEASE_CLASSES)} classes")

    generate_class_labels_file(str(output))
    print(f"\n[✓] Dummy dataset created at {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriVision AI Dataset Preparation")
    parser.add_argument("--source", type=str, help="Path to raw PlantVillage dataset")
    parser.add_argument("--output", type=str, default="./data", help="Output directory")
    parser.add_argument("--organize", action="store_true", help="Organize PlantVillage data")
    parser.add_argument("--split", action="store_true", help="Split into train/val/test")
    parser.add_argument("--dummy", action="store_true", help="Create dummy dataset for testing")
    parser.add_argument("--train-ratio", type=float, default=0.8)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--test-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)

    args = parser.parse_args()

    if args.dummy:
        print("═" * 50)
        print("Creating dummy dataset for testing...")
        print("═" * 50)
        create_dummy_dataset(args.output)

    if args.organize and args.source:
        print("═" * 50)
        print("Organizing PlantVillage dataset...")
        print("═" * 50)
        organize_plantvillage(args.source, args.output)

    if args.split:
        print("═" * 50)
        print("Splitting dataset...")
        print("═" * 50)
        split_dataset(args.output, args.output,
                      args.train_ratio, args.val_ratio, args.test_ratio, args.seed)
