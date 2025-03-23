
import { clearFareCache } from '@/lib/fareCalculationService';
import { toast } from 'sonner';
import axios from 'axios';

// Generate bypass headers with unique timestamps
const generateBypassHeaders = () => {
  return {
    'X-Force-Refresh': Date.now().toString(),
    'X-Bypass-Cache': 'true',
    'X-Client-Version': import.meta.env.VITE_API_VERSION || '1.0.50',
    'X-Request-Source': 'client-app',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'X-Custom-Timestamp': Date.now().toString(),
    'X-Authorization-Override': 'direct-access-' + Date.now(),
    'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.50',
    'X-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  };
};

// Check if we should use direct API endpoints (from env or localStorage)
const shouldUseDirectApi = () => {
  // Check env first
  const envDirectApi = import.meta.env.VITE_USE_DIRECT_API === 'true';
  
  // Check localStorage/sessionStorage next
  const storageDirectApi = localStorage.getItem('useDirectApi') === 'true' || 
                          sessionStorage.getItem('useDirectApi') === 'true';
  
  return envDirectApi || storageDirectApi;
};

// Direct API call with ultra-simplified approach first, then fallbacks
async function directApiCall(endpoint: string, data: any) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
  const timestamp = Date.now();
  
  // Log the attempt
  console.log(`Starting direct API call to ${endpoint} with data:`, data);
  
  // Use direct API endpoints if configured
  const useDirectApi = shouldUseDirectApi();
  
  // If direct API is enabled, use the simplified endpoints first
  if (useDirectApi) {
    try {
      console.log('ATTEMPT 1: Using new direct API endpoint');
      
      // Map the endpoint to the appropriate direct endpoint
      let directEndpoint = `${baseUrl}/api/direct-fare-update?_t=${timestamp}`;
      
      // If endpoint contains specific trip type, use that direct endpoint
      if (endpoint.includes('outstation')) {
        directEndpoint = `${baseUrl}/api/direct-outstation-fares?_t=${timestamp}`;
      } else if (endpoint.includes('local')) {
        directEndpoint = `${baseUrl}/api/direct-local-fares?_t=${timestamp}`;
      } else if (endpoint.includes('airport')) {
        directEndpoint = `${baseUrl}/api/direct-airport-fares?_t=${timestamp}`;
      } else if (endpoint.includes('vehicle-pricing')) {
        directEndpoint = `${baseUrl}/api/direct-vehicle-pricing?_t=${timestamp}`;
      } else if (endpoint.includes('base-pricing')) {
        directEndpoint = `${baseUrl}/api/direct-base-pricing?_t=${timestamp}`;
      }
      
      console.log(`Using direct endpoint: ${directEndpoint}`);
      
      // Basic fetch with JSON payload - simplest approach
      const simpleFetchResponse = await fetch(directEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...generateBypassHeaders()
        },
        body: JSON.stringify({
          ...data,
          timestamp,
          directApi: true
        })
      });
      
      if (simpleFetchResponse.ok) {
        try {
          const jsonData = await simpleFetchResponse.json();
          console.log('✅ Success with direct endpoint:', jsonData);
          return jsonData;
        } catch (parseError) {
          console.log('Direct endpoint returned success but invalid JSON, continuing with text response');
          const textData = await simpleFetchResponse.text();
          return { status: 'success', message: textData };
        }
      } else {
        console.warn(`❌ Direct endpoint failed with status ${simpleFetchResponse.status}`);
        // Don't throw, continue to next attempt
      }
    } catch (directError) {
      console.warn('❌ Direct endpoint failed with error:', directError);
      // Continue to next attempts
    }
  }
  
  // Try ultra-simplified approach next
  try {
    console.log('ATTEMPT 2: Using ultra-simplified direct approach');
    const directUrl = `${baseUrl}/api/admin/direct-outstation-fares.php?_t=${timestamp}`;
    
    // Basic fetch with JSON payload - simplest approach
    const simpleFetchResponse = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...generateBypassHeaders()
      },
      body: JSON.stringify(data)
    });
    
    if (simpleFetchResponse.ok) {
      try {
        const jsonData = await simpleFetchResponse.json();
        console.log('✅ Success with ultra-simplified endpoint:', jsonData);
        return jsonData;
      } catch (parseError) {
        console.log('Endpoint returned success but invalid JSON, continuing with text response');
        const textData = await simpleFetchResponse.text();
        return { status: 'success', message: textData };
      }
    } else {
      console.warn(`❌ Ultra-simplified approach failed with status ${simpleFetchResponse.status}`);
      // Don't throw, continue to next attempt
    }
  } catch (simplifiedError) {
    console.warn('❌ Ultra-simplified approach failed with error:', simplifiedError);
    // Continue to next attempts
  }
  
  // Create URLs with different timestamp patterns for each attempt - HIGHEST PRIORITY ENDPOINTS FIRST
  const urls = [
    // Try the new direct endpoints first (most reliable)
    `${baseUrl}/api/direct-fare-update?_t=${timestamp}`,
    `${baseUrl}/api/direct-outstation-fares?_t=${timestamp}`,
    `${baseUrl}/api/direct-local-fares?_t=${timestamp}`,
    `${baseUrl}/api/direct-airport-fares?_t=${timestamp}`,
    `${baseUrl}/api/direct-vehicle-pricing?_t=${timestamp}`,
    
    // Try the PHP direct endpoints next
    `${baseUrl}/api/admin/direct-outstation-fares.php?_t=${timestamp}`,
    `${baseUrl}/api/admin/direct-vehicle-pricing.php?_t=${timestamp}`,
    
    // Then try the regular endpoints
    `${baseUrl}/api/admin/outstation-fares-update.php?_t=${timestamp}`,
    `${baseUrl}/api/admin/local-fares-update.php?_t=${timestamp}`,
    `${baseUrl}/api/admin/airport-fares-update.php?_t=${timestamp}`,
    `${baseUrl}/api/admin/vehicle-pricing.php?_t=${timestamp}`,
    `${baseUrl}/api/admin/fares-update.php?_t=${timestamp}`,
    
    // Finally, try the specified endpoint
    `${endpoint}?_t=${timestamp}`
  ];
  
  let lastError = null;
  
  // Try different content types
  const contentTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];
  
  // Try all combinations of URLs and content types
  for (const url of urls) {
    for (const contentType of contentTypes) {
      console.log(`ATTEMPT: Trying ${url} with ${contentType}`);
      
      try {
        // Try axios first
        try {
          const headers = {
            ...generateBypassHeaders(),
            'Content-Type': contentType
          };
          
          let axiosData = data;
          if (contentType === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams();
            Object.entries(data).forEach(([key, value]) => {
              params.append(key, String(value));
            });
            axiosData = params;
          }
          
          console.log(`Trying ${url} with ${contentType} via axios`);
          const response = await axios.post(url, axiosData, { 
            headers,
            timeout: 30000, // 30 seconds timeout
            withCredentials: false // Disable credentials to avoid CORS issues
          });
          
          console.log('✅ Success with axios:', response.data);
          return response.data;
        } catch (axiosError) {
          console.warn(`❌ Axios attempt failed for ${url} with ${contentType}:`, axiosError);
        }
        
        // Try fetch as backup
        try {
          let fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
              ...generateBypassHeaders()
            },
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'omit' // Don't send cookies for CORS
          };
          
          if (contentType === 'application/json') {
            fetchOptions.headers['Content-Type'] = 'application/json';
            fetchOptions.body = JSON.stringify(data);
          } else if (contentType === 'application/x-www-form-urlencoded') {
            fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const params = new URLSearchParams();
            Object.entries(data).forEach(([key, value]) => {
              params.append(key, String(value));
            });
            fetchOptions.body = params.toString();
          } else if (contentType === 'multipart/form-data') {
            // For multipart/form-data, don't set Content-Type, browser sets it with boundary
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
              formData.append(key, String(value));
            });
            fetchOptions.body = formData;
          }
          
          console.log(`Trying ${url} with ${contentType} via fetch`);
          const response = await fetch(url, fetchOptions);
          
          if (response.ok) {
            // Accept both success responses and text responses
            if (response.headers.get('content-type')?.includes('application/json')) {
              const jsonData = await response.json();
              console.log('✅ Success with fetch (JSON):', jsonData);
              return jsonData;
            } else {
              const textData = await response.text();
              console.log('✅ Success with fetch (text):', textData);
              
              // Try to parse as JSON anyway
              try {
                return JSON.parse(textData);
              } catch (parseError) {
                return { status: 'success', message: 'Received text response', data: textData };
              }
            }
          } else {
            console.warn(`❌ Fetch attempt failed with status ${response.status}`);
          }
        } catch (fetchError) {
          console.warn(`❌ Fetch attempt failed for ${url} with ${contentType}:`, fetchError);
        }
      } catch (error) {
        console.error(`All attempts failed for ${url} with ${contentType}:`, error);
        lastError = error;
      }
    }
  }
  
  // All attempts failed, throw the last error
  throw new Error('All update attempts failed: ' + (lastError?.message || 'Unknown error'));
}

