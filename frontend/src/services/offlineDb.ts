import Dexie, { type Table } from 'dexie';
import { PredictionResult, Recommendation, WeatherData, UserProfile } from '../types';

export class AgriVisionOfflineDB extends Dexie {
  predictions!: Table<PredictionResult, number>;
  recommendations!: Table<Recommendation & { id?: string }, string>; // keyed by disease name
  weatherCache!: Table<WeatherData & { id?: string }, string>; // keyed by state_district
  userProfile!: Table<UserProfile & { id?: number }, number>; // single row
  syncQueue!: Table<{
    id?: number;
    action: 'predict' | 'sync_profile';
    payload: any;
    timestamp: number;
  }, number>;

  constructor() {
    super('AgriVisionOfflineDB');
    this.version(1).stores({
      predictions: '++id, disease, crop, created_at',
      recommendations: 'disease',
      weatherCache: 'id', // state_district
      userProfile: 'id',
      syncQueue: '++id, action, timestamp'
    });
  }
}

export const db = new AgriVisionOfflineDB();

// Helper functions for offline storage
export async function saveOfflinePrediction(result: PredictionResult) {
  try {
    await db.predictions.add(result);
  } catch (err) {
    console.error('Failed to save prediction offline:', err);
  }
}

export async function getOfflinePredictions(limit = 20) {
  return await db.predictions
    .orderBy('created_at')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function cacheRecommendation(rec: Recommendation) {
  try {
    await db.recommendations.put(rec);
  } catch (err) {
    console.error('Failed to cache recommendation:', err);
  }
}

export async function getCachedRecommendation(disease: string): Promise<Recommendation | undefined> {
  return await db.recommendations.get(disease);
}

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function cacheWeather(state: string, district: string, data: WeatherData) {
  try {
    const id = `${state}_${district}`.toLowerCase();
    await db.weatherCache.put({ ...data, id, recorded_at: new Date().toISOString() });
  } catch (err) {
    console.error('Failed to cache weather:', err);
  }
}

export async function getCachedWeather(state: string, district: string): Promise<WeatherData | undefined> {
  const id = `${state}_${district}`.toLowerCase();
  const cached = await db.weatherCache.get(id);
  if (!cached) return undefined;
  const age = Date.now() - new Date(cached.recorded_at).getTime();
  if (age > CACHE_DURATION_MS) {
    await db.weatherCache.delete(id);
    return undefined;
  }
  return { ...cached, cached: true };
}

export async function saveProfile(profile: UserProfile) {
  try {
    await db.userProfile.put({ ...profile, id: 1 });
  } catch (err) {
    console.error('Failed to save profile offline:', err);
  }
}

export async function getProfile(): Promise<UserProfile | undefined> {
  return await db.userProfile.get(1);
}

export async function queueOfflineAction(action: 'predict' | 'sync_profile', payload: any) {
  try {
    await db.syncQueue.add({
      action,
      payload,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Failed to queue offline action:', err);
  }
}
