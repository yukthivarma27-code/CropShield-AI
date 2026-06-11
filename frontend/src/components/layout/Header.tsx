import React from 'react';
import { Sun, Moon, Wifi, WifiOff, Sprout } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useOffline } from '../../hooks/useOffline';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  const { t } = useTranslation();
  const { isOnline } = useOffline();

  return (
    <header className="glass sticky top-0 z-40 w-full px-4 py-3 flex items-center justify-between shadow-sm border-b border-gray-100 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="bg-primary-600 text-white p-2 rounded-xl shadow-md shadow-primary-500/20">
          <Sprout className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 flex items-center gap-2">
            {t('app_name')}
          </h1>
          <span className="text-[10px] text-gray-500 dark:text-zinc-400">Offline-First Crop Advisor</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Network Status Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-300 ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40'
            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40 animate-pulse'
        }`}>
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>{t('connected')}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>{t('offline')}</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-zinc-300"
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
