
// Helper functions for making API requests
import { apiBaseUrl, defaultHeaders } from './api';

/**
 * Get headers that bypass common API restrictions
 */
export const getBypassHeaders = (): Record<string, string> => {
  return {
    'X-Bypass-Cache': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Origin': window.location.origin,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*'
  };
};

/**
 * Get forced request configuration with bypass headers and cache settings
 */
export const getForcedRequestConfig = () => {
  const token = localStorage.getItem('authToken');
  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
  
  return {
    headers: {
      ...getBypassHeaders(),
      ...authHeader
    },
    timeout: 60000, // Increased timeout for maximum reliability
    cache: 'no-store' as const,
    mode: 'cors' as const,
    credentials: 'omit' as const, // Don't send credentials for CORS
    keepalive: true, // Keep connection alive
    redirect: 'follow' as const, // Follow redirects
    referrerPolicy: 'no-referrer' as const // Don't send referrer for CORS
  };
};

/**
 * Format data for multipart form submission
 * This is more reliable for PHP endpoints than JSON
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    // Handle arrays and objects
    if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      // Convert other values to string
      formData.append(key, String(value ?? ''));
    }
  });
  
  return formData;
};

/**
 * Check if online before making API requests
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Universal function to perform CORS-safe fetch with retry logic
 * Use this for critical API calls
 */
