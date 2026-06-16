import React from 'react';
import { Recommendation } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { ShieldAlert, Sprout, ShieldCheck, Thermometer, CloudRain } from 'lucide-react';
import { Card } from '../common/Card';

interface TreatmentPanelProps {
  recommendation: Recommendation;
  weatherAdvisory?: string;
  rainProbability?: number;
  humidity?: number;
}

export const TreatmentPanel: React.FC<TreatmentPanelProps> = ({
  recommendation,
  weatherAdvisory,
  rainProbability = 0,
  humidity = 0
}) => {
  const { t } = useTranslation();

  const isRainWarning = rainProbability > 60;
  const isHumidityWarning = humidity > 80;

  return (
    <div className="space-y-4">
      {/* Weather Advisory Block */}
      {(weatherAdvisory || isRainWarning || isHumidityWarning) && (
        <Card className="bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 dark:text-amber-400 p-1 bg-amber-100/50 dark:bg-amber-950/30 rounded-xl mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                {t('weather_advisory')}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                {weatherAdvisory || 'Weather is clear. You can proceed with standard sprays.'}
              </p>
              {isRainWarning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-2">
                  <CloudRain className="w-3.5 h-3.5" />
                  Rain expected within 24 hours. Delay pesticide spraying.
                </span>
              )}
              {isHumidityWarning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  High humidity may promote fungal growth. Monitor crops.
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Chemical Treatments (Requirement 3) */}
      {recommendation.chemical_treatments && recommendation.chemical_treatments.length > 0 && (
        <Card title={t('chemical_treatment')}>
          <div className="space-y-4">
            {recommendation.chemical_treatments.map((t, idx) => (
              <div key={idx} className="pb-3 last:pb-0 last:border-b-0 border-b border-gray-50 dark:border-zinc-800/50">
                <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-50">{t.name}</h4>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px] text-gray-500 dark:text-zinc-400">
                  {t.active_ingredient && (
                    <div>
                      <span className="font-semibold block text-[10px] text-gray-400 dark:text-zinc-500 uppercase">Active</span>
                      {t.active_ingredient}
                    </div>
                  )}
                  {t.dosage && (
                    <div>
                      <span className="font-semibold block text-[10px] text-gray-400 dark:text-zinc-500 uppercase">Dosage</span>
                      {t.dosage}
                    </div>
                  )}
                  {t.spray_interval && (
                    <div className="col-span-2 mt-1">
                      <span className="font-semibold block text-[10px] text-gray-400 dark:text-zinc-500 uppercase">Interval</span>
                      {t.spray_interval}
                    </div>
                  )}
                </div>
                {t.precautions && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-2 bg-rose-50/50 dark:bg-rose-950/10 p-2 rounded-xl border border-rose-100/50 dark:border-rose-900/20 leading-normal">
                    <strong>Precautions:</strong> {t.precautions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Organic Remedies (Requirement 3) */}
      {recommendation.organic_remedies && recommendation.organic_remedies.length > 0 && (
        <Card title={t('organic_remedies')}>
          <div className="space-y-3.5">
            {recommendation.organic_remedies.map((r, idx) => (
              <div key={idx} className="bg-primary-50/30 dark:bg-primary-950/5 border border-primary-100/30 dark:border-primary-900/10 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-2">
                  <Sprout className="w-4 h-4" />
                  <h4 className="text-xs font-bold">{r.name}</h4>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400 leading-normal">
                  {r.preparation && (
                    <p><strong>Prep:</strong> {r.preparation}</p>
                  )}
                  {r.application && (
                    <p><strong>App:</strong> {r.application}</p>
                  )}
                  {r.frequency && (
                    <p><strong>Frequency:</strong> {r.frequency}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Preventive Measures (Requirement 3) */}
      {recommendation.preventive_measures && recommendation.preventive_measures.length > 0 && (
        <Card title={t('preventive_measures')}>
          <ul className="space-y-2 text-xs text-gray-650 dark:text-zinc-400 leading-relaxed">
            {recommendation.preventive_measures.map((p, idx) => (
              <li key={idx} className="flex gap-2.5 items-start">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Localized Fertilizer & Schemes (Requirement 15) */}
      {recommendation.fertilizer_recommendation && (
        <Card title={t('fertilizer_rec')}>
          <p className="text-xs text-gray-650 dark:text-zinc-400 leading-relaxed">
            {recommendation.fertilizer_recommendation}
          </p>
        </Card>
      )}

      {recommendation.government_schemes && recommendation.government_schemes.length > 0 && (
        <Card title={t('government_schemes')}>
          <ul className="space-y-2 text-xs text-gray-650 dark:text-zinc-400 leading-relaxed">
            {recommendation.government_schemes.map((s, idx) => (
              <li key={idx} className="flex gap-2.5 items-start">
                <span className="text-primary-600 font-bold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
