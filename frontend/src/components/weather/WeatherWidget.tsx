import React, { useState, useEffect, useRef } from 'react';
import { WeatherData } from '../../types';
import { getWeatherByGPS } from '../../services/api';
import { Card } from '../common/Card';
import { Thermometer, Droplets, CloudRain, Wind, AlertCircle, MapPin, RefreshCw, Clock, Satellite } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface WeatherWidgetProps {
  state: string;
  district: string;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
    return d.toLocaleTimeString('en-IN', opts);
  } catch {
    return iso;
  }
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ state, district }) => {
  const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  const loadWeather = async (force = false) => {
    setError(null);
    console.log(force ? 'Refresh Triggered' : 'Loading Weather');
    try {
      const data = await getWeatherByGPS(force);
      if (!unmountedRef.current) {
        console.log('Fetching New Weather');
        setWeather(data);
      }
    } catch (err) {
      if (unmountedRef.current) return;
      console.error('Weather load failed:', err);
      // Offline fallback — same-GPS cache only
      try {
        const db = (await import('../../services/offlineDb')).db;
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000, maximumAge: 0 })
        );
        const fallbackId = `gps_${pos.coords.latitude.toFixed(4)}_${pos.coords.longitude.toFixed(4)}`;
        const fallback = await db.weatherCache.get(fallbackId);
        if (fallback && !unmountedRef.current) {
          setWeather({ ...fallback, cached: true, offline: true });
          return;
        }
      } catch {}
      if (!unmountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (!unmountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    unmountedRef.current = false;
    setLoading(true);

    loadWeather();

    // Auto-refresh every 10 minutes
    intervalRef.current = setInterval(() => loadWeather(), 10 * 60 * 1000);

    return () => {
      unmountedRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when settings location changes — force new fetch
  useEffect(() => {
    loadWeather(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, district]);

  if (loading && !weather) {
    return (
      <Card className="animate-pulse flex items-center justify-center p-6 text-gray-400">
        Loading localized weather...
      </Card>
    );
  }

  if (error && !weather) {
    return (
      <Card className="border-rose-100 dark:border-rose-950/30 flex items-center gap-3 text-xs text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{error || 'Weather information currently unavailable.'}</span>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="overflow-hidden">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="min-w-0">
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
            {t('weather_advisory')}
          </span>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
            <span className="truncate">{weather.district ? `${weather.district}, ${weather.state}` : weather.state}</span>
            {weather.offline && <span className="text-[9px] text-amber-500 font-normal flex-shrink-0">Cached Offline</span>}
            {weather.cached && !weather.offline && <span className="text-[9px] text-amber-500 font-normal flex-shrink-0">Cached</span>}
            {!weather.cached && !weather.offline && <span className="text-[9px] text-emerald-500 font-normal flex-shrink-0">Live Weather</span>}
          </h4>
          {/* Last updated + source + coordinates */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {formatTime(weather.recorded_at)}
            </span>
            <span className="text-[9px] text-gray-400 dark:text-zinc-500 flex items-center gap-0.5">
              <Satellite className="w-3 h-3" />
              {weather.source || 'Open-Meteo'}
            </span>
            {weather.coordinates && (
              <span className="text-[9px] text-gray-400 dark:text-zinc-500">
                GPS: {weather.coordinates.lat.toFixed(4)}, {weather.coordinates.lon.toFixed(4)}
              </span>
            )}
            {weather.offline && weather.cached && (
              <span className="text-[9px] text-amber-500 font-medium">
                Cache: {formatTime(weather.recorded_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400 capitalize">
            {weather.description}
          </span>
          <button
            onClick={() => { setLoading(true); loadWeather(true); }}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-4 gap-3 my-4">
        <div className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-zinc-800">
          <Thermometer className="w-5 h-5 text-amber-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-white">{weather.temperature}°C</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Temp</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-zinc-800">
          <Droplets className="w-5 h-5 text-blue-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-white">{weather.humidity}%</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Humidity</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-zinc-800">
          <CloudRain className="w-5 h-5 text-indigo-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-white">{weather.rain_probability}%</span>
          <span className="text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-medium">Rain Prob</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-zinc-800">
          <Wind className="w-5 h-5 text-teal-500 mb-1" />
          <span className="text-xs font-extrabold text-gray-900 dark:text-white">{weather.wind_speed}km/h</span>
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
