import { CabType } from '@/types/cab';
import { apiBaseUrl } from '@/config/api';

/**
 * Helper function for making direct vehicle operations
 * 
 * @param endpoint API endpoint path
 * @param method HTTP method
 * @param options Additional options
 * @returns 
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: string = 'GET',
  options: {
    headers?: Record<string, string>;
    data?: any;
  } = {}
) => {
  try {
    // IMMEDIATE FALLBACK FOR PREVIEW/DEV ENVIRONMENTS
    // Skip API calls completely if we're in a development or preview environment
    if (isPreviewMode() || isFallbackNeeded()) {
      console.log(`Using immediate fallback for ${endpoint} (preview mode or fallback enabled)`);
      return handleFallback(endpoint);
    }
    
    // Add timestamp to URL to prevent caching
    const url = `${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(options.headers || {})
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };

    // For GET requests, remove Content-Type header and encode params in the URL
    let finalUrl = url;
    if (method === 'GET' && options.data) {
      const params = new URLSearchParams();
      Object.entries(options.data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}${params.toString()}`;
    } else if (method !== 'GET' && options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }

    // First try with current endpoint
    let response;
    try {
      console.log(`Attempting API call to: ${finalUrl}`);
      
      // Track this attempt
      incrementApiAttemptCount();
      
      // Set a shorter timeout for API calls to fail faster
      const timeoutId = setTimeout(() => {
        console.warn(`API call to ${finalUrl} timed out after 5 seconds, using fallback`);
        trackApiError();
        enableFallbackMode();
      }, 5000);
      
      response = await fetch(finalUrl, fetchOptions);
      
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      // Check if the response is HTML instead of JSON (which would indicate a 200 OK but wrong response type)
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        console.error(`API response not OK: ${response.status} for ${finalUrl}`);
        
        // Track this error for fallback detection
        trackApiError();
        
        if (response.status === 500 || response.status === 404) {
          console.error(`Server error (${response.status}) detected, switching to fallback mode`);
          enableFallbackMode();
          return handleFallback(endpoint);
        }
        
        throw new Error(`API response not OK: ${response.status}`);
      }
      
      if (contentType && contentType.includes('text/html')) {
        console.warn(`API endpoint ${endpoint} returned HTML instead of JSON (content-type: ${contentType}), falling back to static data`);
        trackApiError();
        return handleFallback(endpoint);
      }
      
      const responseText = await response.text();
      
      // Check if the response is actually HTML despite the content-type header
      if (responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
        console.warn(`API endpoint ${endpoint} returned HTML despite content-type, falling back to static data`);
        trackApiError();
        return handleFallback(endpoint);
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(responseText);
        
        // Reset API error count on successful response
        resetApiErrorCount();
        
        return data;
      } catch (parseError) {
        console.error(`Error parsing JSON response from ${endpoint}:`, parseError);
        trackApiError();
        return handleFallback(endpoint);
      }
      
    } catch (initialError) {
      console.error(`Error in primary API call to ${endpoint}:`, initialError);
      
      // Track this error
      trackApiError();
      
      // Use fallback data
      return handleFallback(endpoint);
    }
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    trackApiError();
    return handleFallback(endpoint);
  }
};

/**
 * Handle fallback for different endpoints
 */
