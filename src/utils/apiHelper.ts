
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';

/**
 * Helper function for direct vehicle operations with better error handling
 */
export const directVehicleOperation = async (endpoint: string, method: string, data?: any) => {
  try {
    const fullUrl = `${apiBaseUrl}${endpoint}`;
    console.log(`Direct vehicle operation: ${method} ${fullUrl}`);
    
    // Add timestamp to URL to avoid caching for GET requests
    const finalUrl = method === 'GET' && !fullUrl.includes('_t=') 
      ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`
      : fullUrl;
    
    const response = await fetch(finalUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Admin-Mode': 'true'
      },
      body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    // Handle different error status codes
    if (!response.ok) {
      const errorStatusCode = response.status;
      let errorText;
      
      try {
        // Try to get JSON error message
        const errorData = await response.json();
        errorText = errorData.message || errorData.error || response.statusText;
      } catch (parseError) {
        // Fall back to status text if JSON parsing fails
        errorText = response.statusText;
      }
      
      // Create detailed error message with status code
      throw new Error(`API error: ${errorStatusCode} - ${errorText}`);
    }
    
    // Parse response data
    const responseData = await response.json();
    return responseData;
  } catch (error: any) {
    console.error(`Error in directVehicleOperation (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Formats data for multipart form submission
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });
  return formData;
};

/**
 * Fix database tables - creates necessary tables if they don't exist
 */
export const fixDatabaseTables = async (): Promise<boolean> => {
  try {
    // First try init-database endpoint
    let response = await fetch(`${apiBaseUrl}/api/admin/init-database.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Database initialization result:', result);
      return result.status === 'success';
    }
    
    // Try fix-vehicle-tables as a backup
    response = await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php`, {
      method: 'GET',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Fix vehicle tables result:', result);
      return result.status === 'success';
    }
    
    // Try sync-local-fares as a last resort
    response = await fetch(`${apiBaseUrl}/api/admin/sync-local-fares.php`, {
      method: 'GET',
      headers: {
        'X-Force-Refresh': 'true',
        'X-Admin-Mode': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Sync local fares result:', result);
      return result.status === 'success';
    }
    
    return false;
  } catch (error) {
    console.error('Error fixing database tables:', error);
    return false;
  }
};

/**
 * Get bypass headers for direct API access
 */
export const getBypassHeaders = (forceRefresh = false, isAdminMode = false) => {
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Force-Refresh': forceRefresh ? 'true' : 'false',
    'X-Admin-Mode': isAdminMode ? 'true' : 'false',
    'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'max-age=300',
    'Pragma': forceRefresh ? 'no-cache' : '',
    'Expires': forceRefresh ? '0' : ''
  };
};

/**
 * Get forced request configuration for API calls
 */
export const getForcedRequestConfig = (isAdminMode = false) => {
  return {
    headers: getBypassHeaders(true, isAdminMode),
    cache: 'no-store' as RequestCache,
    next: { revalidate: 0 }
  };
};
