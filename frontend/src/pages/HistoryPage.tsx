import React, { useState, useEffect } from 'react';
import { getOfflinePredictions } from '../services/offlineDb';
import { PredictionResult } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useTranslation } from '../hooks/useTranslation';
import { Calendar, ChevronRight, History } from 'lucide-react';
import { PageType } from '../store/appStore';

interface HistoryPageProps {
  setCurrentResult: (result: PredictionResult | null) => void;
  setActivePage: (page: PageType) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ setCurrentResult, setActivePage }) => {
  const { t } = useTranslation();
  const [historyList, setHistoryList] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const list = await getOfflinePredictions(30);
        setHistoryList(list);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const handleSelectPrediction = (item: PredictionResult) => {
    setCurrentResult(item);
    setActivePage('predict');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="text-sm text-gray-400 dark:text-zinc-500">Loading history records...</span>
      </div>
    );
  }

  if (historyList.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center text-center py-12">
        <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-full text-gray-400 dark:text-zinc-500 mb-4">
          <History className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-zinc-50 mb-1">{t('no_history')}</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-[80%] mb-4">
          Scan a crop leaf to identify diseases and get organic treatments.
        </p>
        <Button variant="primary" onClick={() => setActivePage('predict')}>
          Scan Leaf
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
        {t('recent_predictions')}
      </h2>

      <div className="space-y-3">
        {historyList.map((item, idx) => {
          const date = new Date(item.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <Card
              key={idx}
              onClick={() => handleSelectPrediction(item)}
              hoverEffect
              className="flex items-center gap-3.5 p-3"
            >
              {/* Image Thumbnail */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-150 border border-gray-100 dark:border-zinc-800 flex-shrink-0">
                <img
                  src={item.image_url}
                  alt={item.disease}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Text metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-primary-600 uppercase bg-primary-50 dark:bg-primary-950/20 px-2 py-0.5 rounded-full capitalize">
                    {item.crop}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    item.severity === 'Low' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                    item.severity === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                    'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                  }`}>
                    {item.severity}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate leading-tight">
                  {item.disease}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{date}</span>
                </div>
              </div>

              {/* Arrow symbol */}
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
