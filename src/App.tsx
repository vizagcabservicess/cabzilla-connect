
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
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Set viewport for mobile devices - ensure this runs on each mount
    const metaViewport = document.querySelector('meta[name=viewport]');
    if (!metaViewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
    } else {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    // Force a layout calculation to ensure responsive styles apply
    document.body.style.zoom = '99.99%';
    setTimeout(() => {
      document.body.style.zoom = '100%';
    }, 10);
    
    // Add event listener for automatic navigation after cab selection
    const handleCabSelection = (e: CustomEvent) => {
      if (e.detail?.selectedCab && e.detail?.autoNavigate) {
        // Get the booking details from the event or sessionStorage
        const bookingDetails = e.detail.bookingDetails || JSON.parse(sessionStorage.getItem('bookingDetails') || '{}');
        if (bookingDetails) {
          // Use window.location to navigate since we're outside of React Router context
          window.location.href = '/booking-confirmation';
        }
      }
    };
    
    window.addEventListener('cabSelected', handleCabSelection as EventListener);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('cabSelected', handleCabSelection as EventListener);
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
