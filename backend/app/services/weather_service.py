"""
AgriVision AI — Weather Service
=================================
OpenWeatherMap integration with agricultural advisories.
Falls back to mock data when API key is unavailable.
"""

import httpx
from datetime import datetime
from typing import Dict, List, Optional

from app.config import settings


# City coordinates for districts
DISTRICT_COORDS = {
    "Hyderabad": (17.3850, 78.4867), "Warangal": (17.9784, 79.5941),
    "Visakhapatnam": (17.6868, 83.2185), "Vijayawada": (16.5062, 80.6480),
    "Bengaluru": (12.9716, 77.5946), "Mysuru": (12.2958, 76.6394),
    "Chennai": (13.0827, 80.2707), "Coimbatore": (11.0168, 76.9558),
    "Mumbai": (19.0760, 72.8777), "Pune": (18.5204, 73.8567),
    "Guntur": (16.3067, 80.4365), "Nellore": (14.4426, 79.9865),
    "Nagpur": (21.1458, 79.0882), "Nashik": (19.9975, 73.7898),
}


async def get_weather(state: str, district: str) -> Dict:
    """Fetch weather data for a location."""
    if settings.OPENWEATHER_API_KEY and settings.OPENWEATHER_API_KEY != "your_api_key_here":
        return await _fetch_live_weather(district)
    return _mock_weather(state, district)


async def _fetch_live_weather(district: str) -> Dict:
    """Fetch real weather data from OpenWeatherMap API."""
    coords = DISTRICT_COORDS.get(district)
    if not coords:
        return _mock_weather("", district)

    lat, lon = coords
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={settings.OPENWEATHER_API_KEY}&units=metric"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10)
            data = resp.json()

        weather = {
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "wind_speed": data.get("wind", {}).get("speed", 0),
            "description": data["weather"][0]["description"],
            "rain_probability": data.get("rain", {}).get("1h", 0) * 10,
        }

        weather["advisory"] = _generate_advisory(weather)
        weather["alerts"] = _generate_alerts(weather)
        return weather

    except Exception as e:
        print(f"[!] Weather API error: {e}")
        return _mock_weather("", district)


def _mock_weather(state: str, district: str) -> Dict:
    """Generate realistic mock weather data."""
    import random
    random.seed(hash(f"{state}{district}{datetime.now().strftime('%Y%m%d')}"))

    weather = {
        "temperature": round(random.uniform(22, 38), 1),
        "humidity": round(random.uniform(40, 95), 1),
        "wind_speed": round(random.uniform(2, 15), 1),
        "description": random.choice(["partly cloudy", "clear sky", "light rain", "overcast clouds", "haze"]),
        "rain_probability": round(random.uniform(0, 80), 1),
    }

    weather["advisory"] = _generate_advisory(weather)
    weather["alerts"] = _generate_alerts(weather)
    return weather


def _generate_advisory(weather: Dict) -> str:
    """Generate agricultural advisory based on weather conditions."""
    advisories = []

    if weather["humidity"] > 80:
        advisories.append("High humidity detected. Monitor crops closely for fungal diseases like Late Blight and Powdery Mildew.")
    if weather["humidity"] > 60:
        advisories.append("Moderate to high humidity. Ensure proper ventilation and plant spacing.")

    if weather["rain_probability"] > 60:
        advisories.append("Rain expected within 24 hours. Delay pesticide spraying to avoid wash-off.")
    elif weather["rain_probability"] > 30:
        advisories.append("Moderate chance of rain. Consider completing spray applications early in the day.")

    if weather["temperature"] > 35:
        advisories.append("High temperature alert. Increase irrigation frequency. Avoid spraying sulfur-based fungicides.")
    elif weather["temperature"] < 15:
        advisories.append("Low temperature. Watch for frost damage on sensitive crops.")

    if weather["wind_speed"] > 10:
        advisories.append("Windy conditions. Avoid spraying pesticides to prevent drift.")

    return " ".join(advisories) if advisories else "Weather conditions are favorable for agricultural activities."


def _generate_alerts(weather: Dict) -> List[Dict]:
    """Generate specific weather alerts."""
    alerts = []

    if weather["humidity"] > 85:
        alerts.append({"type": "warning", "message": "High humidity may promote fungal growth. Inspect crops daily."})
    if weather["rain_probability"] > 70:
        alerts.append({"type": "caution", "message": "Rain expected within 24 hours. Delay pesticide spraying."})
    if weather["temperature"] > 38:
        alerts.append({"type": "warning", "message": "Extreme heat. Ensure adequate irrigation and shade for sensitive crops."})
    if weather["wind_speed"] > 12:
        alerts.append({"type": "info", "message": "Strong winds. Secure crop support structures."})

    return alerts
