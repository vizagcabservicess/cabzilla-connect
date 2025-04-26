
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastUIToaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { ThemeProvider } from './providers/ThemeProvider';
import { toast } from 'sonner';

function App() {
  const [isRouterMounted, setIsRouterMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  useEffect(() => {
    // Set page title based on route
    const isAdmin = window.location.pathname.startsWith('/admin');
    document.title = isAdmin 
      ? 'Admin Dashboard - Vizag Cabs' 
      : 'Vizag Cabs - Book Cabs in Visakhapatnam';
    
    // Log navigation for debugging routes
    const handleRouteChange = () => {
      console.log('Route changed to:', window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Initialize router with short delay to ensure all scripts are loaded
    try {
      setTimeout(() => {
        setIsRouterMounted(true);
        setIsLoading(false);
        console.log('Router mounted successfully');
      }, 100);
    } catch (error) {
      console.error('Error mounting router:', error);
      setRouteError(error instanceof Error ? error.message : 'Unknown router error');
      setIsLoading(false);
      
      // Show error toast
      toast.error('Error initializing application. Please refresh the page.');
    }
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading application...</h2>
          <p className="text-muted-foreground">Please wait while we initialize the app</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (routeError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center max-w-md p-4">
          <h2 className="text-2xl font-bold mb-2 text-destructive">Router Error</h2>
          <p className="text-muted-foreground mb-4">{routeError}</p>
          <p className="mb-4">Current path: {window.location.pathname}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  // Add error boundary
  if (!isRouterMounted) {
    console.log('Router is initializing...');
    return <div className="p-8">Loading application...</div>;
  }

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
