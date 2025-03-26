
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastUIToaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { ThemeProvider } from './providers/ThemeProvider';
import { toast } from 'sonner';

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
    
    // Log navigation for debugging routes
    const handleRouteChange = () => {
      console.log('Route changed to:', window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Setup global fetch error handler for API requests
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = input instanceof Request ? input.url : input.toString();
      
      try {
        // Check if this is an API request
        if (url.includes('/api/')) {
          console.log(`Fetch request to API: ${url}`);
          
          // ULTRA EMERGENCY MODE - highest priority
          if (localStorage.getItem('useUltraEmergency') === 'true' ||
              sessionStorage.getItem('useUltraEmergency') === 'true' ||
              import.meta.env.VITE_USE_ULTRA_EMERGENCY === 'true') {
            
            const isOutstationFare = url.includes('outstation-fares') || 
                                   url.includes('direct-outstation-fares');
            
            // Replace with ultra emergency endpoints if applicable
            if (isOutstationFare) {
              const timestamp = Date.now();
              const ultraEndpoint = `${import.meta.env.VITE_API_BASE_URL}/api/ultra-emergency-outstation?_t=${timestamp}`;
              console.log(`Using ULTRA EMERGENCY endpoint: ${ultraEndpoint}`);
              
              // Extract the original method to use with our new endpoint
              const method = init?.method || 'POST';
              
              // Copy the original headers and add cache-busting headers
              const headers = {
                ...(init?.headers || {}),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true',
                'X-Timestamp': timestamp.toString(),
                'X-Ultra-Emergency': 'true'
              };
              
              // Create new init object
              const newInit = {
                ...init,
                method,
                headers
              };
              
              return originalFetch(ultraEndpoint, newInit);
            }
          }
          
          // Regular emergency endpoint support
          if (localStorage.getItem('useEmergencyEndpoints') === 'true' ||
              sessionStorage.getItem('useEmergencyEndpoints') === 'true' ||
              import.meta.env.VITE_USE_EMERGENCY_ENDPOINTS === 'true') {
              
            const isAirportFare = url.includes('airport-fares') || url.includes('fares/airport');
            const isOutstationFare = url.includes('outstation-fares') || 
                                    url.includes('direct-outstation-fares');
            const isInitDb = url.includes('init-database');
            
            // Replace with emergency endpoints if applicable
            let newUrl = url;
            if (isAirportFare) {
              newUrl = url.replace(/\/api\/.*?\//, '/api/emergency/airport-fares?');
              console.log(`Redirecting to emergency airport endpoint: ${newUrl}`);
            } else if (isOutstationFare) {
              newUrl = url.replace(/\/api\/.*?\//, '/api/emergency/outstation-fares?');
              console.log(`Redirecting to emergency outstation endpoint: ${newUrl}`);
            } else if (isInitDb) {
              newUrl = url.replace(/\/api\/.*?\//, '/api/emergency/init-database?');
              console.log(`Redirecting to emergency init-database endpoint: ${newUrl}`);
            }
            
            if (newUrl !== url) {
              // Add forced timestamp to bust cache
              const timestamp = Date.now();
              newUrl += (newUrl.includes('?') ? '&' : '?') + `_t=${timestamp}`;
              
              // Add headers to bypass caching
              const newInit = { 
                ...init,
                headers: {
                  ...(init?.headers || {}),
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true',
                  'X-Timestamp': timestamp.toString()
                }
              };
              
              console.log(`Using emergency endpoint: ${newUrl}`);
              return originalFetch(newUrl, newInit);
            }
          }
        }
        
        // Proceed with original fetch
        const response = await originalFetch(input, init);
        
        // Check for API errors
        if (url.includes('/api/') && !response.ok) {
          console.error(`API request failed: ${url}`, response.status);
          
          // For 500 errors, toast an error message and activate ultra emergency mode
          if (response.status === 500) {
            toast.error('API server error. Activating Ultra Emergency Mode.', {
              id: 'api-500-error',
              duration: 5000,
            });
            
            // Auto-activate ultra emergency mode after multiple 500 errors
            localStorage.setItem('useUltraEmergency', 'true');
            sessionStorage.setItem('useUltraEmergency', 'true');
            
            // If this was an outstation fare update, automatically retry with ultra emergency endpoint
            if (url.includes('outstation-fares') || url.includes('direct-outstation-fares')) {
              const timestamp = Date.now();
              const ultraEndpoint = `${import.meta.env.VITE_API_BASE_URL}/api/ultra-emergency-outstation?_t=${timestamp}`;
              
              toast.info('Retrying with ultra emergency endpoint...', {
                id: 'retrying-ultra-emergency',
                duration: 3000,
              });
              
              console.log(`Auto-retrying with ULTRA EMERGENCY endpoint: ${ultraEndpoint}`);
              
              try {
                const ultraResponse = await originalFetch(ultraEndpoint, {
                  method: init?.method || 'POST',
                  body: init?.body,
                  headers: {
                    ...(init?.headers || {}),
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'X-Force-Refresh': 'true',
                    'X-Timestamp': timestamp.toString(),
                    'X-Ultra-Emergency': 'true'
                  }
                });
                
                if (ultraResponse.ok) {
                  toast.success('Ultra emergency endpoint succeeded!', {
                    id: 'ultra-emergency-success',
                    duration: 3000,
                  });
                  return ultraResponse;
                }
              } catch (ultraError) {
                console.error('Ultra emergency endpoint also failed:', ultraError);
              }
            }
          }
        }
        
        return response;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        
        // For API requests, toast an error
        if (url.includes('/api/')) {
          toast.error('Network error connecting to API', {
            id: 'api-network-error',
            duration: 5000,
          });
          
          // Activate ultra emergency mode for all fetch errors
          localStorage.setItem('useUltraEmergency', 'true');
          sessionStorage.setItem('useUltraEmergency', 'true');
          
          toast.info('Ultra Emergency Mode activated for future requests', {
            id: 'ultra-emergency-activated',
            duration: 3000,
          });
        }
        
        throw error;
      }
    };
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.fetch = originalFetch; // Restore original fetch on unmount
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
