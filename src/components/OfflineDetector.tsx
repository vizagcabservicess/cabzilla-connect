
import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Update network status
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      // Hide the online alert after 5 seconds
      setTimeout(() => setShowAlert(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If online and not showing alert, don't render anything
  if (isOnline && !showAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant={isOnline ? "default" : "destructive"} className="shadow-lg">
        <div className="flex items-center">
          {isOnline ? (
            <Wifi className="h-4 w-4 mr-2" />
          ) : (
            <WifiOff className="h-4 w-4 mr-2" />
          )}
          <AlertTitle>
            {isOnline ? "Back Online" : "You're Offline"}
          </AlertTitle>
        </div>
        <AlertDescription className="mt-2">
          {isOnline 
            ? "Your internet connection has been restored. You can continue using the app."
            : "Please check your internet connection. Some features may not work properly."}
        </AlertDescription>
        
        <div className="mt-3 flex justify-end">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAlert(false)}
          >
            Dismiss
          </Button>
          
          {!isOnline && (
            <Button 
              variant="default"
              size="sm"
              className="ml-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}
