
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
    
    // Serialize data properly to avoid JSON parsing errors
    let body: string | FormData | undefined;
    let contentType = 'application/json';
    
    if (method !== 'GET' && data) {
      // If data contains File/Blob objects, use FormData
      if (hasFileOrBlob(data)) {
        body = formatDataForMultipart(data);
        contentType = ''; // Let browser set content-type for multipart
      } else {
        try {
          // First clean any invalid characters that might break JSON
          const cleanedData = JSON.parse(JSON.stringify(data));
          body = JSON.stringify(cleanedData);
        } catch (e) {
          // Fallback to FormData if JSON serialization fails
          console.warn('JSON serialization failed, using FormData instead', e);
          body = formatDataForMultipart(data);
          contentType = ''; // Let browser set content-type for multipart
        }
      }
    }
    
    // Prepare headers
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Force-Refresh': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Admin-Mode': 'true'
    };
    
    // Only add Content-Type if not using FormData
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
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
    const contentTypeHeader = response.headers.get('content-type');
    
    if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
      // JSON response
      try {
        const responseData = await response.json();
        return responseData;
      } catch (jsonError) {
        console.error('Failed to parse JSON response', jsonError);
        throw new Error(`Invalid JSON response: ${await response.text()}`);
      }
    } else {
      // Non-JSON response
      const textResponse = await response.text();
      try {
        // Try to parse as JSON anyway in case Content-Type is incorrect
        return JSON.parse(textResponse);
      } catch (jsonError) {
        // Return plain text response as an object
        return {
          status: response.ok ? 'success' : 'error',
          message: textResponse,
          raw: textResponse
        };
      }
    }
  } catch (error: any) {
    console.error(`Error in directVehicleOperation (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Check if an object contains any File or Blob instances
 */
const hasFileOrBlob = (data: any): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  for (const key in data) {
    if (data[key] instanceof File || data[key] instanceof Blob) {
      return true;
    }
    
    if (typeof data[key] === 'object' && data[key] !== null) {
      if (hasFileOrBlob(data[key])) {
        return true;
      }
    }
  }
  
  return false;
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
