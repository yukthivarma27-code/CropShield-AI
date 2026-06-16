import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export const LanguageSelector: React.FC = () => {
  const { lang, changeLanguage } = useTranslation();

  const languages = [
    { code: 'en', nativeName: 'English' },
    { code: 'te', nativeName: 'తెలుగు' },
    { code: 'hi', nativeName: 'हिन्दी' },
    { code: 'ta', nativeName: 'தமிழ்' },
    { code: 'kn', nativeName: 'ಕನ್ನಡ' }
  ];

  return (
    <div className="grid grid-cols-5 gap-1.5 w-full bg-gray-50 dark:bg-zinc-900 p-1.5 rounded-2xl border border-gray-100 dark:border-zinc-800">
      {languages.map((l) => {
        const isSelected = lang === l.code;
        return (
          <button
            key={l.code}
            onClick={() => changeLanguage(l.code)}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all duration-200 ${
              isSelected
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/10'
                : 'text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {l.nativeName}
          </button>
        );
      })}
    </div>
  );
};
