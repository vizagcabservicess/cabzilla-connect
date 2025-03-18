
import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NetworkStatusMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online', { 
        id: 'online-status',
        description: 'Network connection restored'
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline', {
        id: 'offline-status',
        description: 'Check your internet connection'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full shadow-lg",
        "animate-pulse border border-red-200"
      )}>
        <WifiOff className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Offline Mode</span>
      </div>
    </div>
  );
}
