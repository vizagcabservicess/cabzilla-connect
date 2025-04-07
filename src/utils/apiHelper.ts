
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';

/**
 * Default API options
 */
const defaultOptions: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'X-Debug': 'true'
  },
  timeout: 15000 // 15 seconds
};

/**
 * Main API call function using Axios
 */
export async function apiCall(
  endpoint: string, 
  options: AxiosRequestConfig = {}
): Promise<any> {
  try {
    // Merge default options with provided options
    const mergedOptions: AxiosRequestConfig = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    // Log request details for debugging
    console.log(`API call to ${endpoint}`, mergedOptions);
    
    // Make the API call
    const response = await axios(endpoint, mergedOptions);
    
    // Log successful response
    console.log(`API response from ${endpoint}:`, response.data);
    
    // Return the response data
    return response.data;
  } catch (error: any) {
    // Log the error
    console.error(`API call to ${endpoint} failed:`, error);
    
    // Extract error message
    let errorMessage = 'API call failed';
    
    if (error.response) {
      // Server responded with an error status
      errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
      console.error('Error response data:', error.response.data);
    } else if (error.request) {
      // No response received
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      // Error setting up the request
      errorMessage = error.message || 'Unknown error occurred';
    }
    
    // Rethrow with improved error message
    throw new Error(errorMessage);
  }
}

/**
 * Helper function to handle API errors consistently
 */
export function handleApiError(error: any, context: string = 'API call') {
  const errorMessage = error.message || 'Unknown error occurred';
  console.error(`${context} failed:`, error);
  toast.error(`${context} failed: ${errorMessage}`);
  return error;
}

/**
 * Helper to create a debounced function
 */
export function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    return new Promise(resolve => {
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
  };
}

/**
 * Check database connection status
 */
export async function checkDatabaseConnection(): Promise<{success: boolean, message: string}> {
  try {
    const response = await apiCall('/api/admin/check-connection.php', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (response && response.success) {
      return { success: true, message: 'Database connection successful' };
    } else {
      return { success: false, message: response?.message || 'Database connection check failed' };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Database connection check failed' };
  }
}

/**
 * Fix database tables
 */
export async function fixDatabaseTables(): Promise<{success: boolean, message: string}> {
  try {
    const response = await apiCall('/api/admin/fix-database.php', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (response && response.status === 'success') {
      return { success: true, message: response.message || 'Database tables fixed successfully' };
    } else {
      return { success: false, message: response?.message || 'Failed to fix database tables' };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to fix database tables' };
  }
}

/**
 * Check if we're in preview mode
 */
export function isPreviewMode(): boolean {
  return window.location.hostname.includes('preview') || 
         window.location.hostname.includes('localhost') ||
         window.location.search.includes('preview=true');
}

/**
 * Force refresh vehicles data
 */
export async function forceRefreshVehicles(): Promise<any> {
  try {
    const response = await apiCall('/api/admin/refresh-vehicles.php', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error forcing vehicle refresh:', error);
    throw error;
  }
}

/**
 * Format data for multipart form submission
 */
export function formatDataForMultipart(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        // Handle arrays by stringifying them
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object' && !(value instanceof File)) {
        // Handle objects by stringifying them
        formData.append(key, JSON.stringify(value));
      } else {
        // Handle primitives and files directly
        formData.append(key, value);
      }
    }
  });
  
  return formData;
}

/**
 * Direct vehicle operation
 */
export async function directVehicleOperation(action: string, data: any): Promise<any> {
  try {
    const endpoint = `/api/admin/direct-vehicle-${action}.php`;
    
    const formData = formatDataForMultipart(data);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error in vehicle ${action} operation:`, error);
    throw error;
  }
}
