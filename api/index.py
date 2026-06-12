import sys
import os
from pathlib import Path

# Add backend directory to Python path so all `from app.xxx` imports work
backend_dir = str(Path(__file__).parent / 'backend')
sys.path.insert(0, backend_dir)

# Override storage dirs for Vercel's ephemeral serverless filesystem
os.environ.setdefault('UPLOAD_DIR', '/tmp/uploads')
os.environ.setdefault('GRADCAM_DIR', '/tmp/gradcam_outputs')
os.environ.setdefault('REPORTS_DIR', '/tmp/reports')
os.environ.setdefault('APP_ENV', 'production')
os.environ.setdefault('DEBUG', 'False')

# Create temp directories
for d in ['/tmp/uploads', '/tmp/gradcam_outputs', '/tmp/reports']:
    os.makedirs(d, exist_ok=True)

# Load ML model on cold start (uses numpy-based FeatureModel, no TensorFlow needed)
from app.services.ml_service import ml_service
import asyncio
try:
    asyncio.run(ml_service.load_model())
except Exception as e:
    print(f"[!] Model load failed (non-fatal, mock mode will be used): {e}")

from app.main import app
from mangum import Mangum

handler = Mangum(app, lifespan="off")
