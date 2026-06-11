import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { PageType } from '../../store/appStore';

interface LayoutProps {
  children: React.ReactNode;
  activePage: PageType;
  setActivePage: (page: PageType) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activePage,
  setActivePage,
  theme,
  toggleTheme
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col max-w-md mx-auto shadow-2xl relative overflow-x-hidden border-x border-gray-100 dark:border-zinc-900">
      {/* Header */}
      <Header theme={theme} toggleTheme={toggleTheme} />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 overflow-y-auto px-4 pt-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
};
