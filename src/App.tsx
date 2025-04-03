
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
    
    // Prevent recursive cache clearing that causes stack overflow
    const originalClearCache = window.clearCache;
    if (typeof originalClearCache === 'function') {
      let clearCacheInProgress = false;
      window.clearCache = function() {
        if (clearCacheInProgress) {
          console.warn('Preventing recursive clearCache call');
          return false;
        }
        
        clearCacheInProgress = true;
        try {
          return originalClearCache.apply(this, arguments);
        } finally {
          clearCacheInProgress = false;
        }
      };
    }
    
    // Log navigation for debugging routes
    const handleRouteChange = () => {
      console.log('Route changed to:', window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
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
