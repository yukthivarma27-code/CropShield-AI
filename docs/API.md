# AgriVision AI API Documentation

Centralized HTTP REST endpoints exposed by the FastAPI server.

---

## Endpoints

### 1. Disease Detection
- **URL**: `/predict`
- **Method**: `POST`
- **Body** (Form Data):
  - `file`: Image file (optional)
  - `image_base64`: Base64 encoded JPEG/PNG image string (optional)
  - `crop`: Crop type name (optional)
  - `state`: Indian state name (optional)
  - `district`: District name (optional)
- **Response**:
```json
{
  "id": 1,
  "crop": "tomato",
  "disease": "Early Blight",
  "confidence": 0.8952,
  "severity": "Medium",
  "severity_percentage": 45.5,
  "top_3_predictions": [
    { "disease": "Early Blight", "confidence": 0.8952 },
    { "disease": "Late Blight", "confidence": 0.0811 },
    { "disease": "Healthy", "confidence": 0.0237 }
  ],
  "symptoms": "Dark brown to black concentric rings on older leaves.",
  "description": "Fungal infection caused by Alternaria solani.",
  "gradcam_url": null,
  "image_url": "/uploads/example.jpg",
  "created_at": "2026-06-11T12:00:00"
}
```

---

### 2. Treatment Details
- **URL**: `/treatment`
- **Method**: `GET`
- **Query Parameters**:
  - `disease`: Disease name (required)
  - `crop`: Crop name (optional)
- **Response**:
```json
{
  "disease": "Early Blight",
  "crop": "tomato",
  "chemical_treatments": [
    {
      "name": "Mancozeb 75% WP",
      "active_ingredient": "Mancozeb",
      "dosage": "2.5 g per litre",
      "spray_interval": "Every 7-10 days",
      "precautions": "Wear protective mask."
    }
  ],
  "organic_remedies": [
    {
      "name": "Neem Oil Spray",
      "preparation": "Mix 5 ml neem oil in 1 L water",
      "application": "Spray early mornings",
      "frequency": "Every 5 days"
    }
  ],
  "preventive_measures": [
    "Practice 3-year crop rotation",
    "Avoid overhead irrigation"
  ]
}
```

---

### 3. Weather Advisories
- **URL**: `/weather`
- **Method**: `GET`
- **Query Parameters**:
  - `state`: State name (required)
  - `district`: District name (required)
- **Response**:
```json
{
  "state": "Telangana",
  "district": "Hyderabad",
  "temperature": 29.4,
  "humidity": 82.0,
  "rain_probability": 75.0,
  "wind_speed": 5.2,
  "description": "light rain",
  "advisory": "High humidity may promote fungal growth. Rain expected within 24 hours. Delay pesticide spraying.",
  "alerts": [
    { "type": "warning", "message": "High humidity may promote fungal growth." },
    { "type": "caution", "message": "Rain expected within 24 hours. Delay pesticide spraying." }
  ],
  "recorded_at": "2026-06-11T12:00:00"
}
```

---

### 4. Speech Synthesis
- **URL**: `/voice/tts`
- **Method**: `GET`
- **Query Parameters**:
  - `text`: Text to read (required)
  - `lang`: Language code (default `en`)
- **Response**:
```json
{
  "text": "Crop is healthy",
  "language": "en",
  "audio": "data:audio/mp3;base64,SUQzBAAAAAAA..."
}
```