// Export the fare service with all fare-related methods
export const fareService = {
  // Clear the fare calculation cache to force recalculation
  clearCache: () => {
    console.log('Clearing all fare calculation caches');
    
    // Clear the fareCalculationService cache
    clearFareCache();
    
    // Clear all localStorage caches that could affect pricing
    try {
      // Clear any cached fare data
      const cacheKeys = [
        // Fare data
        'cachedFareData', 'cabPricing', 'fareCache', 'fares', 'pricing', 
        'cabData', 'tourFares', 'faresLastUpdated', 'fareDataLastRefreshed',
        'vehiclesLastUpdated', 'vehicleDataLastRefreshed',
        
        // Vehicle data
        'vehicles', 'vehicleTypes', 'vehiclesData',
        
        // Trip related
        'selectedCab', 'tripDetails', 'bookingDetails', 'distance',
        'duration', 'route', 'calculatedPrice', 'hourlyPackage',
        'tourPackage', 'dropLocation', 'pickupLocation', 
        'pickupDate', 'returnDate',
        
        // API related
        'apiLastCall', 'apiCache', 'apiResponse',
        
        // Any other cache keys
        'calculatedFares', 'routeData', 'locationData', 'fareCalculation',
        'fareHistory', 'fareEstimates', 'cabOptions', 'availableVehicles'
      ];
      
      // Clear from localStorage
      cacheKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`Cleared localStorage key: ${key}`);
        } catch (e) {
          console.warn(`Failed to clear localStorage key ${key}:`, e);
        }
      });
      
      // Clear from sessionStorage
      cacheKeys.forEach(key => {
        try {
          sessionStorage.removeItem(key);
          console.log(`Cleared sessionStorage key: ${key}`);
        } catch (e) {
          console.warn(`Failed to clear sessionStorage key ${key}:`, e);
        }
      });
      
      // Add timestamps to force refresh next time data is fetched
      localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
      localStorage.setItem('vehicleDataLastRefreshed', Date.now().toString());
      localStorage.setItem('forceCacheRefresh', 'true');
      
      // Add a success flag for immediate visibility
      localStorage.setItem('cacheCleared', Date.now().toString());
      sessionStorage.setItem('cacheCleared', Date.now().toString());
      
      toast.success('All cache data cleared', {
        id: 'fare-cache-cleared',
        duration: 2000
      });
      
      console.log('All fare and vehicle data caches cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear some cache data');
    }
    
    // Return a timestamp to help with cache busting in API calls
    return Date.now();
  },
  
  // Get bypass headers for API calls
  getBypassHeaders: () => {
    return generateBypassHeaders();
  },
  
  // Force a clear cache and return bypass headers in one call
  getForcedRequestConfig: () => {
    // Clear cache first
    fareService.clearCache();
    
    // Return configuration with bypass headers and timestamps
    return {
      headers: generateBypassHeaders(),
      params: {
        t: Date.now(), // Add timestamp as query param
        _: Date.now(), // Add another timestamp with different name
        force: 'true',
        bypass: 'cache'
      },
      timeout: 30000, // 30 second timeout (increased from 15s)
      withCredentials: false, // Disable credentials to avoid CORS preflight issues
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit' // Don't send cookies for CORS
    };
  },
  
  // Direct fare update method using multiple approaches
  directFareUpdate: async (tripType: string, vehicleId: string, data: any): Promise<any> => {
    // Record when the update operation began
    const startTime = Date.now();
    console.log(`Starting fare update for ${tripType}, vehicle: ${vehicleId} at ${new Date(startTime).toISOString()}`);
    
    try {
      console.log(`Starting direct fare update for ${tripType}, vehicle: ${vehicleId}`);
      
      // Clear all caches first
      fareService.clearCache();
      
      // Add vehicle ID explicitly to the data
      const updateData = {
        ...data,
        vehicleId,
        vehicle_id: vehicleId,
        tripType,
        trip_type: tripType,
        _t: Date.now()
      };
      
      // Log the data we're about to send
      console.log('Using fare update data:', updateData);
      
      // Show a toast to let the user know the update is in progress
      toast.info('Updating fare, please wait...', {
        id: 'fare-update-in-progress',
        duration: 5000
      });
      
      // Determine the best endpoint based on trip type
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      
      // Use the new direct endpoints if enabled, otherwise use the legacy direct endpoints
      let directEndpoint = '';
      
      if (shouldUseDirectApi()) {
        // Use the new REST-style endpoints
        if (tripType === 'outstation') {
          directEndpoint = `${baseUrl}/api/direct-outstation-fares`;
        } else if (tripType === 'local') {
          directEndpoint = `${baseUrl}/api/direct-local-fares`;
        } else if (tripType === 'airport') {
          directEndpoint = `${baseUrl}/api/direct-airport-fares`;
        } else {
          directEndpoint = `${baseUrl}/api/direct-fare-update`;
        }
      } else {
        // Use the legacy direct PHP endpoints
        directEndpoint = `${baseUrl}/api/admin/direct-outstation-fares.php`;
      }
      
      // Make the direct API call with multiple fallback methods
      const result = await directApiCall(directEndpoint, updateData);
      
      const endTime = Date.now();
      console.log(`✅ Direct fare update successful in ${endTime - startTime}ms:`, result);
      
      toast.success('Fare updated successfully', {
        id: 'fare-update-success'
      });
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ All fare update methods failed after ${endTime - startTime}ms:`, error);
      
      toast.error('Failed to update fare. Please try again.', {
        id: 'fare-update-error'
      });
      
      throw error;
    }
  }
};
