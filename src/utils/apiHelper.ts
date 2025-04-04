import { toast } from 'sonner';
import { apiBaseUrl, forceRefreshHeaders } from '@/config/api';

/**
 * Check database connection directly
 * @returns Promise<boolean> - true if connection successful
 */
export const checkDatabaseConnection = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/direct-check-connection.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      console.error('Database connection check failed with status:', response.status);
      return false;
    }
    
    const data = await response.json();
    return data.connection === true;
  } catch (error) {
    console.error('Error checking database connection:', error);
    return false;
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
    if (!connectionCheck) {
      console.error('Database connection check failed before attempting to fix tables');
      toast.error('Database connection check failed');
      return false;
    }
    
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php?_t=${Date.now()}`, {
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
 * Force a refresh of vehicle data from persistent storage or database
 * @returns Promise<boolean> - true if refresh was successful
 */
export const forceRefreshVehicles = async () => {
  try {
    console.log('Calling API:', `/api/admin/reload-vehicles.php?_t=${Date.now()}`);
    
    const response = await fetch(`${apiBaseUrl}/api/admin/reload-vehicles.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh vehicles:', errorText);
      
      // Try alternative endpoint if primary fails
      console.log('Trying alternative refresh endpoint...');
      const altResponse = await fetch(`${apiBaseUrl}/api/admin/refresh-vehicles.php?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true'
        }
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
    const url = new URL(`${apiBaseUrl}/${endpoint.startsWith('/') ? endpoint.slice(1) : endpoint}`);
    
    // Add any GET parameters from data object
    if (method === 'GET' && options.data) {
      Object.keys(options.data).forEach(key => {
        url.searchParams.append(key, String(options.data[key]));
      });
    }
    
    // Prepare headers
    const headers = {
      ...forceRefreshHeaders,
      ...(options.headers || {})
    };
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      credentials: 'include'
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && options.data) {
      if (headers['Content-Type'] === 'application/json') {
        requestOptions.body = JSON.stringify(options.data);
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
    const response = await fetch(url.toString(), requestOptions);
    
    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error in directVehicleOperation (${response.status}):`, errorText);
      throw new Error(`API request failed: ${response.status}. ${errorText}`);
    }
    
    // Parse JSON response
    try {
      const data = await response.json();
      return data;
    } catch (jsonError) {
      console.error('Error parsing JSON response:', jsonError);
      const text = await response.text();
      console.log('Raw response text:', text);
      throw new Error('Failed to parse JSON response');
    }
  } catch (error) {
    console.error('Error in directVehicleOperation:', error);
    throw error;
  }
};
