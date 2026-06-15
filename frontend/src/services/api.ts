import { PredictionResult, Recommendation, WeatherAlert, WeatherData } from '../types';
import * as offlineDb from './offlineDb';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function checkOnlineStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/predict/classes`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function predictCropDisease(
  fileOrBase64: File | string,
  crop?: string,
  state?: string,
  district?: string
): Promise<PredictionResult> {
  if (typeof fileOrBase64 === 'string') {
    console.log("PREDICT INPUT: base64 string, length=" + fileOrBase64.length);
  } else {
    console.log("PREDICT INPUT:", { name: fileOrBase64.name, type: fileOrBase64.type, size: fileOrBase64.size });
  }
  const formData = new FormData();
  if (typeof fileOrBase64 === 'string') {
    formData.append('image_base64', fileOrBase64);
  } else {
    formData.append('file', fileOrBase64);
  }

  if (crop) formData.append('crop', crop);
  if (state) formData.append('state', state);
  if (district) formData.append('district', district);

  try {
    const res = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let detail = 'Prediction API failed';
      try {
        const errBody = await res.json();
        if (errBody.detail) detail = errBody.detail;
      } catch {}
      throw new Error(detail);
    }

    const result = await res.json();
    const fullResult = {
      ...result,
      image_url: result.image_url ? `${API_BASE_URL}${result.image_url}` : '',
    };
    console.log("PREDICTION RESULT:", { result_image_url: result.image_url, fullResult_image_url: fullResult.image_url, API_BASE_URL });

    await offlineDb.saveOfflinePrediction(fullResult);

    try {
      const rec = await getRecommendation(fullResult.disease, crop, state, district);
      await offlineDb.cacheRecommendation(rec);
    } catch (err) {
      console.error('Failed to pre-cache recommendations:', err);
    }

    return fullResult;
  } catch (err) {
    // Network error — fall back to offline mock
    console.warn('Prediction API failed, using offline fallback:', err);
    const mockResult = generateOfflineMockResult(crop);
    await offlineDb.saveOfflinePrediction(mockResult);
    await offlineDb.queueOfflineAction('predict', {
      crop,
      state,
      district,
      image_base64: typeof fileOrBase64 === 'string' ? fileOrBase64 : null,
      timestamp: Date.now()
    });
    return { ...mockResult, offline: true };
  }
}

export async function getRecommendation(
  disease: string,
  crop?: string,
  state?: string,
  district?: string
): Promise<Recommendation> {
  const isOnline = await checkOnlineStatus();

  if (!isOnline) {
    const cached = await offlineDb.getCachedRecommendation(disease);
    if (cached) return cached;
    return generateOfflineMockRecommendation(disease, crop);
  }

  let url = `${API_BASE_URL}/recommendation?disease=${encodeURIComponent(disease)}`;
  if (crop) url += `&crop=${encodeURIComponent(crop)}`;
  if (state) url += `&state=${encodeURIComponent(state)}`;
  if (district) url += `&district=${encodeURIComponent(district)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Recommendation API failed');

  const data = await res.json();
  await offlineDb.cacheRecommendation(data);
  return data;
}

