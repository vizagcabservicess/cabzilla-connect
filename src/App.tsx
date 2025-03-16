
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useEffect, useState } from 'react';
import { Toaster } from "./components/ui/sonner";
import { Toaster as UIToaster } from "./components/ui/toaster";
import { ThemeProvider } from './providers/ThemeProvider';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundaryClass from './components/ErrorBoundary';
import { apiProxy } from './services/apiProxy';
import { toast } from 'sonner';

// Declare the global window property for appInitTime
declare global {
  interface Window {
    appInitTime: string;
  }
}

// Create a query client with retries and caching disabled
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 0,
      gcTime: 0, // Updated from cacheTime to gcTime which is the current property
    },
  },
});

function App() {
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  
  // Function to check API connectivity
  const checkApiConnectivity = async () => {
    try {
      console.log('Checking API connectivity...');
      const isConnected = await apiProxy.testConnectivity();
      setApiConnected(isConnected);
      
      if (isConnected) {
        console.log('API connectivity check successful');
      } else {
        console.error('API connectivity check failed - no endpoints reachable');
        toast.error('API Connection Failed', {
          description: 'Unable to connect to any API endpoint. Some features may not work.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('API connectivity check failed:', error);
      setApiConnected(false);
    }
  };
  
  // Clear all data on initial load
  const clearStaleData = () => {
    console.log('Clearing all cached data');
    
    // Clear auth state
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Clear booking data
    localStorage.removeItem('selectedCab');
    localStorage.removeItem('hourlyPackage');
    localStorage.removeItem('tourPackage');
    localStorage.removeItem('bookingDetails');
    localStorage.removeItem('cabFares');
    localStorage.removeItem('dropLocation');
    localStorage.removeItem('pickupLocation');
    localStorage.removeItem('pickupDate');
    localStorage.removeItem('returnDate');
    
    // Clear API cache
    queryClient.clear();
  };
  
  useEffect(() => {
    console.log('Application initialized successfully');
    clearStaleData();
    
    // Add timestamp to help debug
    window.appInitTime = new Date().toISOString();
    
    // Check API connectivity
    checkApiConnectivity();
    
    // Add periodic check for API connectivity
    const interval = setInterval(() => {
      checkApiConnectivity();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundaryClass>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster position="top-center" closeButton richColors />
            <UIToaster />
          </QueryClientProvider>
        </GoogleMapsProvider>
      </ThemeProvider>
    </ErrorBoundaryClass>
  );
}

export default App;