export const safeFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  // Check if online
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  
  // Get auth token
  const token = localStorage.getItem('authToken');
  
  // Prepare enhanced options with CORS headers
  const enhancedOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      ...getBypassHeaders(),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  };
  
  // Use direct URL to API without proxy
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Add timestamp to prevent caching
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  // Try up to 3 times
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(urlWithTimestamp, enhancedOptions);
      
      if (result.status === 0) {
        throw new Error('Network error - status 0 received');
      }
      
      // If we get a 401, try once more without auth header for fallback behavior
      if (result.status === 401 && token && attempt === 1) {
        console.warn('Auth request failed, trying without Authorization header');
        
        const noAuthOptions = { ...enhancedOptions };
        if (noAuthOptions.headers) {
          // Remove Authorization header
          delete (noAuthOptions.headers as any).Authorization;
        }
        
        try {
          const fallbackResult = await fetch(urlWithTimestamp, noAuthOptions);
          if (fallbackResult.status !== 401) {
            return fallbackResult;
          } else {
            console.error('Fallback request also failed:', fallbackResult.status);
          }
        } catch (fallbackError) {
          console.error('Fallback request error:', fallbackError);
        }
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt} failed:`, error);
      // Wait a bit longer between retries
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  // If we got here, all attempts failed
  throw lastError || new Error('Failed to fetch after multiple attempts');
};

/**
 * Fetch local package fares directly from the API
 * PRIORITY ORDER:
 * 1. Previously selected fare from CabList (in localStorage)
 * 2. API fetch
 * 3. Dynamic calculation as fallback
 */
export const fetchLocalPackageFares = async (vehicleId?: string, packageId?: string): Promise<any> => {
  try {
    // 1. HIGHEST PRIORITY: Check if there's a selected fare from CabList
    if (vehicleId && packageId) {
      const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
      const selectedFareFromLocalStorage = localStorage.getItem(selectedFareKey);
      
      if (selectedFareFromLocalStorage) {
        const parsedFare = parseFloat(selectedFareFromLocalStorage);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`Using selected fare from localStorage: ${parsedFare} for ${normalizedVehicleId}`);
          
          // Broadcast the source for debugging
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedVehicleId,
              packageId,
              fare: parsedFare,
              source: 'selected-fare-localstorage',
              timestamp: Date.now()
            }
          }));
          
          return {
            status: 'success',
            vehicleId: normalizedVehicleId,
            packageId: packageId,
            price: parsedFare,
            source: 'selected-fare-localstorage',
            timestamp: Date.now()
          };
        }
      }
    }

    // 2. API FETCH: Try to get from direct-booking-data.php first (matches CabList)
    if (vehicleId && packageId) {
      try {
        const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
        const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        // Try with direct-booking-data first - this MUST match CabList.tsx order
        const endpoint = `${domain}/api/user/direct-booking-data.php`;
        const url = `${endpoint}?check_sync=true&vehicle_id=${encodeURIComponent(normalizedVehicleId)}&package_id=${encodeURIComponent(packageId)}&_t=${Date.now()}`;
        
        console.log(`fetchLocalPackageFares: Fetching from primary API: ${url}`);
        
        const response = await safeFetch(url, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.status === 'success' && data.price) {
            const price = Number(data.price);
            if (price > 0) {
              console.log(`fetchLocalPackageFares: Got price from primary API: ${price}`);
              
              // Store in localStorage for consistency
              const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Broadcast the source for debugging
              window.dispatchEvent(new CustomEvent('fare-source-update', {
                detail: {
                  cabId: normalizedVehicleId,
                  packageId,
                  fare: price,
                  source: 'direct-booking-data',
                  apiUrl: url,
                  timestamp: Date.now()
                }
              }));
              
              return {
                status: 'success',
                vehicleId: normalizedVehicleId,
                packageId: packageId,
                price: price,
                source: 'direct-booking-data',
                timestamp: Date.now()
              };
            }
          } else if (data && data.data) {
            // Handle alternative response format
            const responseData = data.data;
            let price = 0;
            
            if (packageId.includes('4hrs-40km') && responseData.price4hrs40km) {
              price = Number(responseData.price4hrs40km);
            } else if (packageId.includes('8hrs-80km') && responseData.price8hrs80km) {
              price = Number(responseData.price8hrs80km);
            } else if (packageId.includes('10hrs-100km') && responseData.price10hrs100km) {
              price = Number(responseData.price10hrs100km);
            }
            
            if (price > 0) {
              console.log(`fetchLocalPackageFares: Got price from primary API (alternate format): ${price}`);
              
              // Store in localStorage for consistency
              const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Broadcast the source for debugging
              window.dispatchEvent(new CustomEvent('fare-source-update', {
                detail: {
                  cabId: normalizedVehicleId,
                  packageId,
                  fare: price,
                  source: 'direct-booking-data-alternate',
                  apiUrl: url,
                  timestamp: Date.now()
                }
              }));
              
              return {
                status: 'success',
                vehicleId: normalizedVehicleId,
                packageId: packageId,
                price: price,
                source: 'direct-booking-data-alternate',
                timestamp: Date.now()
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from primary API:', error);
      }
      
      // Try local-package-fares.php as backup
      try {
        const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
        const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        const endpoint = `${domain}/api/local-package-fares.php`;
        const url = `${endpoint}?vehicle_id=${encodeURIComponent(normalizedVehicleId)}&package_id=${encodeURIComponent(packageId)}&_t=${Date.now()}`;
        
        console.log(`fetchLocalPackageFares: Trying backup API: ${url}`);
        
        const response = await safeFetch(url, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.status === 'success' && data.price) {
            const price = Number(data.price);
            if (price > 0) {
              console.log(`fetchLocalPackageFares: Got price from backup API: ${price}`);
              
              // Store in localStorage for consistency
              const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Broadcast the source for debugging
              window.dispatchEvent(new CustomEvent('fare-source-update', {
                detail: {
                  cabId: normalizedVehicleId,
                  packageId,
                  fare: price,
                  source: 'local-package-fares',
                  apiUrl: url,
                  timestamp: Date.now()
                }
              }));
              
              return {
                status: 'success',
                vehicleId: normalizedVehicleId,
                packageId: packageId,
                price: price,
                source: 'local-package-fares',
                timestamp: Date.now()
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from backup API:', error);
      }
      
      // Try direct-local-fares as last resort
      try {
        const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
        const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        
        const endpoint = `${domain}/api/admin/direct-local-fares.php`;
        const url = `${endpoint}?vehicle_id=${encodeURIComponent(normalizedVehicleId)}&_t=${Date.now()}`;
        
        console.log(`fetchLocalPackageFares: Trying fallback API: ${url}`);
        
        const response = await safeFetch(url, {
          method: 'GET',
          headers: {
            ...getBypassHeaders(),
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data && data.fares && data.fares[normalizedVehicleId]) {
            const fareData = data.fares[normalizedVehicleId];
            
            let price = 0;
            if (packageId.includes('4hrs-40km')) {
              price = Number(fareData.price4hrs40km || 0);
            } else if (packageId.includes('8hrs-80km')) {
              price = Number(fareData.price8hrs80km || 0);
            } else if (packageId.includes('10hrs-100km')) {
              price = Number(fareData.price10hrs100km || 0);
            }
            
            if (price > 0) {
              console.log(`fetchLocalPackageFares: Got price from fallback API: ${price}`);
              
              // Store in localStorage for consistency
              const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Broadcast the source for debugging
              window.dispatchEvent(new CustomEvent('fare-source-update', {
                detail: {
                  cabId: normalizedVehicleId,
                  packageId,
                  fare: price,
                  source: 'direct-local-fares',
                  apiUrl: url,
                  timestamp: Date.now()
                }
              }));
              
              return {
                status: 'success',
                vehicleId: normalizedVehicleId,
                packageId: packageId,
                price: price,
                source: 'direct-local-fares',
                timestamp: Date.now()
              };
            }
          }
        }
      } catch (error) {
        console.error('Error fetching from fallback API:', error);
      }
    }
    
    // 3. FALLBACK: Dynamic calculation if all else fails
    const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    
    // Define standard price fallbacks
    const packagePrices = calculateDynamicPrices(vehicleId || 'sedan');
    
    // Return a dynamic fallback
    if (vehicleId && packageId) {
      // If a specific package was requested, return only that
      let price = 0;
      
      if (packageId.includes('4hrs-40km')) {
        price = packagePrices['4hrs-40km'];
      } else if (packageId.includes('8hrs-80km')) {
        price = packagePrices['8hrs-80km'];
      } else if (packageId.includes('10hrs-100km')) {
        price = packagePrices['10hrs-100km'];
      }
      
      if (price > 0) {
        const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
        console.log(`fetchLocalPackageFares: Using dynamic price calculation: ${price}`);
        
        // Store in localStorage for consistency
        const selectedFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
        localStorage.setItem(selectedFareKey, price.toString());
        
        // Broadcast the source for debugging
        window.dispatchEvent(new CustomEvent('fare-source-update', {
          detail: {
            cabId: normalizedVehicleId,
            packageId,
            fare: price,
            source: 'dynamic-calculation',
            timestamp: Date.now()
          }
        }));
        
        return {
          status: 'success',
          vehicleId: normalizedVehicleId,
          packageId: packageId,
          price: price,
          source: 'dynamic-calculation',
          timestamp: Date.now()
        };
      }
    }
    
    // If no specific package requested, return all package prices
    return {
      status: 'success',
      fares: {
        [vehicleId || 'sedan']: {
          id: vehicleId || 'sedan',
          vehicleId: vehicleId || 'sedan',
          name: vehicleId ? vehicleId.charAt(0).toUpperCase() + vehicleId.slice(1).replace(/_/g, ' ') : 'Sedan',
          price4hrs40km: packagePrices['4hrs-40km'],
          price8hrs80km: packagePrices['8hrs-80km'],
          price10hrs100km: packagePrices['10hrs-100km'],
          priceExtraKm: packagePrices.extraKm,
          priceExtraHour: packagePrices.extraHour,
        }
      },
      count: 1,
      timestamp: Date.now(),
      source: 'dynamic-fallback'
    };
  } catch (error) {
    console.error('Error in fetchLocalPackageFares:', error);
    
    // Return a fallback structure with dynamically calculated prices
    const packagePrices = calculateDynamicPrices(vehicleId || 'sedan');
    
    if (vehicleId && packageId) {
      // If a specific package was requested, return only that
      let price = 0;
      
      if (packageId.includes('4hrs-40km')) {
        price = packagePrices['4hrs-40km'];
      } else if (packageId.includes('8hrs-80km')) {
        price = packagePrices['8hrs-80km'];
      } else if (packageId.includes('10hrs-100km')) {
        price = packagePrices['10hrs-100km'];
      }
      
      if (price > 0) {
        return {
          status: 'success',
          vehicleId: vehicleId,
          packageId: packageId,
          price: price,
          source: 'dynamic-fallback-error',
          timestamp: Date.now()
        };
      }
    }
    
    // Return all fares for this vehicle
    return {
      status: 'success',
      fares: {
        [vehicleId || 'sedan']: {
          id: vehicleId || 'sedan',
          vehicleId: vehicleId || 'sedan',
          name: vehicleId ? vehicleId.charAt(0).toUpperCase() + vehicleId.slice(1).replace(/_/g, ' ') : 'Sedan',
          price4hrs40km: packagePrices['4hrs-40km'],
          price8hrs80km: packagePrices['8hrs-80km'],
          price10hrs100km: packagePrices['10hrs-100km'],
          priceExtraKm: packagePrices.extraKm,
          priceExtraHour: packagePrices.extraHour,
        }
      },
      count: 1,
      timestamp: Date.now(),
      source: 'dynamic-fallback-error'
    };
  }
};

// Safe version of local package fares fetch that never throws
export const safeLocalPackageFares = async (vehicleId?: string, packageId?: string): Promise<any> => {
  try {
    // First, check if there's a selected fare from the CabList component
    if (vehicleId && packageId) {
      const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const cabListFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
      const selectedFareFromLocalStorage = localStorage.getItem(cabListFareKey);
      
      if (selectedFareFromLocalStorage) {
        const parsedFare = parseFloat(selectedFareFromLocalStorage);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`safeLocalPackageFares: Using selected fare from localStorage: ${parsedFare} for ${normalizedVehicleId}`);
          
          // Broadcast the source for debugging
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedVehicleId,
              packageId,
              fare: parsedFare,
              source: 'selected-fare-localstorage-safe',
              timestamp: Date.now()
            }
          }));
          
          return {
            status: 'success',
            vehicleId: normalizedVehicleId,
            packageId: packageId,
            price: parsedFare,
            source: 'selected-fare-localstorage-safe',
            timestamp: Date.now()
          };
        }
      }
    }
    
    // If no selected fare in localStorage, fetch from API
    return await fetchLocalPackageFares(vehicleId, packageId);
  } catch (error) {
    console.warn('Error in safeLocalPackageFares:', error);
    
    // Return a fallback structure with dynamically calculated prices
    const packagePrices = calculateDynamicPrices(vehicleId || 'sedan');
    
    if (packageId) {
      // If a specific package was requested, return only that
      let selectedPackage = null;
      if (packageId.includes('4hrs-40km')) {
        selectedPackage = { price: packagePrices['4hrs-40km'], name: '4 Hours Package (40km)' };
      } else if (packageId.includes('8hrs-80km')) {
        selectedPackage = { price: packagePrices['8hrs-80km'], name: '8 Hours Package (80km)' };
      } else if (packageId.includes('10hrs-100km')) {
        selectedPackage = { price: packagePrices['10hrs-100km'], name: '10 Hours Package (100km)' };
      }
      
      if (selectedPackage) {
        return {
          status: 'success',
          vehicleId: vehicleId,
          packageId: packageId,
          packageName: selectedPackage.name,
          baseFare: selectedPackage.price,
          price: selectedPackage.price,
          source: 'dynamic-fallback-safe',
          timestamp: Date.now()
        };
      }
    }
    
    // Return all fares for this vehicle
    return {
      status: 'success',
      fares: {
        [vehicleId || 'sedan']: {
          id: vehicleId || 'sedan',
          vehicleId: vehicleId || 'sedan',
          name: vehicleId ? vehicleId.charAt(0).toUpperCase() + vehicleId.slice(1).replace(/_/g, ' ') : 'Sedan',
          price4hrs40km: packagePrices['4hrs-40km'],
          price8hrs80km: packagePrices['8hrs-80km'],
          price10hrs100km: packagePrices['10hrs-100km'],
          priceExtraKm: packagePrices.extraKm,
          priceExtraHour: packagePrices.extraHour,
        }
      },
      count: 1,
      timestamp: Date.now(),
      source: 'dynamic-fallback-safe'
    };
  }
};

// Dynamic price calculation (matches the one in local-package-fares.php)
function calculateDynamicPrices(vehicleId: string): Record<string, number> {
  const basePrices: Record<string, Record<string, number>> = {
    'sedan': {
      '4hrs-40km': 2400,
      '8hrs-80km': 3000,
      '10hrs-100km': 3500,
      'extraKm': 14,
      'extraHour': 300
    },
    'ertiga': {
      '4hrs-40km': 2800,
      '8hrs-80km': 3500,
      '10hrs-100km': 4000,
      'extraKm': 18,
      'extraHour': 350
    },
    'innova_crysta': {
      '4hrs-40km': 3200,
      '8hrs-80km': 4000,
      '10hrs-100km': 4500,
      'extraKm': 20,
      'extraHour': 400
    },
    'innova_hycross': {
      '4hrs-40km': 3600,
      '8hrs-80km': 4500,
      '10hrs-100km': 5000,
      'extraKm': 22,
      'extraHour': 450
    },
    'mpv': {
      '4hrs-40km': 3600,
      '8hrs-80km': 4500,
      '10hrs-100km': 5000,
      'extraKm': 22,
      'extraHour': 450
    }
  };
  
  // Normalize vehicle ID 
  const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
  
  // Try direct match
  if (basePrices[normalizedVehicleId]) {
    return basePrices[normalizedVehicleId];
  }
  
  // Try partial match
  for (const [key, prices] of Object.entries(basePrices)) {
    if (normalizedVehicleId.includes(key)) {
      return prices;
    }
  }
  
  // Default to sedan
  return basePrices['sedan'];
}
