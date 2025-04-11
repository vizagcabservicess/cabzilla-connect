
// API configuration

// Base API URL - auto-detect between development and production
export const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://vizagup.com' 
  : '';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  // For relative URLs in development (working with Vite's proxy)
  if (process.env.NODE_ENV !== 'production') {
    // Ensure path starts with a slash if it doesn't already
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return normalizedPath;
  }
  
  // For production, use the full URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
  return fullUrl;
};

// Force refresh headers for API requests to bypass cache
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Default headers for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Vehicle ID mapping to help with database/UI consistency
export const vehicleIdMapping = {
  // UI id to database column
  'MPV': 'innova',
  'innova_crysta': 'innova',
  'innova_hycross': 'innova',
  'etios': 'sedan',
  'dzire_cng': 'sedan',
  'tempo_traveller': 'tempo',
  'Toyota': 'sedan',
  'Dzire CNG': 'sedan',
  
  // Database column to UI id (for reverse mapping)
  'sedan': 'sedan',
  'ertiga': 'ertiga',
  'innova': 'innova',
  'tempo': 'tempo',
  'luxury': 'luxury',
  
  // Numeric ID to column mapping
  '1': 'sedan',
  '2': 'ertiga',
  '1266': 'innova',
  '1299': 'sedan',  // Etios
  '1311': 'sedan',  // Dzire CNG
  '1313': 'innova', // Innova Crysta
  '1314': 'tempo'   // Tempo Traveller
};

// Get dynamic vehicle mapping from database
export const getDynamicVehicleMapping = async (): Promise<Record<string, string>> => {
  try {
    // Get token to include in request
    const token = localStorage.getItem('authToken');
    let requestHeaders = { ...defaultHeaders };
    
    // If no token in localStorage, try to get from user object
    if (!token || token === 'null' || token === 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData?.token) {
            requestHeaders['Authorization'] = `Bearer ${userData.token}`;
            // Store it back in localStorage for future use
            localStorage.setItem('authToken', userData.token);
            localStorage.setItem('isLoggedIn', 'true');
            console.log('Recovered auth token from user object for vehicle mapping');
          }
        } catch (e) {
          console.error('Error retrieving token from user object:', e);
        }
      }
    } else {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    // Add cache busting timestamp
    const timestamp = Date.now();
    
    // Sync tour_fares table with vehicles first
    const syncResponse = await fetch(getApiUrl(`/api/admin/db_setup_tour_fares.php?_t=${timestamp}`), {
      method: 'GET',
      headers: {
        ...requestHeaders,
        ...forceRefreshHeaders
      }
    });
    
    if (!syncResponse.ok) {
      console.error('Failed to sync tour_fares table:', syncResponse.statusText);
      
      // Try again with token recovery
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          if (userData?.token) {
            const retryResponse = await fetch(getApiUrl(`/api/admin/db_setup_tour_fares.php?_t=${timestamp+1}`), {
              method: 'GET',
              headers: {
                ...defaultHeaders,
                'Authorization': `Bearer ${userData.token}`,
                ...forceRefreshHeaders
              }
            });
            
            if (retryResponse.ok) {
              const syncData = await retryResponse.json();
              console.log('Tour fares table synced with vehicles on second attempt:', syncData);
              
              // Create dynamic mapping from response
              const dynamicMapping = { ...vehicleIdMapping };
              
              if (syncData.data && syncData.data.vehicles) {
                syncData.data.vehicles.forEach((vehicle: any) => {
                  // Add mapping based on database ID to column name
                  const columnName = vehicle.vehicle_id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                  dynamicMapping[vehicle.id] = columnName;
                  
                  // Also add name-based mapping for UI display
                  dynamicMapping[vehicle.name] = columnName;
                });
              }
              
              console.log('Extended vehicle mapping:', dynamicMapping);
              return dynamicMapping;
            }
          }
        } catch (e) {
          console.error('Error in retry attempt for vehicle mapping:', e);
        }
      }
      
      return vehicleIdMapping;
    }
    
    const syncData = await syncResponse.json();
    console.log('Tour fares table synced with vehicles:', syncData);
    
    // Create dynamic mapping from response
    const dynamicMapping = { ...vehicleIdMapping };
    
    if (syncData.data && syncData.data.vehicles) {
      syncData.data.vehicles.forEach((vehicle: any) => {
        // Add mapping based on database ID to column name
        const columnName = vehicle.vehicle_id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        dynamicMapping[vehicle.id] = columnName;
        
        // Also add name-based mapping for UI display
        dynamicMapping[vehicle.name] = columnName;
      });
    }
    
    console.log('Extended vehicle mapping:', dynamicMapping);
    return dynamicMapping;
  } catch (error) {
    console.error('Error getting dynamic vehicle mapping:', error);
    return vehicleIdMapping;
  }
};

// Helper to get authorization header with token
export const getAuthorizationHeader = (): Record<string, string> => {
  let token = localStorage.getItem('authToken');
  
  // If token not found, try to retrieve from user object
  if (!token || token === 'null' || token === 'undefined') {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData?.token) {
          token = userData.token;
          // Store it back in localStorage for future use
          localStorage.setItem('authToken', token);
          localStorage.setItem('isLoggedIn', 'true');
          console.log('Retrieved and stored token from user object');
        }
      }
    } catch (e) {
      console.error('Error retrieving token from user object:', e);
    }
  }
  
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Debug utility function - helps track API issues
export const logApiError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    console.error('No response received. Request:', error.request);
  } else {
    console.error('Error message:', error.message);
  }
  
  console.error('Error config:', error.config);
  
  // Return a structured error object that can be used in UI
  return {
    message: error.response?.data?.message || error.message || 'Unknown error occurred',
    status: error.response?.status || 0,
    isNetworkError: !error.response,
    isServerError: error.response?.status >= 500,
    isAuthError: error.response?.status === 401 || error.response?.status === 403
  };
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  defaultHeaders,
  forceRefreshHeaders,
  vehicleIdMapping,
  getDynamicVehicleMapping,
  getAuthorizationHeader,
  logApiError
};
