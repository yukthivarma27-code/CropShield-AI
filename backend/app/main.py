"""
AgriVision AI — FastAPI Application Main Entry Point
======================================================
Combines all routers, sets up middleware, exception handlers,
and configures application startup and shutdown lifecycles.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, close_db
from app.services.ml_service import ml_service
from app.routers import (
    predict,
    treatment,
    history,
    weather,
    recommendation,
    severity,
    translate,
    voice,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    # Ensure directories exist
    for directory in [settings.UPLOAD_DIR, settings.GRADCAM_DIR, settings.REPORTS_DIR]:
        path = Path(settings.base_dir) / directory
        path.mkdir(parents=True, exist_ok=True)

    # Initialize Database
    try:
        await init_db()
        print("[✓] Database initialized.")
    except Exception as e:
        print(f"[!] Database initialization failed: {e}")

    # Load ML Model
    await ml_service.load_model()

    yield

    # Shutdown
    await close_db()
    print("[✓] Application shutdown complete.")


app = FastAPI(
    title="AgriVision AI Backend",
    description="Offline-First Multilingual Crop Disease Detection and Recommendation System Backend API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Files ─────────────────────────────────────────────────────────────
# Create upload directories inside the app base dir to serve images
upload_path = Path(settings.base_dir) / settings.UPLOAD_DIR
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


# ── Global Exception Handlers ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler to avoid raw traceback leaks."""
    print(f"[ERROR] Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ── Include Routers ──────────────────────────────────────────────────────────
app.include_router(predict.router)
app.include_router(treatment.router)
app.include_router(history.router)
app.include_router(weather.router)
app.include_router(recommendation.router)
app.include_router(severity.router)
app.include_router(translate.router)
app.include_router(voice.router)


@app.get("/")
async def root():
    """Root check endpoint."""
    return {
        "status": "healthy",
        "app": "AgriVision AI Backend",
        "environment": settings.APP_ENV,
        "supported_languages": ["en", "te", "hi", "ta", "kn"],
        "supported_crops": ["tomato", "potato", "rice", "maize", "wheat", "cotton", "banana", "mango", "chili"]
    }
