
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { GoogleMapsProvider } from './providers/GoogleMapsProvider';
import { Toaster as ToastUIToaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from './components/ui/sonner';
import { ThemeProvider } from './providers/ThemeProvider';
import { toast } from 'sonner';
import { ToastProvider } from './hooks/use-toast';

function App() {
  useEffect(() => {
    // Set page title
    document.title = 'Vizag Cabs - Book Cabs in Visakhapatnam';
    
    // Log navigation for debugging routes
    const handleRouteChange = () => {
      console.log('Route changed to:', window.location.pathname);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Check API connection on startup
    const checkApiConnection = async () => {
      try {
        // Use a fail-fast HEAD request to check API availability
        const timestamp = Date.now();
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/db-connection-test.php?_t=${timestamp}`, {
          method: 'HEAD',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true',
            'X-Timestamp': timestamp.toString()
          }
        });
        
        if (response.ok) {
          console.log('API connection check successful');
        } else {
          console.error('API connection check failed:', response.status);
          
          // Try diagnostic test if HEAD request fails
          try {
            const diagnosticResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/db-connection-test.php?_t=${timestamp}`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'X-Timestamp': timestamp.toString()
              }
            });
            
            const diagnosticData = await diagnosticResponse.json();
            console.log('API diagnostic results:', diagnosticData);
            
            if (diagnosticData.status === 'error') {
              toast.error('API database connection issues detected. Using fallback mode.', {
                id: 'api-diagnostic-error',
                duration: 5000
              });
              
              // Activate ultra emergency mode
              localStorage.setItem('useUltraEmergency', 'true');
              sessionStorage.setItem('useUltraEmergency', 'true');
            }
          } catch (diagError) {
            console.error('API diagnostic check failed:', diagError);
            toast.error('API diagnostic check failed. Using offline mode.', {
              id: 'api-diagnostic-failed',
              duration: 5000
            });
          }
        }
      } catch (error) {
        console.error('API connection check error:', error);
        toast.error('API connection check failed. Using fallback mode.', {
          id: 'api-connection-error',
          duration: 5000
        });
        
        // Activate ultra emergency mode
        localStorage.setItem('useUltraEmergency', 'true');
        sessionStorage.setItem('useUltraEmergency', 'true');
      }
    };
    
    // Run API connection check after a short delay
    setTimeout(checkApiConnection, 2000);
    
    // Setup global fetch error handler for API requests
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = input instanceof Request ? input.url : input.toString();
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const timestamp = Date.now();
      
      try {
        // Check if this is an API request
        if (url.includes('/api/')) {
          console.log(`Fetch request to API: ${url}`);
          
          // Add retry capability for API requests
          const maxRetries = parseInt(import.meta.env.VITE_API_MAX_RETRIES || '3');
          let retryCount = 0;
          let lastError = null;
          
          // ULTRA EMERGENCY MODE checking - check multiple sources with fallbacks
          const ultraEmergencyMode = 
              localStorage.getItem('useUltraEmergency') === 'true' ||
              sessionStorage.getItem('useUltraEmergency') === 'true' ||
              import.meta.env.VITE_USE_ULTRA_EMERGENCY === 'true';
          
          if (ultraEmergencyMode) {
            console.log('ULTRA EMERGENCY MODE is active');
            
            const isOutstationFare = url.includes('outstation-fares') || 
                                  url.includes('direct-outstation-fares');
            
            // Replace with ultra emergency endpoints if applicable
            if (isOutstationFare) {
              const ultraEndpoint = `${apiUrl}/api/admin/ultra-emergency-outstation.php?_t=${timestamp}`;
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
              
              // Implement retry logic for ultra emergency endpoint
              while (retryCount <= maxRetries) {
                try {
                  const response = await originalFetch(ultraEndpoint, newInit);
                  
                  if (response.ok) {
                    return response;
                  }
                  
                  lastError = `Status ${response.status}`;
                  retryCount++;
                  
                  if (retryCount <= maxRetries) {
                    const delay = retryCount * 500; // Increasing delay between retries
                    console.log(`Ultra emergency request failed (${lastError}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                } catch (error) {
                  lastError = error;
                  retryCount++;
                  
                  if (retryCount <= maxRetries) {
                    const delay = retryCount * 500;
                    console.log(`Ultra emergency request failed (${error.message}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                }
              }
              
              console.error(`All ultra emergency retries failed for ${ultraEndpoint}:`, lastError);
              throw new Error(`All ultra emergency retries failed: ${lastError}`);
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
              
              // Implement retry logic for emergency endpoints
              while (retryCount <= maxRetries) {
                try {
                  const response = await originalFetch(newUrl, newInit);
                  
                  if (response.ok) {
                    return response;
                  }
                  
                  lastError = `Status ${response.status}`;
                  retryCount++;
                  
                  if (retryCount <= maxRetries) {
                    const delay = retryCount * 200; // Increasing delay between retries
                    console.log(`Emergency request failed (${lastError}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                } catch (error) {
                  lastError = error;
                  retryCount++;
                  
                  if (retryCount <= maxRetries) {
                    const delay = retryCount * 200;
                    console.log(`Emergency request failed (${error.message}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                  }
                }
              }
              
              // If we got here, all emergency endpoint retries failed
              console.error(`All emergency retries failed for ${newUrl}:`, lastError);
              
              // Fall back to ultra emergency mode if emergency endpoints also fail
              localStorage.setItem('useUltraEmergency', 'true');
              sessionStorage.setItem('useUltraEmergency', 'true');
              
              // Continue with original request as last resort
              console.log('Falling back to original request');
            }
          }
          
          // For all API requests, add retry logic
          while (retryCount <= maxRetries) {
            try {
              // Add cache-busting headers to all API requests
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
              
              const response = await originalFetch(url, newInit);
              
              // Check for API errors
              if (!response.ok) {
                lastError = `Status ${response.status}`;
                retryCount++;
                
                if (retryCount <= maxRetries) {
                  const delay = retryCount * 200;
                  console.log(`API request failed (${lastError}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                }
                
                console.error(`API request failed after all retries: ${url}`, response.status);
                
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
                    const ultraEndpoint = `${apiUrl}/api/admin/ultra-emergency-outstation.php?_t=${timestamp}`;
                    
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
              lastError = error;
              retryCount++;
              
              if (retryCount <= maxRetries) {
                const delay = retryCount * 200;
                console.log(`API request threw exception (${error.message}), retry ${retryCount}/${maxRetries} in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                break;
              }
            }
          }
          
          // If we got here, all retries failed
          console.error(`All API request retries failed for ${url}:`, lastError);
          
          toast.error('Network error connecting to API after multiple retries', {
            id: 'api-network-error-retries',
            duration: 5000,
          });
          
          // Activate ultra emergency mode for all fetch errors
          localStorage.setItem('useUltraEmergency', 'true');
          sessionStorage.setItem('useUltraEmergency', 'true');
          
          toast.info('Ultra Emergency Mode activated for future requests', {
            id: 'ultra-emergency-activated',
            duration: 3000,
          });
          
          // Trigger the database connection fix utility
          try {
            fetch(`${apiUrl}/api/admin/db-connection-fix.php?_t=${Date.now()}`, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                'X-Force-Refresh': 'true'
              }
            }).then(response => {
              if (response.ok) {
                console.log('Database connection fix triggered');
                toast.info('Running database connection fix...', {
                  id: 'db-connection-fix',
                  duration: 3000
                });
              }
            }).catch(err => {
              console.error('Error triggering database connection fix:', err);
            });
          } catch (repairError) {
            console.error('Failed to trigger database repair:', repairError);
          }
          
          throw lastError;
        }
        
        // Proceed with original fetch for non-API requests
        return originalFetch(input, init);
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        
        // For API requests, toast an error
        if (url.includes('/api/')) {
          toast.error('Network error connecting to API', {
            id: 'api-network-error',
            duration: 5000,
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
      <ToastProvider>
        <GoogleMapsProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
          <RouterProvider router={router} />
          <ToastUIToaster />
          <SonnerToaster position="top-right" closeButton richColors />
        </GoogleMapsProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
