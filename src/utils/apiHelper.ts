
import { toast } from 'sonner';
import { apiBaseUrl, directVehicleHeaders, apiTimeout } from '@/config/api';
import { formatDataForMultipart } from '@/config/requestConfig';

/**
 * Perform direct vehicle operations (create, update, delete)
 * This function handles both JSON and FormData submission
 */
export const directVehicleOperation = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  data?: any
): Promise<any> => {
  try {
    // Add timestamp to prevent caching
    const baseUrl = `${apiBaseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    let url = baseUrl;
    console.log(`Making ${method} request to ${url}`);
    
    const headers = {
      ...directVehicleHeaders,
      'X-Admin-Mode': 'true',
    };
    
    let options: RequestInit = {
      method,
      headers,
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    };
    
    if (data) {
      if (method === 'GET') {
        // For GET requests, add data to URL as query params
        const queryParams = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `&${queryString}`;
        }
      } else {
        // Always use FormData for more reliable PHP compatibility
        delete headers['Content-Type']; // Let browser set the content type with boundary
        
        const formData = new FormData();
        // Handle object values specially for PHP compatibility
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined || value === null) continue;
          
          if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
            formData.append(key, JSON.stringify(value));
          } else {
            // For arrays, append each value with the same key
            if (Array.isArray(value)) {
              value.forEach(item => formData.append(`${key}[]`, String(item)));
            } else {
              formData.append(key, String(value));
            }
          }
        }
        
        options.body = formData;
      }
    }
    
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiTimeout);
    options.signal = controller.signal;
    
    // Make the request
    console.log('Request options:', options);
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`API endpoint not found: ${endpoint}`);
      }
      
      // Try to get error text
      let errorText;
      try {
        errorText = await response.text();
        console.error('Error response:', errorText);
      } catch (e) {
        errorText = `Status ${response.status}`;
      }
      
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    // Try to parse as JSON first
    try {
      const result = await response.json();
      console.log('API response:', result);
      return result;
    } catch (parseError) {
      // If can't parse as JSON, return the raw text
      const text = await response.text();
      console.log('API response (text):', text);
      return { raw: text, success: true };
    }
  } catch (error: any) {
    console.error(`Direct vehicle operation failed: ${error.message}`);
    toast.error(`Operation failed: ${error.message}`);
    throw error;
  }
};

/**
 * Check if the API is healthy
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const url = `${apiBaseUrl}/api/status.php?_t=${Date.now()}`;
    console.log(`Checking API health at ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'X-Health-Check': 'true',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      console.warn(`API health check failed with status ${response.status}`);
      return false;
    }
    
    try {
      const data = await response.json();
      return data.status === 'ok' || data.status === 'success';
    } catch (parseError) {
      // If we can't parse the JSON, the API is probably not healthy
      console.warn('API health check failed - invalid JSON response');
      return false;
    }
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

/**
 * Fix database tables for vehicle management
 * This function calls the fix-database-tables.php endpoint
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    console.log('Attempting to fix database tables...');
    
    const url = `${apiBaseUrl}/api/admin/fix-vehicle-tables.php?_t=${Date.now()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...directVehicleHeaders,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Admin-Mode': 'true',
      },
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      console.warn(`Fix database tables failed with status ${response.status}`);
      return false;
    }
    
    try {
      const result = await response.json();
      
      if (result.status === 'success') {
        console.log('Database tables fixed successfully:', result);
        return true;
      } else {
        console.error('Failed to fix database tables:', result.message || 'Unknown error');
        return false;
      }
    } catch (parseError) {
      console.error('Failed to parse fix database tables response:', parseError);
      return false;
    }
  } catch (error: any) {
    console.error(`Error fixing database tables: ${error.message}`);
    return false;
  }
};

/**
 * Error handler for vehicle operations - provides additional context for debugging
 */
export const handleVehicleError = (error: any, operation: string): string => {
  console.error(`Vehicle ${operation} error:`, error);
  
  let message = error?.message || `Failed to ${operation} vehicle`;
  
  // Check for specific error types
  if (error.name === 'AbortError') {
    message = `Operation timed out while trying to ${operation} vehicle`;
  } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    message = `Network error: Unable to connect to the server`;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  toast.error(message);
  return message;
};
