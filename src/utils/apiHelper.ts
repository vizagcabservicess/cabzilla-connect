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
    const url = `${apiBaseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    console.log(`Making ${method} request to ${url}`);
    
    const headers = {
      ...directVehicleHeaders,
      'X-Admin-Mode': 'true',
    };
    
    const options: RequestInit = {
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
        const queryString = new URLSearchParams(data).toString();
        url.concat(`&${queryString}`);
      } else {
        // For POST/PUT/DELETE, try to send as JSON by default
        options.body = JSON.stringify(data);
        headers['Content-Type'] = 'application/json';
      }
    }
    
    // Set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), apiTimeout);
    options.signal = controller.signal;
    
    // Make the request
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    
    // If response is not ok, try fallback approach with FormData
    if (!response.ok && data && method !== 'GET') {
      // Retry with FormData
      delete headers['Content-Type']; // Let browser set the content type
      
      const formData = formatDataForMultipart(data);
      options.body = formData;
      
      console.log('Retrying with FormData');
      const retryResponse = await fetch(url, options);
      
      if (!retryResponse.ok) {
        throw new Error(`API request failed with status ${retryResponse.status}`);
      }
      
      return await retryResponse.json();
    }
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    return await response.json();
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
    const response = await fetch(`${apiBaseUrl}/api/status.php?_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'X-Health-Check': 'true',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'ok' || data.status === 'success';
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
    
    const url = `${apiBaseUrl}/api/admin/fix-database-tables.php?_t=${Date.now()}`;
    
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
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Database tables fixed successfully:', result);
      return true;
    } else {
      console.error('Failed to fix database tables:', result.message || 'Unknown error');
      return false;
    }
  } catch (error: any) {
    console.error(`Error fixing database tables: ${error.message}`);
    return false;
  }
};
