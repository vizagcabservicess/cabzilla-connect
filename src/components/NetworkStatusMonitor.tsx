
import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function NetworkStatusMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

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
      setIsVisible(true);
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

  // Also check for actual connectivity to our API server
  useEffect(() => {
    if (isOnline) {
      // Check actual API connectivity after browser reports online
      const checkActualConnectivity = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
          if (!apiUrl) return;
          
          const timestamp = new Date().getTime();
          const response = await fetch(`${apiUrl}/api/admin/db-connection-test.php?_t=${timestamp}`, {
            method: 'HEAD',
            headers: {
              'Cache-Control': 'no-cache',
              'X-Timestamp': timestamp.toString(),
              'X-Force-Refresh': 'true'
            }
          });
          
          // If we get a response, hide the offline indicator
          if (response.ok) {
            setIsVisible(false);
          }
        } catch (error) {
          // If fetch fails, we're still effectively offline for our API
          setIsVisible(true);
          console.log('API connection check failed despite browser being online:', error);
        }
      };
      
      checkActualConnectivity();
    }
  }, [isOnline]);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
      if (!apiUrl) {
        setIsRetrying(false);
        return;
      }
      
      toast.info('Testing connection...', { id: 'testing-connection' });
      
      const timestamp = new Date().getTime();
      const response = await fetch(`${apiUrl}/api/admin/db-connection-test.php?_t=${timestamp}`, {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Timestamp': timestamp.toString(),
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.ok) {
        setIsVisible(false);
        setIsOnline(true);
        toast.success('Connection restored!', { id: 'testing-connection' });
      } else {
        toast.error('Still offline', { id: 'testing-connection' });
      }
    } catch (error) {
      toast.error('Connection failed', { id: 'testing-connection' });
      console.error('Connection retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (isOnline && !isVisible) {
    return null; // Don't show anything when online and no API issues
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={cn(
        "flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-lg shadow-lg",
        "border border-red-200"
      )}>
        <WifiOff className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium mr-2">
          {isOnline ? "API Offline" : "Offline Mode"}
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetryConnection} 
          className="ml-2 h-7 bg-white border-red-300 hover:bg-red-50"
          disabled={isRetrying}
        >
          {isRetrying ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs">Retry</span>
        </Button>
      </div>
    </div>
  );
}
