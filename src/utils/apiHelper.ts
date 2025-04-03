
import { apiBaseUrl } from '@/config/api';
import { formatDataForMultipart } from '@/config/requestConfig';

/**
 * Check if we're running in the Lovable preview environment
 */
export const isPreviewMode = (): boolean => {
  return typeof window !== 'undefined' && 
    (window.location.hostname.includes('lovableproject.com') || 
     window.location.hostname.includes('lovable.dev') ||
     window.location.hostname.includes('localhost'));
};

// Re-export formatDataForMultipart from config/requestConfig
export { formatDataForMultipart };

/**
 * Unified API operation function for direct vehicle operations
 * @param endpoint - API endpoint to call
 * @param method - HTTP method (GET, POST, PUT, DELETE)
 * @param options - Additional options including headers and data
 * @returns Promise with the response data
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: string = 'GET',
  options: any = {}
): Promise<any> => {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
    
    // Extract headers and data from options
    let headers: Record<string, string> = {};
    let data: any = null;
    
    // Handle different ways headers and data might be provided
    if (options) {
      if (options.headers) {
        headers = { ...options.headers };
      }
      
      if (options.data) {
        data = options.data;
      }
      
      // Support for directly passed headers (for backward compatibility)
      const knownHeaderKeys = [
        'X-Admin-Mode', 'X-Debug', 'X-Force-Refresh',
        'Content-Type', 'Authorization', 'Cache-Control',
        'Pragma', 'Expires'
      ];
      
      // Check for known header keys in the root options object
      knownHeaderKeys.forEach(key => {
        const lowercaseKey = key.toLowerCase();
        if (options[key]) headers[key] = options[key];
        if (options[lowercaseKey]) headers[lowercaseKey] = options[lowercaseKey];
      });
      
      // If no data was explicitly provided, treat the rest of options as data
      if (!data) {
        // Filter out known header keys from options to create data
        data = { ...options };
        knownHeaderKeys.forEach(key => {
          delete data[key];
          delete data[key.toLowerCase()];
        });
        
        // Also remove headers and data properties if they exist
        delete data.headers;
        delete data.data;
        
        // Only set data if there are properties left
        if (Object.keys(data).length === 0) {
          data = null;
        }
      }
    }
    
    // Default headers for all requests
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Force-Refresh': 'true'
    };
    
    // Merge default headers with provided headers
    const finalHeaders = { ...defaultHeaders, ...headers };
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: finalHeaders,
      cache: 'no-store' as RequestCache
    };
    
    // Add body for non-GET requests if data is provided
    if (method !== 'GET' && data) {
      if (finalHeaders['Content-Type'] === 'application/x-www-form-urlencoded') {
        // Handle form URL encoded data
        requestOptions.body = new URLSearchParams(data).toString();
      } else if (finalHeaders['Content-Type']?.includes('multipart/form-data')) {
        // Handle multipart form data
        delete finalHeaders['Content-Type']; // Let browser set this with boundary
        requestOptions.body = formatDataForMultipart(data);
      } else {
        // Default to JSON
        requestOptions.body = JSON.stringify(data);
      }
    }
    
    // Handle GET requests with query parameters
    let finalUrl = url;
    if (method === 'GET' && data && Object.keys(data).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      // Append query parameters to URL if not empty
      const queryString = queryParams.toString();
      if (queryString) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    // Execute the fetch request
    const response = await fetch(finalUrl, requestOptions);
    
    // For preview mode, return mock response to avoid server errors
    if (!response.ok && isPreviewMode()) {
      console.warn(`API error ${response.status} in preview mode, returning mock data`);
      return { 
        status: 'success', 
        message: 'Preview mode: mock response',
        timestamp: new Date().toISOString()
      };
    }
    
    // Handle JSON response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      return jsonData;
    }
    
    // Handle text response
    const textData = await response.text();
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(textData);
    } catch (e) {
      // If not JSON, return text as is
      return { text: textData, status: response.ok ? 'success' : 'error' };
    }
  } catch (error) {
    console.error(`API Error (${method} ${endpoint}):`, error);
    
    // If in preview mode, return mock data
    if (isPreviewMode()) {
      console.warn('API error in preview mode, returning mock data');
      return { 
        status: 'success', 
        message: 'Preview mode: mock response for failed request',
        timestamp: new Date().toISOString()
      };
    }
    
    throw error;
  }
};

/**
 * Fix database tables - useful for recovery after errors
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    // Try multiple database fix endpoints for redundancy
    const fixEndpoints = [
      'api/admin/fix-database.php',
      'api/admin/fix-vehicle-tables.php',
      'api/admin/sync-airport-fares.php'
    ];
    
    // Try each endpoint in sequence
    for (const endpoint of fixEndpoints) {
      try {
        console.log(`Trying to fix database using endpoint: ${endpoint}`);
        const response = await directVehicleOperation(endpoint, 'GET', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'X-Force-Refresh': 'true'
          },
          _t: Date.now() // Add timestamp to prevent caching
        });
        
        if (response && response.status === 'success') {
          console.log(`Database fixed successfully using ${endpoint}`);
          return true;
        }
      } catch (endpointError) {
        console.error(`Error with fix endpoint ${endpoint}:`, endpointError);
        // Continue to the next endpoint
      }
    }
    
    // If all direct attempts failed, return false
    return false;
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};
