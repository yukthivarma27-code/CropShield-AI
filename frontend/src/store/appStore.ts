import { useState, useEffect } from 'react';
import { UserProfile, PredictionResult } from '../types';
import { getProfile, saveProfile } from '../services/offlineDb';

export type PageType = 'home' | 'predict' | 'history' | 'assistant' | 'settings';

export function useAppStore() {
  const [activePage, setActivePage] = useState<PageType>('home');
  const [currentResult, setCurrentResult] = useState<PredictionResult | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam',
    language: 'en'
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load configuration and profile from SQLite (Dexie) cache on start
  useEffect(() => {
    async function loadData() {
      const savedProfile = await getProfile();
      if (savedProfile) {
        setProfile(savedProfile);
      }

      const savedTheme = localStorage.getItem('agrivision_theme') as 'light' | 'dark';
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      }
    }
    loadData();
  }, []);

  const updateProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    await saveProfile(newProfile);
    localStorage.setItem('agrivision_lang', newProfile.language);
    window.dispatchEvent(new Event('languagechange'));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('agrivision_theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return {
    activePage,
    setActivePage,
    currentResult,
    setCurrentResult,
    profile,
    updateProfile,
    theme,
    toggleTheme
  };
}
