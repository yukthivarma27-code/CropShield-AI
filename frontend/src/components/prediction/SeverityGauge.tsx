import React from 'react';
import { Card } from '../common/Card';
import { useTranslation } from '../../hooks/useTranslation';

interface SeverityGaugeProps {
  level: 'Low' | 'Medium' | 'High' | 'None' | 'Unknown';
  percentage: number;
}

export const SeverityGauge: React.FC<SeverityGaugeProps> = ({ level, percentage }) => {
  const { t } = useTranslation();

  const colorMap = {
    Low: 'bg-emerald-500 text-emerald-50',
    Medium: 'bg-amber-500 text-amber-50',
    High: 'bg-rose-500 text-rose-550',
    None: 'bg-emerald-600 text-white',
    Unknown: 'bg-gray-400 text-white'
  };

  const ringColorMap = {
    Low: 'border-emerald-500',
    Medium: 'border-amber-500',
    High: 'border-rose-500',
    None: 'border-emerald-600',
    Unknown: 'border-gray-400'
  };

  const labelTextMap = {
    Low: t('low_severity') || 'Low Severity',
    Medium: t('medium_severity') || 'Medium Severity',
    High: t('high_severity') || 'High Severity',
    None: t('healthy') || 'Healthy',
    Unknown: 'Unknown'
  };

  if (level === 'None') return null;

  return (
    <Card title={t('severity')} className="flex items-center gap-5">
      {/* Visual Circle Gauge */}
      <div className={`relative w-20 h-20 rounded-full border-4 ${ringColorMap[level]} flex items-center justify-center flex-shrink-0`}>
        <div className="text-center">
          <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50 leading-none">
            {percentage}%
          </span>
          <span className="block text-[8px] text-gray-400 dark:text-zinc-500 uppercase font-bold mt-0.5">Infected</span>
        </div>
      </div>

      {/* Description Text */}
      <div className="flex-1">
        <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5 uppercase ${colorMap[level]}`}>
          {labelTextMap[level]}
        </span>
        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-normal">
          {level === 'High' && t('severe_warning')}
          {level === 'Low' && 'Early stage leaf spots. Local treatments can clear infection easily.'}
          {level === 'Medium' && 'Moderate infection. Follow recommendations carefully to prevent field spread.'}
        </p>
      </div>
    </Card>
  );
};
