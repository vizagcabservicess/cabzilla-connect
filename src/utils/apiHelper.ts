
import axios, { AxiosRequestConfig } from 'axios';

// Debug mode and preview mode flags
const DEBUG = true;
const IS_PREVIEW_MODE = window.location.href.includes('preview') || window.location.href.includes('localhost');

/**
 * Function to check if we're in preview mode
 */
export const isPreviewMode = () => {
  return IS_PREVIEW_MODE;
};

/**
 * Check database connection
 * @returns Promise with connection status
 */
export interface DatabaseConnectionResponse {
  connection: boolean;
  message?: string;
  version?: string;
  timeStamp?: number;
}

export async function checkDatabaseConnection(): Promise<DatabaseConnectionResponse> {
  try {
    console.log('Checking database connection...');
    
    // Try the dedicated database-check endpoint
    const response = await directVehicleOperation('api/admin/check-database.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response && response.connection === true) {
      console.log('Database connection successful', response);
      return response;
    }
    
    if (IS_PREVIEW_MODE) {
      console.log('[PREVIEW MODE] Simulating successful database connection');
      return {
        connection: true,
        message: 'Preview mode simulated connection',
        version: 'Preview',
        timeStamp: Date.now()
      };
    }
    
    console.warn('Database connection failed', response);
    return {
      connection: false,
      message: response?.message || 'Failed to connect to database',
      timeStamp: Date.now()
    };
  } catch (error) {
    console.error('Error checking database connection:', error);
    
    if (IS_PREVIEW_MODE) {
      return {
        connection: true,
        message: 'Preview mode simulated connection',
        version: 'Preview',
        timeStamp: Date.now()
      };
    }
    
    return {
      connection: false,
      message: error instanceof Error ? error.message : 'Unknown error checking database connection',
      timeStamp: Date.now()
    };
  }
}

/**
 * Format data for multipart form submission
 * @param data Object containing data to format
 * @returns FormData object
 */
export function formatDataForMultipart(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      
      if (value === undefined || value === null) {
        // Skip undefined or null values
        continue;
      }
      
      if (Array.isArray(value)) {
        // Handle arrays by appending each item with array notation in the key
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            formData.append(`${key}[${index}]`, JSON.stringify(item));
          } else {
            formData.append(`${key}[${index}]`, String(item));
          }
        });
      } else if (typeof value === 'object' && value !== null && !(value instanceof File)) {
        // Handle objects by converting to JSON string
        formData.append(key, JSON.stringify(value));
      } else {
        // Handle primitives and Files
        formData.append(key, value);
      }
    }
  }
  
  return formData;
}

/**
 * Directly call a vehicle operation API endpoint
 * @param endpoint The API endpoint to call
 * @param method HTTP method to use (GET, POST, PUT, DELETE)
 * @param options Additional request options (headers, data, etc.)
 * @returns Promise that resolves with the API response
 */
export async function directVehicleOperation(
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE', 
  options: { 
    headers?: Record<string, string>, 
    data?: any,
    params?: Record<string, string>
  } = {}
): Promise<any> {
  // Check preview mode
  if (IS_PREVIEW_MODE && endpoint.includes('admin')) {
    console.log(`[PREVIEW MODE] Simulating API call to ${endpoint} with method ${method}`);
    
    // Return mock success for vehicle operations in preview mode
    if (endpoint.includes('vehicle')) {
      console.log(`[PREVIEW MODE] Returning mock success for vehicle operation`, options.data);
      return { status: 'success', message: 'Operation simulated in preview mode' };
    }
  }
  
  try {
    // Default headers all requests should use
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Bypass-Cache': 'true',
      'X-Force-Refresh': 'true',
      'X-Database-First': 'true',
      'X-Requested-With': 'XMLHttpRequest',
      'X-No-HTML': 'true' // Signal to avoid HTML responses
    };
    
    // Ensure endpoint has correct format
    let url = endpoint;
    if (!url.startsWith('http') && !url.startsWith('/')) {
      url = `/${url}`;
    }
    
    // If URL starts with /api/, make it relative to prevent CORS issues
    if (url.startsWith('/api/')) {
      url = `api${url.substring(4)}`;
    }
    
    if (DEBUG) {
      console.log(`API Request: ${method} ${url}`);
      if (options.data) {
        console.log('Request data:', options.data);
      }
    }
    
    // Prepare request config
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      ...(options.data && { data: options.data }),
      ...(options.params && { params: options.params })
    };
    
    // Make the request
    const response = await axios(config);
    
    // Check if the response is HTML instead of JSON (common error)
    const contentType = response.headers['content-type'] || '';
    
    if (contentType.includes('text/html') || 
        (typeof response.data === 'string' && response.data.trim().startsWith('<'))) {
      console.error('Received HTML response instead of JSON:', response);
      
      // Extract error message from HTML if possible
      let errorMsg = 'Received HTML response instead of JSON';
      if (typeof response.data === 'string') {
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
          errorMsg = `Server error: ${titleMatch[1]}`;
        }
      }
      
      // Create a structured error response
      return {
        status: 'error',
        message: errorMsg,
        isHtmlResponse: true,
        originalData: typeof response.data === 'string' ? response.data.substring(0, 500) + '...' : 'Non-string HTML response'
      };
    }
    
    if (DEBUG) {
      console.log(`API Response from ${url}:`, response.data);
    }
    
    return response.data;
  } catch (error: any) {
    console.error(`API Error (${endpoint}):`, error);
    
    // Handle HTML responses in error cases
    if (error.response) {
      const contentType = error.response.headers['content-type'] || '';
      
      if (contentType.includes('text/html') || 
          (typeof error.response.data === 'string' && error.response.data.trim().startsWith('<'))) {
        console.error('Received HTML error response:', error.response);
        
        // Extract error message from HTML if possible
        let errorMsg = 'Received HTML error response';
        if (typeof error.response.data === 'string') {
          const titleMatch = error.response.data.match(/<title>(.*?)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            errorMsg = `Server error: ${titleMatch[1]}`;
          }
        }
        
        // Add debugging info for preview mode
        if (IS_PREVIEW_MODE) {
          console.log('[PREVIEW MODE] Returning mock response due to HTML error');
          return { 
            status: 'success', 
            message: 'Mock response in preview mode (original request failed)',
            debugError: errorMsg 
          };
        }
        
        return {
          status: 'error',
          message: errorMsg,
          isHtmlResponse: true,
          originalData: typeof error.response.data === 'string' ? error.response.data.substring(0, 500) + '...' : 'Non-string HTML response'
        };
      }
      
      // Return the error response data if available
      return error.response.data || { status: 'error', message: error.message };
    }
    
    // Add mock response for preview mode
    if (IS_PREVIEW_MODE) {
      console.log('[PREVIEW MODE] Returning mock response due to error');
      return { 
        status: 'success', 
        message: 'Mock response in preview mode (original request failed)',
        debugError: error.message 
      };
    }
    
    // Otherwise return a generic error response
    return { status: 'error', message: error.message };
  }
}

