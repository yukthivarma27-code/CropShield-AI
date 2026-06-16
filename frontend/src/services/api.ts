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

// ── GPS‑Based Weather (WeatherAPI.com) ──────────────────────────────────────

const WEATHER_API_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 0,
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

export async function getWeatherByGPS(forceRefresh = false): Promise<WeatherData> {
  // 1. Fresh GPS coordinates
  const pos = await getCurrentPosition();
  const { latitude, longitude } = pos.coords;
  const gpsId = `gps_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  console.log('GPS', latitude, longitude);

  // 2. Check cache — skip if forceRefresh
  if (!forceRefresh) {
    const cached = await offlineDb.db.weatherCache.get(gpsId);
    if (cached) {
      const age = Date.now() - new Date(cached.recorded_at).getTime();
      if (age < 10 * 60 * 1000) {
        return { ...cached, cached: true };
      }
      await offlineDb.db.weatherCache.delete(gpsId);
    }
  }

  // 3. Fetch from WeatherAPI.com
  const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&days=1&aqi=no&alerts=no`;
  console.log('Weather API URL', apiUrl);

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`WeatherAPI HTTP ${res.status}`);

  const data = await res.json();
  console.log('WEATHER API RESPONSE', data);

  const current = data.current || {};
  const forecastDay = data.forecast?.forecastday?.[0]?.day || {};

  const temperature = current.temp_c ?? 0;
  const humidity = current.humidity ?? 0;
  const windSpeed = Math.round((current.wind_kph ?? 0) * 10) / 10;
  const description = current.condition?.text || 'unknown';
  const rainProbability = forecastDay.daily_chance_of_rain ?? 0;
  const lastUpdated = current.last_updated || new Date().toISOString();

  console.log('TEMP', temperature);
  console.log('HUMIDITY', humidity);
  console.log('RAIN', rainProbability);
  console.log('WIND', windSpeed);

  // 4. Reverse geocode for display names (best-effort)
  let city = '', state = '';
  try {
    const geo = await reverseGeocode(latitude, longitude);
    city = geo.city;
    state = geo.state;
  } catch { /* best-effort */ }

  const weather: WeatherData = {
    state: state || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    district: city || 'Current Location',
    temperature,
    humidity,
    rain_probability: rainProbability,
    wind_speed: windSpeed,
    description,
    advisory: '',
    alerts: [],
    recorded_at: lastUpdated,
    coordinates: { lat: latitude, lon: longitude },
    source: 'WeatherAPI.com',
  };

  weather.advisory = generateWeatherAdvisory(weather);
  weather.alerts = generateWeatherAlerts(weather);

  console.log('Location:', `${weather.district}, ${weather.state}`);
  console.log('Updated At:', weather.recorded_at);

  await offlineDb.db.weatherCache.put({ ...weather, id: gpsId });
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
  if (w.humidity > 85) alerts.push({ type: 'warning' as const, message: 'High humidity may promote fungal growth. Inspect crops daily.' });
  if (w.rain_probability > 70) alerts.push({ type: 'caution' as const, message: 'Rain expected within 24 hours. Delay pesticide spraying.' });
  if (w.temperature > 38) alerts.push({ type: 'warning' as const, message: 'Extreme heat. Ensure adequate irrigation and shade for sensitive crops.' });
  if (w.wind_speed > 12) alerts.push({ type: 'info' as const, message: 'Strong winds. Secure crop support structures.' });
  return alerts;
}

export async function getTTSAudio(text: string, lang = 'en'): Promise<string> {
  const isOnline = await checkOnlineStatus();
  if (!isOnline) return '';
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

// ── Offline Mock Fallbacks (prediction/recommendation only) ──────────────────
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
