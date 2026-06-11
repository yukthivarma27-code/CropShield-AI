# AgriVision AI

**Offline-First Multilingual Crop Disease Detection and Recommendation System**

AgriVision AI is a production-ready software prototype designed to assist farmers in detecting crop diseases from leaf images instantly. It automatically provides localized treatment recommendations, pesticide dosages, organic remedies, preventive measures, and weather-based advisories.

The system is designed with an offline-first architecture to remain functional in remote, low-connectivity rural agricultural areas.

---

## Key Features

- **Leaf Disease Classification**: Supports 9 crops (Tomato, Potato, Rice, Maize, Wheat, Cotton, Banana, Mango, Chili) and 10 disease categories.
- **Explainable AI**: Integrated GradCAM heatmaps to highlight visual cues on infected leaf spots.
- **Offline-First Synchronization**: Client-side Dexie IndexedDB cache to store diagnoses offline and auto-sync when network connectivity returns.
- **Multilingual UI & Voice**: Full translation and voice syntheses for English, Telugu, Hindi, Tamil, and Kannada.
- **Agricultural advisories**: OpenWeatherMap integration displaying real-time temperature, humidity warnings, and delayed spray advisories.

---

## Tech Stack

- **Machine Learning**: TensorFlow/Keras, EfficientNetB3, TensorFlow Lite, ONNX
- **Backend**: FastAPI, Python, SQLite/PostgreSQL
- **Frontend**: React, Tailwind CSS, TypeScript, Dexie.js (Offline Cache)
- **DevOps**: Docker, Docker-compose, GitHub Actions

---

## Quick Start

### 1. Local Development Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
The API documentation will be available at `http://localhost:8000/docs`.

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

### 2. Docker Setup
Build and run the entire stack (PostgreSQL + FastAPI + Nginx Frontend) with Docker Compose:
```bash
docker-compose up --build
```
- Frontend: `http://localhost`
- Backend API: `http://localhost:8000`

---

## Offline Caching Architecture
When a farmer scans a leaf in a field without internet connection:
1. The app detects offline status via ping checks.
2. The UI falls back to simulated offline models to avoid interface lockups.
3. The recommendation is pulled from the local Dexie.js (IndexedDB) database if previously cached.
4. The prediction is queued in the local `syncQueue` table.
5. The background worker (`syncService.ts`) monitors connection and uploads queued actions automatically when online state is restored.
