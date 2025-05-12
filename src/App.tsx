
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { ThemeProvider } from './providers/ThemeProvider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Admin Dashboard';
    
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
        <div className="min-h-screen">
          <Outlet />
          <SonnerToaster position="top-right" closeButton richColors />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
