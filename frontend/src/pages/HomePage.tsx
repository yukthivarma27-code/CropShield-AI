import React from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { WeatherWidget } from '../components/weather/WeatherWidget';
import { Camera, AlertCircle, History, Sprout } from 'lucide-react';
import { PageType } from '../store/appStore';
import { useTranslation } from '../hooks/useTranslation';

interface HomePageProps {
  setActivePage: (page: PageType) => void;
  state: string;
  district: string;
}

export const HomePage: React.FC<HomePageProps> = ({ setActivePage, state, district }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-primary-850 to-primary-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Background graphic */}
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <Sprout className="w-40 h-40" />
        </div>
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Protect Your Harvest</h2>
          <p className="text-xs text-primary-100/90 leading-relaxed max-w-[85%]">
            Detect leaf diseases instantly using our AI. Get organic treatments, chemical doses, and real-time advisories.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActivePage('predict')}
              icon={<Camera className="w-4 h-4 text-primary-600" />}
              className="bg-white hover:bg-gray-50 text-primary-700 font-bold"
            >
              Start Leaf Scan
            </Button>
          </div>
        </div>
      </div>

      {/* Weather Widget Section */}
      <WeatherWidget state={state} district={district} />

      {/* Action shortcuts */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card
          onClick={() => setActivePage('predict')}
          hoverEffect
          className="flex flex-col items-center justify-center text-center p-5 border-emerald-50 dark:border-primary-950/10"
        >
          <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl mb-2.5">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">{t('predict')}</span>
          <span className="text-[9px] text-gray-400 dark:text-zinc-500 mt-0.5">Diagnose Leaf</span>
        </Card>

        <Card
          onClick={() => setActivePage('history')}
          hoverEffect
          className="flex flex-col items-center justify-center text-center p-5"
        >
          <div className="bg-gray-50 dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 p-3 rounded-2xl mb-2.5">
            <History className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">{t('history')}</span>
          <span className="text-[9px] text-gray-400 dark:text-zinc-500 mt-0.5">Past Records</span>
        </Card>
      </div>

      {/* Basic Agricultural Tip card */}
      <Card title="Leaf Health Checklist" className="border-l-4 border-l-primary-500">
        <ul className="space-y-2 text-xs text-gray-500 dark:text-zinc-400 leading-normal">
          <li className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span>Regularly check under leaf layers for tiny spots or velvet molds.</span>
          </li>
          <li className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <span>Avoid evening irrigation. Wet leaves promote overnight fungal development.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
};
