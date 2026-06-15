"""
AgriVision AI — Weather Service
=================================
Open-Meteo integration with agricultural advisories.
Falls back to mock data when the API call fails.
"""

import httpx
from datetime import datetime
from typing import Dict, List

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

# WMO weather code → English description
WMO_CODES = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "foggy", 48: "depositing rime fog",
    51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
    56: "light freezing drizzle", 57: "dense freezing drizzle",
    61: "slight rain", 63: "moderate rain", 65: "heavy rain",
    66: "light freezing rain", 67: "heavy freezing rain",
    71: "slight snow", 73: "moderate snow", 75: "heavy snow",
    77: "snow grains",
    80: "slight rain showers", 81: "moderate rain showers", 82: "violent rain showers",
    85: "slight snow showers", 86: "heavy snow showers",
    95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail",
}


async def get_weather(state: str, district: str) -> Dict:
    """Fetch weather data for a location using Open-Meteo."""
    coords = DISTRICT_COORDS.get(district)
    if not coords:
        return _mock_weather(state, district)
    return await _fetch_live_weather(*coords, state, district)


async def get_weather_by_coords(lat: float, lon: float) -> Dict:
    """Fetch weather data for GPS coordinates using Open-Meteo."""
    return await _fetch_live_weather(lat, lon, "", "")


async def _fetch_live_weather(lat: float, lon: float, state: str, district: str) -> Dict:
    """Fetch real weather data from Open-Meteo API."""
    url = (
        f"https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
        f"&timezone=auto"
    )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10)
            data = resp.json()

        current = data.get("current", {})
        weather_code = current.get("weather_code", 0)

        weather = {
            "temperature": round(current.get("temperature_2m", 28), 1),
            "humidity": current.get("relative_humidity_2m", 70),
            "wind_speed": round(current.get("wind_speed_10m", 5), 1),
            "description": WMO_CODES.get(weather_code, "unknown"),
            "rain_probability": round(current.get("precipitation", 0) * 10, 1),
        }

        weather["advisory"] = _generate_advisory(weather)
        weather["alerts"] = _generate_alerts(weather)
        return weather

    except Exception as e:
        print(f"[!] Open-Meteo API error: {e}")
        return _mock_weather(state, district)


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
