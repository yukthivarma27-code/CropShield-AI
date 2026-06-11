import { useState, useEffect } from 'react';
import { checkOnlineStatus } from '../services/api';

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    async function updateStatus() {
      const online = await checkOnlineStatus();
      setIsOnline(online);
    }

    updateStatus();

    const handleOnline = () => updateStatus();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check
    const interval = setInterval(updateStatus, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
}