export async function getWeatherInfo(state: string, district: string): Promise<WeatherData> {
  const isOnline = await checkOnlineStatus();

  if (!isOnline) {
    const cached = await offlineDb.getCachedWeather(state, district);
    if (cached) return cached;
    return generateOfflineMockWeather(state, district);
  }

  const res = await fetch(`${API_BASE_URL}/weather?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
  if (!res.ok) throw new Error('Weather API failed');

  const data = await res.json();
  await offlineDb.cacheWeather(state, district, data);
  return data;
}

// ── GPS‑Based Weather (Open‑Meteo + Nominatim) ──────────────────────────────

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; state: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CropShield-AI/1.0' },
  });
  if (!res.ok) return { city: '', state: '' };
  const data = await res.json();
  const addr = data.address || {};
  const city = addr.city || addr.town || addr.village || addr.county || '';
  const state = addr.state || '';
  return { city, state };
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'depositing rime fog',
  51: 'light drizzle', 53: 'moderate drizzle', 55: 'dense drizzle',
  56: 'light freezing drizzle', 57: 'dense freezing drizzle',
  61: 'slight rain', 63: 'moderate rain', 65: 'heavy rain',
  66: 'light freezing rain', 67: 'heavy freezing rain',
  71: 'slight snow', 73: 'moderate snow', 75: 'heavy snow',
  80: 'slight rain showers', 81: 'moderate rain showers', 82: 'violent rain showers',
  95: 'thunderstorm', 96: 'thunderstorm with slight hail', 99: 'thunderstorm with heavy hail',
};

export async function getWeatherByGPS(
  fallbackState: string,
  fallbackDistrict: string,
): Promise<WeatherData> {
  let pos: GeolocationPosition;
  try {
    pos = await getCurrentPosition();
  } catch {
    // GPS denied or failed — fall back to settings-based weather
    return getWeatherInfo(fallbackState, fallbackDistrict);
  }

  const { latitude, longitude } = pos.coords;
  const gpsId = `gps_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

  // Check cache for GPS coords
  const cached = await offlineDb.db.weatherCache.get(gpsId);
  if (cached) {
    const age = Date.now() - new Date(cached.recorded_at).getTime();
    if (age < 15 * 60 * 1000) return { ...cached, cached: true };
    await offlineDb.db.weatherCache.delete(gpsId);
  }

  const isOnline = await checkOnlineStatus();
  if (!isOnline) {
    const { city, state } = await reverseGeocode(latitude, longitude);
    return generateOfflineMockWeather(state || fallbackState, city || fallbackDistrict);
  }

  // Fetch from Open-Meteo directly
  const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code&timezone=auto`;
  const omRes = await fetch(omUrl);
  const omData = await omRes.json();
  const current = omData.current || {};
  const wmoCode = current.weather_code ?? 0;

  // Reverse geocode for location names (best-effort)
  const { city, state } = await reverseGeocode(latitude, longitude);

  const weather: WeatherData = {
    state: state || fallbackState,
    district: city || fallbackDistrict,
    temperature: Math.round(current.temperature_2m ?? 28),
    humidity: current.relative_humidity_2m ?? 70,
    rain_probability: Math.round((current.precipitation ?? 0) * 10),
    wind_speed: Math.round((current.wind_speed_10m ?? 5) * 10) / 10,
    description: WMO_DESCRIPTIONS[wmoCode] || 'unknown',
    advisory: '',
    alerts: [],
    recorded_at: new Date().toISOString(),
  };

  // Generate advisory client-side (same logic as backend)
  weather.advisory = generateWeatherAdvisory(weather);
  weather.alerts = generateWeatherAlerts(weather);

  // Cache under GPS coords key
  offlineDb.db.weatherCache.put({ ...weather, id: gpsId });
  return weather;
}

function generateWeatherAdvisory(w: WeatherData): string {
  const parts: string[] = [];
  if (w.humidity > 80) parts.push('High humidity detected. Monitor crops closely for fungal diseases like Late Blight and Powdery Mildew.');
  else if (w.humidity > 60) parts.push('Moderate to high humidity. Ensure proper ventilation and plant spacing.');
  if (w.rain_probability > 60) parts.push('Rain expected within 24 hours. Delay pesticide spraying to avoid wash-off.');
  else if (w.rain_probability > 30) parts.push('Moderate chance of rain. Consider completing spray applications early in the day.');
  if (w.temperature > 35) parts.push('High temperature alert. Increase irrigation frequency. Avoid spraying sulfur-based fungicides.');
  else if (w.temperature < 15) parts.push('Low temperature. Watch for frost damage on sensitive crops.');
  if (w.wind_speed > 10) parts.push('Windy conditions. Avoid spraying pesticides to prevent drift.');
  return parts.length ? parts.join(' ') : 'Weather conditions are favorable for agricultural activities.';
}

function generateWeatherAlerts(w: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  if (w.humidity > 85) alerts.push({ type: 'warning', message: 'High humidity may promote fungal growth. Inspect crops daily.' });
  if (w.rain_probability > 70) alerts.push({ type: 'caution', message: 'Rain expected within 24 hours. Delay pesticide spraying.' });
  if (w.temperature > 38) alerts.push({ type: 'warning', message: 'Extreme heat. Ensure adequate irrigation and shade for sensitive crops.' });
  if (w.wind_speed > 12) alerts.push({ type: 'info', message: 'Strong winds. Secure crop support structures.' });
  return alerts;
}

export async function getTTSAudio(text: string, lang = 'en'): Promise<string> {
  const isOnline = await checkOnlineStatus();
  if (!isOnline) return ''; // No TTS offline unless browser synthesis is used

  try {
    const res = await fetch(`${API_BASE_URL}/voice/tts?text=${encodeURIComponent(text)}&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      return data.audio;
    }
  } catch (err) {
    console.error('TTS API error:', err);
  }
  return '';
}

