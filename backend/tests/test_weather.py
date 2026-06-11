import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_weather_endpoint_success():
    response = client.get("/weather?state=Telangana&district=Hyderabad")
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "Telangana"
    assert data["district"] == "Hyderabad"
    assert "temperature" in data
    assert "humidity" in data
    assert "advisory" in data


def test_weather_endpoint_missing_params():
    response = client.get("/weather?state=Telangana")
    assert response.status_code == 422  # validation error for missing query param
