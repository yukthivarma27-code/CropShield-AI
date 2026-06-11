import React, { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { PredictionPage } from './pages/PredictionPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { useAppStore } from './store/appStore';
import { startAutoSync } from './services/syncService';

const App: React.FC = () => {
  const {
    activePage,
    setActivePage,
    currentResult,
    setCurrentResult,
    profile,
    updateProfile,
    theme,
    toggleTheme
  } = useAppStore();

  // Initialize offline background sync
  useEffect(() => {
    startAutoSync();
  }, []);

  return (
    <Layout
      activePage={activePage}
      setActivePage={setActivePage}
      theme={theme}
      toggleTheme={toggleTheme}
    >
      {activePage === 'home' && (
        <HomePage
          setActivePage={setActivePage}
          state={profile.state}
          district={profile.district}
        />
      )}
      {activePage === 'predict' && (
        <PredictionPage
          currentResult={currentResult}
          setCurrentResult={setCurrentResult}
          state={profile.state}
          district={profile.district}
        />
      )}
      {activePage === 'history' && (
        <HistoryPage
          setCurrentResult={setCurrentResult}
          setActivePage={setActivePage}
        />
      )}
      {activePage === 'assistant' && (
        <VoiceAssistantPage />
      )}
      {activePage === 'settings' && (
        <SettingsPage
          profile={profile}
          updateProfile={updateProfile}
        />
      )}
    </Layout>
  );
};

export default App;