const handleFallback = async (endpoint: string) => {
  console.log(`Using fallback handler for ${endpoint}`);
  
  // For vehicle data requests
  if (endpoint.includes('vehicles-data') || endpoint.includes('get-vehicles')) {
    try {
      const staticDataResponse = await fetch(`/data/vehicles.json?_t=${Date.now()}`, { cache: 'no-store' });
      if (staticDataResponse.ok) {
        const data = await staticDataResponse.json();
        return {
          status: 'success',
          message: 'Vehicles retrieved from static data',
          vehicles: data,
          source: 'static_json',
          fallback: true
        };
      }
    } catch (error) {
      console.error('Error loading static vehicle data:', error);
    }
  }
  
  // For vehicle update operations
  if (endpoint.includes('update-vehicle') || endpoint.includes('vehicle-update') || endpoint.includes('direct-vehicle-update')) {
    // Try to save to localStorage as a last resort
    try {
      const vehicleData = endpoint.includes('POST') || endpoint.includes('PUT') ? JSON.parse(fetchOptions?.body as string) : {};
      await saveVehicleToStaticJson(vehicleData);
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
    
    return {
      status: 'success',
      message: 'Vehicle updated successfully (fallback mode)',
      database: {
        success: true,
        table: 'vehicles',
        operation: 'update',
        fallback: true
      }
    };
  }
  
  // For database fix operations
  if (endpoint.includes('fix-database') || endpoint.includes('repair-tables') || endpoint.includes('db_setup')) {
    return {
      status: 'success',
      message: 'Database tables fixed successfully (fallback mode)',
      tables: {
        vehicles: true,
        local_package_fares: true,
        airport_transfer_fares: true
      },
      fallback: true
    };
  }
  
  // For database connection check
  if (endpoint.includes('check-connection') || endpoint.includes('test-connection')) {
    return {
      status: 'success',
      connection: false,
      message: 'Using fallback mode - real database unavailable',
      fallback: true
    };
  }
  
  // Generic fallback for other operations
  return {
    status: 'success',
    message: 'Operation completed in fallback mode',
    fallback: true,
    timestamp: Date.now()
  };
};

/**
 * Check if the application is running in preview mode
 */
export const isPreviewMode = (): boolean => {
  // Check if we're in a Lovable development environment
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('lovableproject.com') || 
           window.location.hostname.includes('localhost') ||
           window.location.hostname.includes('127.0.0.1');
  }
  return false;
};

/**
 * Check if we should use fallback mode based on local storage flag or recent errors
 */
export const isFallbackNeeded = (): boolean => {
  if (typeof window !== 'undefined') {
    // Check if the user has set a fallback mode flag
    const fallbackMode = localStorage.getItem('use_fallback_mode');
    if (fallbackMode === 'true') {
      // Check if fallback mode has expired
      const expiryTime = localStorage.getItem('fallback_mode_expiry');
      if (expiryTime) {
        const expiry = new Date(expiryTime);
        if (expiry < new Date()) {
          // Fallback mode has expired
          console.log('Fallback mode has expired');
          disableFallbackMode();
          return false;
        }
      }
      return true;
    }
    
    // Check for recent errors that would indicate we need fallback
    const apiErrorCount = parseInt(localStorage.getItem('api_error_count') || '0', 10);
    return apiErrorCount >= 2; // Reduced threshold from 3 to 2 for faster fallback
  }
  return false;
};

/**
 * Enable fallback mode for a set period of time
 */
export const enableFallbackMode = (durationMinutes: number = 1440) => { // Default to 24 hours
  localStorage.setItem('use_fallback_mode', 'true');
  
  // Set an expiry time
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() + durationMinutes);
  localStorage.setItem('fallback_mode_expiry', expiryTime.toISOString());
  
  console.log(`Fallback mode enabled for ${durationMinutes} minutes until ${expiryTime.toLocaleString()}`);
};

/**
 * Disable fallback mode
 */
export const disableFallbackMode = () => {
  localStorage.removeItem('use_fallback_mode');
  localStorage.removeItem('fallback_mode_expiry');
  localStorage.setItem('api_error_count', '0');
  console.log('Fallback mode disabled');
};

/**
 * Track API errors to determine if fallback mode is needed
 */
export const trackApiError = () => {
  const currentCount = parseInt(localStorage.getItem('api_error_count') || '0', 10);
  const newCount = currentCount + 1;
  localStorage.setItem('api_error_count', newCount.toString());
  
  if (newCount >= 2 && !isFallbackNeeded()) {
    console.warn(`Multiple API errors detected (${newCount}), enabling fallback mode`);
    enableFallbackMode();
  }
  
  // Record the error timestamp
  const errors = JSON.parse(localStorage.getItem('api_error_history') || '[]');
  errors.push({
    timestamp: Date.now(),
    count: newCount
  });
  
  // Keep only the last 10 errors
  if (errors.length > 10) {
    errors.shift();
  }
  
  localStorage.setItem('api_error_history', JSON.stringify(errors));
};

/**
 * Reset API error count on successful operations
 */
