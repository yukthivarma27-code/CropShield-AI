import { PredictionResult, Recommendation, WeatherData } from '../types';
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
  const isOnline = await checkOnlineStatus();

  if (!isOnline) {
    // Generate a simulated offline prediction
    const mockResult = generateOfflineMockResult(crop);
    await offlineDb.saveOfflinePrediction(mockResult);

    // Queue for future upload when connection returns
    await offlineDb.queueOfflineAction('predict', {
      crop,
      state,
      district,
      image_base64: typeof fileOrBase64 === 'string' ? fileOrBase64 : null,
      timestamp: Date.now()
    });

    return { ...mockResult, offline: true };
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

  const res = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Prediction API failed');
  }

  const result = await res.json();
  const fullResult = {
    ...result,
    image_url: result.image_url ? `${API_BASE_URL}${result.image_url}` : '',
  };

  // Cache results locally
  await offlineDb.saveOfflinePrediction(fullResult);

  // Prefetch & cache treatments/remedies for this disease to improve offline access
  try {
    const rec = await getRecommendation(fullResult.disease, crop, state, district);
    await offlineDb.cacheRecommendation(rec);
  } catch (err) {
    console.error('Failed to pre-cache recommendations:', err);
  }

  return fullResult;
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
