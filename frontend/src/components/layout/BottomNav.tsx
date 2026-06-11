import React from 'react';
import { Home, Camera, History, Mic, Settings } from 'lucide-react';
import { PageType } from '../../store/appStore';
import { useTranslation } from '../../hooks/useTranslation';

interface BottomNavProps {
  activePage: PageType;
  setActivePage: (page: PageType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  const { t } = useTranslation();

  const navItems = [
    { id: 'home' as PageType, label: t('home'), icon: Home },
    { id: 'predict' as PageType, label: t('predict'), icon: Camera },
    { id: 'assistant' as PageType, label: t('voice_assistant'), icon: Mic },
    { id: 'history' as PageType, label: t('history'), icon: History },
    { id: 'settings' as PageType, label: t('settings'), icon: Settings },
  ];

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 dark:border-zinc-800 shadow-lg px-2 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20 scale-105'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
