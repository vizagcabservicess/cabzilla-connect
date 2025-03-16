
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastUIToaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { ThemeProvider } from './providers/ThemeProvider';

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
    
    // Log navigation for debugging routes
    const handleRouteChange = () => {
      console.log('Route changed to:', window.location.pathname);
    };
    
    // Log all unhandled errors for better debugging
    const handleUnhandledError = (event: ErrorEvent) => {
      console.error('Unhandled error:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    };
    
    // Log all unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
    };
    
    // Add event listeners
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Log startup information
    console.info('API Base URL:', import.meta.env.VITE_API_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api');
    console.info('Application initialized successfully');
    
    // Clear any stale data on application load
    const clearCachedData = () => {
      try {
        console.info('Clearing all cached data');
        const storageKeys = [
          'authToken', 'userId', 'userProfile', 'bookingDetails', 
          'selectedCab', 'pickupLocation', 'dropLocation', 
          'pickupDate', 'returnDate', 'auth_token'
        ];
        
        storageKeys.forEach(key => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.error('Failed to clear cached data:', e);
      }
    };
    clearCachedData();
    
    return () => {
      // Cleanup
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vizag-cabs-theme">
      <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <RouterProvider router={router} />
        <ToastUIToaster />
        <SonnerToaster position="top-right" closeButton richColors />
      </GoogleMapsProvider>
    </ThemeProvider>
  );
}

export default App;
