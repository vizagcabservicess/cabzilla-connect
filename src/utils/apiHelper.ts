
import { apiBaseUrl } from '@/config/api';
import { getBypassHeaders, formatDataForMultipart } from '@/config/requestConfig';

/**
 * Directly perform a vehicle operation via API
 */
export async function directVehicleOperation(endpoint: string, method: string = 'GET', options?: RequestInit): Promise<any> {
  try {
    const url = endpoint.startsWith('/') 
      ? `${apiBaseUrl}${endpoint}` 
      : `${apiBaseUrl}/${endpoint}`;
    
    const fetchOptions: RequestInit = {
      method,
      ...options
    };
    
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
