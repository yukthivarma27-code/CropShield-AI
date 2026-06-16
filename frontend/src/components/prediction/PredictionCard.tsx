import React from 'react';
import { PredictionResult } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '../common/Card';

interface PredictionCardProps {
  result: PredictionResult;
  imageUrl?: string | null;
  onImageError?: () => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ result, imageUrl, onImageError }) => {
  const { t } = useTranslation();
  const isHealthy = result.disease.toLowerCase() === 'healthy';

  return (
    <Card className="overflow-hidden">
      {/* Header Diagnostic status */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800">
        {isHealthy ? (
          <div className="bg-emerald-100 dark:bg-emerald-950/30 p-2 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        ) : (
          <div className="bg-rose-100 dark:bg-rose-950/30 p-2 rounded-2xl text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        )}
        <div>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
            {t('prediction_result')}
          </span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 leading-tight">
            {result.disease}
          </h3>
        </div>
      </div>

      {/* Main image view */}
      <div className="my-4 aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 relative bg-zinc-900">
        <img
          key={imageUrl || 'fallback'}
          src={imageUrl || result.image_url}
          alt={result.disease}
          onError={() => {
            console.error("IMAGE FAILED TO LOAD", { imageUrl, result_image_url: result.image_url });
            onImageError?.();
          }}
          onLoad={() => {
            console.log("IMAGE LOADED", imageUrl || result.image_url);
          }}
          className="w-full h-full object-cover"
        />
        {result.offline && (
          <div className="absolute top-3 right-3 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
            OFFLINE PREDICTION
          </div>
        )}
      </div>

      {/* Probability bar details */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">
            <span>{t('confidence')}</span>
            <span>{(result.confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHealthy ? 'bg-emerald-500' : 'bg-primary-500'
              }`}
              style={{ width: `${result.confidence * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Top 3 list */}
        {result.top_3_predictions && result.top_3_predictions.length > 1 && (
          <div className="pt-2 border-t border-gray-50 dark:border-zinc-800/50 space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alternative predictions</span>
            <div className="space-y-1.5">
              {result.top_3_predictions.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400">
                  <span>{p.disease}</span>
                  <span className="font-semibold">{(p.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