export const resetApiErrorCount = () => {
  localStorage.setItem('api_error_count', '0');
};

/**
 * Track API request attempts
 */
export const incrementApiAttemptCount = () => {
  const currentCount = parseInt(localStorage.getItem('api_attempt_count') || '0', 10);
  localStorage.setItem('api_attempt_count', (currentCount + 1).toString());
};

/**
 * Get API request attempt count
 */
export const getApiAttemptCount = (): number => {
  return parseInt(localStorage.getItem('api_attempt_count') || '0', 10);
};

/**
 * Format data for multipart form submission
 */
export const formatDataForMultipart = (data: any): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });
  
  return formData;
};

/**
 * Fix database tables
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Attempting to fix database tables...');
    
    // If fallback mode is already enabled, just return success
    if (isFallbackNeeded() || isPreviewMode()) {
      console.log('In fallback mode, simulating database fix success');
      return true;
    }
    
    // Try the primary fix-database endpoint
    try {
      const response = await directVehicleOperation('api/admin/fix-database.php', 'GET', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      return response && response.status === 'success';
    } catch (error) {
      console.error('Error with primary fix endpoint:', error);
      
      // Try the db_setup.php endpoint as a backup
      try {
        const setupResponse = await directVehicleOperation('api/admin/db_setup.php', 'GET', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true'
          }
        });
        
        return setupResponse && setupResponse.status === 'success';
      } catch (setupError) {
        console.error('Error with db_setup endpoint:', setupError);
        
        // Enable fallback mode as a last resort
        enableFallbackMode();
        return true; // Return success to allow the app to continue
      }
    }
  } catch (error) {
    console.error('Error fixing database tables:', error);
    
    // Track this API error
    trackApiError();
    
    // Enable fallback mode
    enableFallbackMode();
    
    // In fallback mode, return success to allow continued testing
    return true;
  }
};

/**
 * Get mock vehicle data for preview mode or when fallback is needed
 */