// ── Mock Fallbacks for Offline ──────────────────────────────────────────────
function generateOfflineMockResult(crop = 'tomato'): PredictionResult {
  const diseases = ['Early Blight', 'Late Blight', 'Bacterial Spot', 'Leaf Mold', 'Powdery Mildew', 'Rust'];
  const disease = diseases[Math.floor(Math.random() * diseases.length)];
  const confidence = 0.75 + Math.random() * 0.2;
  const severityPercentage = Math.floor(20 + Math.random() * 65);
  const severity = severityPercentage <= 30 ? 'Low' : severityPercentage <= 70 ? 'Medium' : 'High';

  return {
    crop,
    disease,
    confidence,
    severity,
    severity_percentage: severityPercentage,
    top_3_predictions: [
      { disease, confidence },
      { disease: 'Healthy', confidence: (1 - confidence) * 0.6 },
      { disease: 'Powdery Mildew', confidence: (1 - confidence) * 0.4 }
    ],
    symptoms: 'Yellow spots with dark brown margins on leaves. Target-like concentric rings.',
    description: 'Fungal infection caused by Alternaria species. Common in warm, humid weather.',
    image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500',
    created_at: new Date().toISOString()
  };
}

function generateOfflineMockRecommendation(disease: string, crop = 'tomato'): Recommendation {
  return {
    disease,
    crop,
    chemical_treatments: [
      {
        name: 'Mancozeb 75% WP',
        active_ingredient: 'Mancozeb',
        dosage: '2.5g per Litre',
        spray_interval: '7-10 days',
        precautions: 'Wear protective gear. Do not spray in strong winds.'
      }
    ],
    organic_remedies: [
      {
        name: 'Neem Oil Spray',
        preparation: 'Mix 5ml neem oil + 2ml liquid soap in 1L water',
        application: 'Spray thoroughly on leaves early morning',
        frequency: 'Every 5 days'
      }
    ],
    preventive_measures: [
      'Practice crop rotation',
      'Ensure proper ventilation between crops',
      'Remove and destroy infected plant debris'
    ],
    weather_advisory: 'Offline mode: Keep crop area dry if humidity is high.'
  };
}

function generateOfflineMockWeather(state: string, district: string): WeatherData {
  return {
    state,
    district,
    temperature: 28.5,
    humidity: 72,
    rain_probability: 20,
    wind_speed: 8.5,
    description: 'partly cloudy (cached offline)',
    advisory: 'Offline Advisory: Balanced irrigation is recommended under cloud cover.',
    alerts: [],
    recorded_at: new Date().toISOString()
  };
}
