export interface PredictionItem {
  disease: string;
  confidence: number;
}

export interface PredictionResult {
  id?: number;
  crop: string;
  disease: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High' | 'None' | 'Unknown';
  severity_percentage: number;
  top_3_predictions: PredictionItem[];
  symptoms: string;
  description: string;
  image_url: string;
  gradcam_url?: string;
  created_at: string;
  offline?: boolean;
}

export interface ChemicalTreatment {
  name: string;
  active_ingredient?: string;
  dosage?: string;
  spray_interval?: string;
  precautions?: string;
}

export interface OrganicRemedy {
  name: string;
  preparation?: string;
  application?: string;
  frequency?: string;
}

export interface Recommendation {
  disease: string;
  crop?: string;
  state?: string;
  district?: string;
  chemical_treatments: ChemicalTreatment[];
  organic_remedies: OrganicRemedy[];
  preventive_measures: string[];
  weather_advisory?: string;
  government_schemes?: string[];
  fertilizer_recommendation?: string;
}

export interface WeatherAlert {
  type: 'warning' | 'info' | 'caution';
  message: string;
}

export interface WeatherData {
  state: string;
  district: string;
  temperature: number;
  humidity: number;
  rain_probability: number;
  wind_speed: number;
  description: string;
  advisory: string;
  alerts: WeatherAlert[];
  recorded_at: string;
  cached?: boolean;
  offline?: boolean;
}

export interface UserProfile {
  name: string;
  phone?: string;
  state: string;
  district: string;
  language: string;
}