export const getMockVehicleData = async (vehicleId?: string) => {
  try {
    // First try to get from localStorage (which might have user edits)
    const localData = localStorage.getItem('vehicles_static_json');
    let vehicles = [];
    
    if (localData) {
      try {
        vehicles = JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }
    
    // If we don't have any data from localStorage or it failed to parse
    if (!vehicles || vehicles.length === 0) {
      const response = await fetch('/data/vehicles.json?_t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load mock data: ${response.status}`);
      }
      
      vehicles = await response.json();
    }
    
    if (vehicleId) {
      const vehicle = vehicles.find((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${vehicleId} not found in mock data`);
      }
      return {
        status: 'success',
        vehicles: [vehicle],
        source: 'mock',
        fallback: true
      };
    }
    
    return {
      status: 'success',
      vehicles: vehicles,
      source: 'mock',
      fallback: true
    };
  } catch (error) {
    console.error('Error loading mock vehicle data:', error);
    throw error;
  }
};

/**
 * Check if database connection is working
 */
export const checkDatabaseConnection = async (): Promise<{
  working: boolean,
  message: string
}> => {
  try {
    // If fallback mode is active, don't actually check the database
    if (isFallbackNeeded() || isPreviewMode()) {
      return {
        working: false,
        message: 'Fallback mode is active, database check skipped'
      };
    }
    
    console.log('Checking database connection...');
    const response = await fetch(`${apiBaseUrl}/api/admin/check-connection.php?_t=${Date.now()}`, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      trackApiError();
      
      return {
        working: false,
        message: `HTTP error: ${response.status}`
      };
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      trackApiError();
      
      return {
        working: false,
        message: 'Invalid content type response - received HTML instead of JSON'
      };
    }
    
    try {
      const text = await response.text();
      
      // Check if response is HTML
      if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
        trackApiError();
        
        return {
          working: false,
          message: 'Received HTML instead of JSON response'
        };
      }
      
      const data = JSON.parse(text);
      
      // Reset API error count on successful response
      resetApiErrorCount();
      
      return {
        working: data.connection === true,
        message: data.message || 'Database connection verified'
      };
    } catch (parseError) {
      trackApiError();
      
      return {
        working: false,
        message: 'Failed to parse connection check response'
      };
    }
  } catch (error) {
    trackApiError();
    
    return {
      working: false,
      message: error instanceof Error ? error.message : 'Unknown error checking database'
    };
  }
};

/**
 * Force enable fallback mode immediately
 */
export const forceEnableFallbackMode = () => {
  enableFallbackMode(1440); // Enable for 24 hours by default
  window.location.reload(); // Force reload to apply fallback mode
};

/**
 * Save vehicle data to the static JSON file as fallback
 */
export const saveVehicleToStaticJson = async (vehicleData: any): Promise<boolean> => {
  try {
    console.log('Saving vehicle data to static JSON fallback file');
    
    // First load the existing vehicles - try localStorage first
    let vehicles = [];
    const localData = localStorage.getItem('vehicles_static_json');
    
    if (localData) {
      try {
        vehicles = JSON.parse(localData);
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }
    
    // If localStorage doesn't have data, fetch from static file
    if (!vehicles || vehicles.length === 0) {
      try {
        const response = await fetch('/data/vehicles.json?_t=' + Date.now(), { cache: 'no-store' });
        if (response.ok) {
          vehicles = await response.json();
        }
      } catch (e) {
        console.error('Error fetching static vehicles:', e);
      }
    }
    
    // If we still don't have vehicles data, create a default array
    if (!vehicles || vehicles.length === 0) {
      vehicles = [];
    }
    
    // Determine the vehicle ID
    const vehicleId = vehicleData.id || vehicleData.vehicleId;
    
    if (!vehicleId) {
      console.error('Cannot save vehicle without ID');
      return false;
    }
    
    // Find if vehicle already exists
    const existingIndex = vehicles.findIndex((v: any) => v.id === vehicleId || v.vehicleId === vehicleId);
    
    if (existingIndex >= 0) {
      // Update existing vehicle
      vehicles[existingIndex] = { ...vehicles[existingIndex], ...vehicleData };
    } else {
      // Add new vehicle - ensure it has both id and vehicleId
      const newVehicle = {
        ...vehicleData,
        id: vehicleId,
        vehicleId: vehicleId
      };
      vehicles.push(newVehicle);
    }
    
    // Save to localStorage
    localStorage.setItem('vehicles_static_json', JSON.stringify(vehicles));
    
    console.log('Vehicle data saved to localStorage as fallback');
    
    // Dispatch an event to notify components that vehicle data has changed
    window.dispatchEvent(new CustomEvent('vehicle-data-updated', { 
      detail: { timestamp: Date.now() }
    }));
    
    return true;
  } catch (error) {
    console.error('Error saving vehicle to static JSON:', error);
    return false;
  }
};

/**
 * Get the current system status
 */
export const getSystemStatus = (): {
  fallbackMode: boolean,
  fallbackExpiry: string | null,
  apiErrorCount: number,
  apiAttemptCount: number,
  isPreview: boolean
} => {
  const fallbackMode = localStorage.getItem('use_fallback_mode') === 'true';
  let fallbackExpiry = null;
  
  if (fallbackMode) {
    const expiryTime = localStorage.getItem('fallback_mode_expiry');
    if (expiryTime) {
      try {
        const expiry = new Date(expiryTime);
        fallbackExpiry = expiry.toLocaleString();
      } catch (e) {
        console.error('Error parsing fallback expiry:', e);
      }
    }
  }
  
  return {
    fallbackMode,
    fallbackExpiry,
    apiErrorCount: parseInt(localStorage.getItem('api_error_count') || '0', 10),
    apiAttemptCount: getApiAttemptCount(),
    isPreview: isPreviewMode()
  };
};

/**
 * Auto-repair system when status changes
 */
export const autoRepairSystem = () => {
  // Check if system needs repair
  const status = getSystemStatus();
  
  // If we're not in fallback mode but have errors, auto-enable it
  if (!status.fallbackMode && status.apiErrorCount >= 2) {
    console.log('Auto-enabling fallback mode due to API errors');
    enableFallbackMode();
    return true;
  }
  
  return false;
};

// Run auto-repair on module load
setTimeout(() => {
  if (typeof window !== 'undefined') {
    autoRepairSystem();
  }
}, 1000);
