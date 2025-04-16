
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
 */
export const fetchLocalPackageFares = async (vehicleId?: string, packageId?: string): Promise<any> => {
  try {
    // Check if there's a cached fare from the CabList component first
    if (vehicleId && packageId) {
      const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const selectedFareFromLocalStorage = localStorage.getItem(`selected_fare_${normalizedVehicleId}_${packageId}`);
      
      if (selectedFareFromLocalStorage) {
        const parsedFare = parseFloat(selectedFareFromLocalStorage);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`Using selected fare from localStorage: ${parsedFare} for ${normalizedVehicleId}`);
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

    const domain = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    
    // Properly construct the URL with query parameters
    let endpoint = `${domain}/api/local-package-fares.php`;
    let queryParams = [];
    
    if (vehicleId) {
      queryParams.push(`vehicle_id=${encodeURIComponent(vehicleId)}`);
    }
    
    if (packageId) {
      queryParams.push(`package_id=${encodeURIComponent(packageId)}`);
    }
    
    // Add timestamp to bust cache
    queryParams.push(`_t=${Date.now()}`);
    
    // Construct the final URL
    const url = `${endpoint}?${queryParams.join('&')}`;
    
    console.log(`Fetching local package fares from: ${url}`);
    
    const response = await safeFetch(url, {
      method: 'GET',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch local package fares: ${response.status} ${response.statusText}`);
      console.log('Response text:', await response.text());
      throw new Error(`Failed to fetch local package fares: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching local package fares:', error);
    throw error;
  }
};

// Safe version of local package fares fetch that never throws
export const safeLocalPackageFares = async (vehicleId?: string, packageId?: string): Promise<any> => {
  try {
    // First, check if there's a cached fare from the CabList component
    if (vehicleId && packageId) {
      const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const cabListFareKey = `selected_fare_${normalizedVehicleId}_${packageId}`;
      const selectedFareFromLocalStorage = localStorage.getItem(cabListFareKey);
      
      if (selectedFareFromLocalStorage) {
        const parsedFare = parseFloat(selectedFareFromLocalStorage);
        if (!isNaN(parsedFare) && parsedFare > 0) {
          console.log(`Using selected fare from localStorage: ${parsedFare} for ${normalizedVehicleId}`);
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
          source: 'dynamic-fallback',
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
      source: 'dynamic-fallback'
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
