
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastUIToaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { ThemeProvider } from './providers/ThemeProvider';

// Create a client
const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
    
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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vizag-cabs-theme">
        <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
          <RouterProvider router={router} />
          <ToastUIToaster />
          <SonnerToaster position="top-right" closeButton richColors />
        </GoogleMapsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
