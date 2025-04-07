
import { apiBaseUrl } from '@/config/api';

// Basic request options for API calls
export interface ApiRequestOptions extends RequestInit {
  data?: any;
}

/**
 * Make an API call with the provided options
 * @param endpoint The API endpoint to call
 * @param options Request options
 * @returns JSON response
 */
export async function apiCall(endpoint: string, options?: ApiRequestOptions): Promise<any> {
  try {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith('/') 
        ? `${apiBaseUrl}${endpoint}` 
        : `${apiBaseUrl}/${endpoint}`;
    
    const processedOptions: RequestInit = { ...options };
    
    // If data is provided and body is not, convert data to JSON body
    if (options?.data && !options.body) {
      processedOptions.body = JSON.stringify(options.data);
      processedOptions.headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };
    }
    
    const response = await fetch(url, processedOptions);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

/**
 * Perform a direct vehicle operation through the API
 */
export function directVehicleOperation(endpoint: string, method: string = 'GET', options: ApiRequestOptions = {}): Promise<any> {
  const processedOptions: ApiRequestOptions = {
    method,
    ...options,
    headers: {
      'X-Admin-Mode': 'true',
      'X-Debug': 'true',
      ...options.headers
    }
  };
  
  return apiCall(endpoint, processedOptions);
}

// Utility function to check if we're in preview mode
export function isPreviewMode(): boolean {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname.includes('localhost') || 
         window.location.hostname.includes('preview');
}

// Force refresh of vehicle data
export async function forceRefreshVehicles(): Promise<boolean> {
  try {
    const response = await apiCall('/api/admin/reload-vehicles.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    return response && response.status === 'success';
  } catch (error) {
    console.error('Failed to force refresh vehicles:', error);
    return false;
  }
}

// Fix database tables if needed
export async function fixDatabaseTables(): Promise<boolean> {
  try {
    const response = await apiCall('/api/admin/fix-database.php', {
      method: 'GET',
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    return response && response.status === 'success';
  } catch (error) {
    console.error('Failed to fix database tables:', error);
    return false;
  }
}

// Export formatDataForMultipart function
export function formatDataForMultipart(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  }
  
  return formData;
}
