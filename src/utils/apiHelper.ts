import { toast } from 'sonner';
import { apiBaseUrl, forceRefreshHeaders, getApiUrl } from '@/config/api';

/**
 * Database connection check response type
 */
export interface DatabaseConnectionResponse {
  status: 'success' | 'error';
  connection: boolean;
  message?: string;
  version?: string;
  timestamp: number;
}

/**
 * Check database connection directly
 * @returns Promise<DatabaseConnectionResponse> - Connection check result
 */
export const checkDatabaseConnection = async (): Promise<DatabaseConnectionResponse> => {
  try {
    // Create a proper URL using the getApiUrl helper
    const endpoint = 'api/direct-check-connection.php';
    const url = getApiUrl(`${endpoint}?_t=${Date.now()}`);
    
    console.log('Checking database connection at:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error('Database connection check failed with status:', response.status);
      return {
        status: 'error',
        connection: false,
        message: `HTTP error: ${response.status}`,
        timestamp: Date.now()
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking database connection:', error);
    return {
      status: 'error',
      connection: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: Date.now()
    };
  }
};

/**
 * Fix database tables and structure
 * @returns Promise<boolean> - true if fix was successful
 */
export const fixDatabaseTables = async () => {
  try {
    console.log('Attempting to fix database tables...');
    
    // First check database connection
    const connectionCheck = await checkDatabaseConnection();
    if (!connectionCheck.connection) {
      console.error('Database connection check failed before attempting to fix tables');
      toast.error('Database connection check failed');
      return false;
    }
    
    // Use the proper URL formatting
    const endpoint = 'api/admin/fix-database.php';
    const url = getApiUrl(`${endpoint}?_t=${Date.now()}`);
    
    console.log('Fixing database tables at:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fix database tables with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.status === 'success';
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};

/**
 * Determine if the app is running in preview mode
 * @returns boolean - true if in preview mode
 */
export const isPreviewMode = () => {
  return window.location.hostname.includes('lovableproject.com') || 
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1');
};

/**
 * Normalize URL for API requests
 * @param endpoint - API endpoint path
 * @returns Properly formatted URL
 */
const normalizeUrl = (endpoint: string): string => {
  // If endpoint is already a full URL, return it
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Make sure endpoint starts with a slash if needed
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If apiBaseUrl is empty, use relative path
  if (!apiBaseUrl) {
    return cleanEndpoint;
  }
  
  // Ensure there's no double slash when joining base and endpoint
  return `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}${cleanEndpoint}`;
};

/**
 * Force a refresh of vehicle data from database first, then persistent storage
 * @returns Promise<boolean> - true if refresh was successful
 */
export const forceRefreshVehicles = async () => {
  try {
    // Create descriptive log message for debugging
    console.log('Starting vehicle refresh from database...');
    
    // Use the getApiUrl helper for proper URL formatting with timestamp to prevent caching
    const endpoint = 'api/admin/reload-vehicles.php';
    const url = getApiUrl(`${endpoint}?_t=${Date.now()}`);
    console.log('Refresh URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true',
        'X-Database-First': 'true' // Signal to prioritize database
      },
      // This helps ensure we're not getting cached responses
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh vehicles:', errorText);
      
      // Try alternative endpoint if primary fails
      console.log('Trying alternative refresh endpoint...');
      const altEndpoint = 'api/admin/direct-vehicle-modify.php';
      const altUrl = getApiUrl(`${altEndpoint}?action=load&_t=${Date.now()}`);
      console.log('Alternative URL:', altUrl);
      
      const altResponse = await fetch(altUrl, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true',
          'X-Database-First': 'true' // Signal to prioritize database
        },
        cache: 'no-store'
      });
      
      if (!altResponse.ok) {
        console.error('Alternative refresh also failed:', await altResponse.text());
        return false;
      }
      
      const altData = await altResponse.json();
      console.log('Alternative refresh response:', altData);
      return altData.status === 'success';
    }
    
    const data = await response.json();
    console.log('Force refresh response:', data);
    return data.status === 'success';
  } catch (error) {
    console.error('Error forcing refresh of vehicles:', error);
    return false;
  }
};

/**
 * Format data for multipart form submission
 * @param data Object to format as FormData
 * @returns FormData object
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    if (value === undefined || value === null) {
      return;
    }
    
    if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === 'object' && !(value instanceof File)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, value);
    }
  });
  
  return formData;
};

/**
 * Perform a direct operation on vehicle data
 * @param endpoint API endpoint to call
 * @param method HTTP method to use
 * @param options Additional request options
 * @returns Promise with response data
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  options: {
    headers?: Record<string, string>;
    data?: any;
  } = {}
) => {
  try {
    // Use the getApiUrl helper for proper URL formatting
    let formattedEndpoint = endpoint;
    
    // If endpoint doesn't start with api/, add it
    if (!endpoint.startsWith('api/') && !endpoint.startsWith('/api/')) {
      formattedEndpoint = `api/${endpoint}`;
    }
    
    // Add timestamp parameter to prevent caching
    if (!formattedEndpoint.includes('?')) {
      formattedEndpoint = `${formattedEndpoint}?_t=${Date.now()}`;
    } else {
      formattedEndpoint = `${formattedEndpoint}&_t=${Date.now()}`;
    }
    
    const url = getApiUrl(formattedEndpoint);
    console.log(`Performing ${method} operation to: ${url}`);
    
    // Prepare headers
    const headers = {
      ...forceRefreshHeaders,
      'X-Database-First': 'true', // Signal to prioritize database
      ...(options.headers || {})
    };
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store', // Ensure we don't use cached responses
      mode: 'cors' // Explicitly enable CORS
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && options.data) {
      // Set appropriate content type if not specified
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      
      if (headers['Content-Type'] === 'application/json') {
        // Ensure vehicle ID is included in both formats for compatibility
        if (options.data.vehicleId && !options.data.vehicle_id) {
          options.data.vehicle_id = options.data.vehicleId;
        } else if (options.data.vehicle_id && !options.data.vehicleId) {
          options.data.vehicleId = options.data.vehicle_id;
        }
        
        // Stringify the data properly
        requestOptions.body = JSON.stringify(options.data);
        console.log('JSON request body:', requestOptions.body);
      } else if (headers['Content-Type']?.includes('multipart/form-data')) {
        // Remove the Content-Type header to let the browser set it with boundary
        delete headers['Content-Type'];
        requestOptions.body = formatDataForMultipart(options.data);
      } else {
        // Default to form data
        requestOptions.body = formatDataForMultipart(options.data);
      }
    }
    
    // Make the request
    const response = await fetch(url, requestOptions);
    
    // Check content type to handle different response formats
    const contentType = response.headers.get('content-type') || '';
    
    // First try to get the response as text
    const text = await response.text();
    console.log('Raw response text:', text);
    console.log('Response status:', response.status, 'Content-Type:', contentType);
    
    // Check if the text is empty
    if (!text || text.trim() === '') {
      console.warn('Received empty response');
      return { status: 'success', message: 'Operation completed but returned empty response' };
    }
    
    // Check if response is HTML instead of JSON (common error with PHP endpoints)
    if (text.includes('<!DOCTYPE html>') || text.includes('<html>') || 
        text.startsWith('<') || text.includes('<?php')) {
      console.error('Received HTML response instead of JSON:', text.substring(0, 200));
      throw new Error('Received HTML instead of JSON. The API endpoint is not configured correctly.');
    }
    
    // Then try to parse it as JSON
    try {
      const jsonData = JSON.parse(text);
      
      // Check if response is OK
      if (!response.ok) {
        console.error(`Error in directVehicleOperation (${response.status}):`, jsonData);
        throw new Error(`API request failed: ${response.status}. ${jsonData.message || ''}`);
      }
      
      return jsonData;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError, 'Raw text:', text);
      
      // If we received HTML but failed to detect it earlier, throw a more specific error
      if (text.includes('<') && text.includes('>')) {
        throw new Error('Received invalid response format (possibly HTML). Check server configuration.');
      }
      
      // If the text starts with any non-JSON character, provide a more descriptive error
      if (text.trim() && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
        throw new Error(`Invalid JSON response format. Response starts with: ${text.substring(0, 20)}...`);
      }
      
      throw new Error(`Failed to parse JSON response: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    throw error;
  }
};
