"""
AgriVision AI — Application Configuration
==========================================
Centralized settings using pydantic-settings for env var management.
"""

from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./agrivision.db"
    SQLITE_URL: str = "sqlite+aiosqlite:///./agrivision.db"

    # ── OpenWeatherMap ───────────────────────────────────
    OPENWEATHER_API_KEY: str = ""

    # ── Model Paths ──────────────────────────────────────
    MODEL_PATH: str = "ml/models/efficientnet_b3_crop_disease.h5"
    TFLITE_MODEL_PATH: str = "ml/models/crop_disease.tflite"
    USE_TFLITE: bool = False

    # ── File Storage ─────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    GRADCAM_DIR: str = "gradcam_outputs"
    REPORTS_DIR: str = "reports"

    # ── Derived ──────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parent.parent

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Singleton instance
settings = Settings()
