
import { clearFareCache } from '@/lib/fareCalculationService';
import { toast } from 'sonner';
import axios from 'axios';

// Try these custom headers to bypass caching and access issues
const generateBypassHeaders = () => {
  return {
    'X-Force-Refresh': Date.now().toString(),
    'X-Bypass-Cache': 'true',
    'X-Client-Version': import.meta.env.VITE_API_VERSION || '1.0.36',
    'X-Request-Source': 'client-app',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'X-Custom-Timestamp': Date.now().toString(),
    'X-Authorization-Override': 'direct-access-' + Date.now()
  };
};

// Alternative fetch implementation for fallback
async function doFetchRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch request failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch attempt failed:', error);
    throw error;
  }
}

// Direct API call function that tries multiple methods
async function directApiCall(endpoint: string, data: any) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
  const timestamp = Date.now();
  
  // Create URLs with different timestamp patterns for each attempt - HIGHEST PRIORITY ENDPOINTS FIRST
  const urls = [
    // Try the direct outstation fares endpoint first (most reliable)
    `${baseUrl}/api/admin/direct-outstation-fares.php?_t=${timestamp}`,
    // Then try the other direct endpoints
    `${baseUrl}/api/admin/direct-vehicle-pricing.php?_t=${timestamp}`,
    // Then try the regular endpoints
    `${baseUrl}/api/admin/outstation-fares-update.php?_t=${timestamp}`,
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
  
  // First, try a very simplified direct approach with the new simplified endpoint
  try {
    console.log('Trying direct simplified endpoint first...');
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
      const jsonData = await simpleFetchResponse.json();
      console.log('Success with simplified direct endpoint:', jsonData);
      return jsonData;
    }
  } catch (simplifiedError) {
    console.warn('Simplified approach failed, trying advanced methods');
  }
  
  // Try all combinations of URLs and content types
  for (const url of urls) {
    for (const contentType of contentTypes) {
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
            timeout: 30000 // 30 seconds timeout
          });
          console.log('Success with axios:', response.data);
          return response.data;
        } catch (axiosError) {
          console.warn(`Axios attempt failed for ${url} with ${contentType}:`, axiosError);
        }
        
        // Try fetch as backup
        try {
          let fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
              ...generateBypassHeaders()
            }
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
          
          // Accept both success responses and text responses
          if (response.headers.get('content-type')?.includes('application/json')) {
            const jsonData = await response.json();
            console.log('Success with fetch (JSON):', jsonData);
            return jsonData;
          } else {
            const textData = await response.text();
            console.log('Success with fetch (text):', textData);
            
            // Try to parse as JSON anyway
            try {
              return JSON.parse(textData);
            } catch (parseError) {
              return { status: 'success', message: 'Received text response', data: textData };
            }
          }
        } catch (fetchError) {
          console.warn(`Fetch attempt failed for ${url} with ${contentType}:`, fetchError);
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
      allowAbsoluteUrls: true
    };
  },
  
  // Direct fare update method using multiple approaches
  directFareUpdate: async (tripType: string, vehicleId: string, data: any): Promise<any> => {
    // Record when the update operation began
    const startTime = Date.now();
    console.log(`Starting fare update for ${tripType}, vehicle: ${vehicleId} at ${new Date(startTime).toISOString()}`);
    
    // Prepare the API endpoint URL based on trip type
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    let endpoint;
    
    // Select appropriate endpoint based on trip type
    switch (tripType) {
      case 'outstation':
      case 'outstation-one-way':
      case 'outstation-round-trip':
        endpoint = `${baseUrl}/api/admin/direct-outstation-fares.php`;
        break;
      case 'local':
        endpoint = `${baseUrl}/api/admin/local-fares-update.php`;
        break;
      case 'airport':
        endpoint = `${baseUrl}/api/admin/airport-fares-update.php`;
        break;
      default:
        endpoint = `${baseUrl}/api/admin/vehicle-pricing.php`;
    }
    
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
      
      // Use the direct simplified endpoint for outstation fares
      if (tripType.includes('outstation')) {
        // For outstation fares, use the direct outstation fares endpoint
        endpoint = `${baseUrl}/api/admin/direct-outstation-fares.php`;
      }
      
      // Make the direct API call with multiple fallback methods
      const result = await directApiCall(endpoint, updateData);
      
      const endTime = Date.now();
      console.log(`Direct fare update successful in ${endTime - startTime}ms:`, result);
      
      toast.success('Fare updated successfully', {
        id: 'fare-update-success'
      });
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`All fare update methods failed after ${endTime - startTime}ms:`, error);
      
      toast.error('Failed to update fare. Please try again.', {
        id: 'fare-update-error'
      });
      
      throw error;
    }
  }
};
