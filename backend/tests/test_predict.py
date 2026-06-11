import pytest
from fastapi.testclient import TestClient
import numpy as np
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_predict_classes():
    response = client.get("/predict/classes")
    assert response.status_code == 200
    data = response.json()
    assert "disease_classes" in data
    assert "supported_crops" in data


def test_predict_no_image():
    response = client.post("/predict")
    # should fail with 400 when no image file/base64 is sent
    assert response.status_code == 400
