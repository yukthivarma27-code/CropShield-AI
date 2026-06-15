import React, { useState, useEffect } from 'react';
import { WeatherData } from '../../types';
import { getWeatherByGPS, getWeatherInfo } from '../../services/api';
import { Card } from '../common/Card';
import { Thermometer, Droplets, CloudRain, Wind, AlertCircle, MapPin } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface WeatherWidgetProps {
  state: string;
  district: string;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ state, district }) => {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsActive, setGpsActive] = useState(false);

  useEffect(() => {
    async function loadWeather() {
      setLoading(true);
      setError(null);

      // Try GPS-first weather (uses Open-Meteo + reverse geocode)
      try {
        const data = await getWeatherByGPS(state, district);
        setWeather(data);
        setGpsActive(data.state !== state || data.district !== district);
        setLoading(false);
        return;
      } catch {
        // GPS failed silently — will fall through to settings-based
      }

      // GPS unavailable — fall back to settings-based weather via backend
      try {
        const data = await getWeatherInfo(state, district);
        setWeather(data);
        setGpsActive(false);
      } catch (err) {
        console.error('Failed to load weather:', err);
        setError('Could not fetch weather updates');
      } finally {
        setLoading(false);
      }
    }

    loadWeather();
    // Re-fetch when settings location changes (only if GPS is not available)
    // Note: district is included so that changing settings re-triggers GPS and fallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, district]);

  if (loading) {
    return (
      <Card className="animate-pulse flex items-center justify-center p-6 text-gray-400">
        Loading localized weather...
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="border-rose-100 dark:border-rose-950/30 flex items-center gap-3 text-xs text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>Weather information currently unavailable.</span>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="min-w-0">
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
            {t('weather_advisory')}
          </span>
          <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50 leading-tight truncate flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span className="truncate">{weather.district ? `${weather.district}, ${weather.state}` : weather.state}</span>
            {weather.cached && <span className="text-[9px] text-amber-500 font-normal flex-shrink-0">(Cached)</span>}
            {weather.offline && <span className="text-[9px] text-amber-500 font-normal flex-shrink-0">(Offline)</span>}
            {gpsActive && !weather.cached && !weather.offline && <span className="text-[9px] text-emerald-500 font-normal flex-shrink-0">(Live GPS)</span>}
          </h4>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400 capitalize flex-shrink-0 ml-2">
          {weather.description}
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 my-4">
        <div className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-zinc-850">
          <Thermometer className="w-5 h-5 text-amber-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-zinc-50">{weather.temperature}°C</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Temp</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-zinc-850">
          <Droplets className="w-5 h-5 text-blue-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-zinc-50">{weather.humidity}%</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Humidity</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-zinc-850">
          <CloudRain className="w-5 h-5 text-indigo-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-zinc-50">{weather.rain_probability}%</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Rain Prob</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-gray-50 dark:bg-zinc-850">
          <Wind className="w-5 h-5 text-teal-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-zinc-50">{weather.wind_speed}km/h</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Wind</span>
        </div>
      </div>

      {/* Weather Alert / Advisory */}
      {weather.advisory && (
        <p className="text-xs text-gray-600 dark:text-zinc-400 bg-primary-50/20 dark:bg-primary-950/5 p-3 rounded-2xl border border-primary-100/20 dark:border-primary-900/10 leading-normal">
          <strong>Advisory:</strong> {weather.advisory}
        </p>
      )}
    </Card>
  );
};
