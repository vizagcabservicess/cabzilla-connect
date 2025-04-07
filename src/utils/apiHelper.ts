
import { apiBaseUrl } from '@/config/api';
import { getBypassHeaders } from '@/config/requestConfig';

/**
 * Directly perform a vehicle operation via API
 */
export async function directVehicleOperation(endpoint: string, method: string = 'GET', config: RequestInit & { body?: any } = {}): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    // Create a copy of the config to avoid modifying the original
    const fetchOptions: RequestInit = {
      method,
      ...config
    };
    
    // If body is provided and it's not already a string, stringify it
    if (config.body && typeof config.body !== 'string' && !(config.body instanceof FormData)) {
      fetchOptions.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in vehicle operation:', error);
    throw error;
  }
}

/**
 * API call helper
 */
export async function apiCall(endpoint: string, options?: RequestInit): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in API call:', error);
    throw error;
  }
}

/**
 * Force refresh all vehicles data
 */
export async function forceRefreshVehicles(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/refresh-vehicles.php`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data && data.success === true;
  } catch (error) {
    console.error('Failed to refresh vehicles:', error);
    return false;
  }
}

/**
 * Fix database tables (creates them if they don't exist)
 */
export async function fixDatabaseTables(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/fix-database.php`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data && data.success === true;
  } catch (error) {
    console.error('Failed to fix database tables:', error);
    return false;
  }
}

/**
 * Check if the system is running in preview mode
 */
export function isPreviewMode(): boolean {
  // Check for preview mode indicators
  return (
    window.location.hostname.includes('preview') ||
    window.location.hostname.includes('localhost') ||
    window.location.search.includes('preview=true')
  );
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/check-connection.php`, {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data && data.connection === true;
  } catch (error) {
    console.error('Failed to check database connection:', error);
    return false;
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