/**
 * Fix database tables by resetting and recreating them
 * @returns Promise<boolean> True if fixed successfully
 */
export async function fixDatabaseTables(): Promise<boolean> {
  try {
    console.log('Attempting to fix database tables...');
    
    // First, try the dedicated fix-database endpoint
    const fixResponse = await directVehicleOperation('api/admin/fix-database.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': 'true'
      },
      data: {
        force: true,
        reset: true,
        recreate: true
      }
    });
    
    if (fixResponse && fixResponse.status === 'success') {
      console.log('Database tables fixed successfully with fix-database.php', fixResponse);
      return true;
    }
    
    console.warn('Primary fix method failed, trying database initialization...', fixResponse);
    
    // If that fails, try the database initialization endpoint
    const initResponse = await directVehicleOperation('api/admin/init-database.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Creation': 'true'
      },
      data: {
        force: true,
        reset: true,
        allowReinitialize: true
      }
    });
    
    if (initResponse && initResponse.status === 'success') {
      console.log('Database tables initialized successfully with init-database.php', initResponse);
      return true;
    }
    
    console.warn('Both fix methods failed, trying sync endpoints...', initResponse);
    
    // Try to sync fares as a last resort
    try {
      const syncLocal = await directVehicleOperation('api/admin/sync-local-fares.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': 'true'
        },
        data: {
          sync: true,
          applyDefaults: true,
          force: true
        }
      });
      
      const syncAirport = await directVehicleOperation('api/admin/sync-airport-fares.php', 'POST', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': 'true'
        },
        data: {
          sync: true,
          applyDefaults: true,
          force: true
        }
      });
      
      console.log('Sync results:', { local: syncLocal, airport: syncAirport });
      
      // If either sync worked, consider it a partial success
      if ((syncLocal && syncLocal.status === 'success') || 
          (syncAirport && syncAirport.status === 'success')) {
        console.log('Partial database fix via sync successful');
        return true;
      }
    } catch (syncError) {
      console.error('Error during sync attempts:', syncError);
    }
    
    console.error('All fix methods failed');
    return false;
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
}

/**
 * Force a reload of vehicle data from persistent storage
 */
export async function forceRefreshVehicles(): Promise<boolean> {
  try {
    console.log('Forcing refresh of vehicle data from persistent storage...');
    
    // Try the reload-vehicles.php endpoint
    const response = await directVehicleOperation('api/admin/reload-vehicles.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response && response.status === 'success') {
      console.log('Successfully refreshed vehicles from persistent storage', response);
      return true;
    }
    
    console.warn('Primary refresh method failed, trying backup method...', response);
    
    // Try direct-vehicle-modify.php as a backup
    const backupResponse = await directVehicleOperation('api/admin/direct-vehicle-modify.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      params: {
        action: 'load',
        force: 'true',
        reload: 'true',
        includeInactive: 'true',
        _t: Date.now().toString()
      }
    });
    
    if (backupResponse && (backupResponse.status === 'success' || backupResponse.vehicles)) {
      console.log('Successfully refreshed vehicles using backup method', backupResponse);
      return true;
    }
    
    console.error('All refresh methods failed');
    return false;
  } catch (error) {
    console.error('Error refreshing vehicles:', error);
    return false;
  }
}
