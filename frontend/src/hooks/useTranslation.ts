import { useState, useEffect } from 'react';
import { getProfile } from '../services/offlineDb';

// Load static translations
import en from '../i18n/en.json';
import te from '../i18n/te.json';
import hi from '../i18n/hi.json';
import ta from '../i18n/ta.json';
import kn from '../i18n/kn.json';

const translations: Record<string, Record<string, string>> = { en, te, hi, ta, kn };

export function useTranslation() {
  const [lang, setLang] = useState<string>('en');

  // Load language from offline profile on startup
  useEffect(() => {
    async function loadLang() {
      const profile = await getProfile();
      if (profile && profile.language) {
        setLang(profile.language);
      } else {
        const saved = localStorage.getItem('agrivision_lang');
        if (saved) setLang(saved);
      }
    }
    loadLang();
  }, []);

  const changeLanguage = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('agrivision_lang', newLang);
    // Dispatch custom event to notify other hooks/components
    window.dispatchEvent(new Event('languagechange'));
  };

  // Listen for language changes from other settings page updates
  useEffect(() => {
    const handleLangChange = () => {
      const saved = localStorage.getItem('agrivision_lang');
      if (saved) setLang(saved);
    };
    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, []);

  const t = (key: string): string => {
    const dict = translations[lang] || translations['en'];
    return dict[key] || translations['en'][key] || key;
  };

  return { t, lang, changeLanguage };
}
