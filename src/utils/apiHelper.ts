
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
      'X-Admin-Mode': 'true',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };
    
    // Only add Content-Type if not using FormData
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    // Important: Specify 'no-store' to prevent issues with response body stream
    const response = await fetch(finalUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit'
    });
    
    // IMPROVED ERROR HANDLING: Create clean copy of response for parsing
    const responseStatus = response.status;
    const responseStatusText = response.statusText;
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => responseHeaders.set(key, value));
    
    // Handle different error status codes
    if (!response.ok) {
      const errorStatusCode = responseStatus;
      let errorText;
      let responseBody;
      
      try {
        // Get response text first
        responseBody = await response.text();
        
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(responseBody);
          errorText = errorData.message || errorData.error || responseStatusText;
        } catch (jsonError) {
          // Not JSON, use text as is
          errorText = responseBody || responseStatusText;
        }
      } catch (readError) {
        errorText = `Error reading response: ${readError.message}`;
      }
      
      // Create detailed error message with status code
      throw new Error(`API error ${errorStatusCode}: ${errorText}`);
    }
    
    // Make a clone of the response before using it
    // This fixes the issue where the response body stream can only be read once
    const clonedResponse = response.clone();
    
    // Get response type to determine how to parse
    const contentTypeHeader = response.headers.get('content-type') || '';
    let result;
    let responseBody;
    
    // First get the raw response text to avoid streaming issues
    try {
      responseBody = await response.text();
    } catch (textError) {
      console.error('Error reading response body:', textError);
      
      // Try using the cloned response as a fallback
      try {
        responseBody = await clonedResponse.text();
      } catch (cloneError) {
        throw new Error(`Failed to read response: ${textError.message}`);
      }
    }
    
    // Try to parse as JSON if it's a JSON content type
    if (contentTypeHeader.includes('application/json') || 
        (responseBody && responseBody.trim().startsWith('{'))) {
      try {
        result = JSON.parse(responseBody);
      } catch (jsonError) {
        console.error('Failed to parse JSON response', jsonError);
        console.log('Raw response:', responseBody);
        
        // Return raw response if JSON parsing fails
        result = {
          status: response.ok ? 'success' : 'error',
          message: responseBody,
          raw: responseBody
        };
      }
    } else {
      // For non-JSON responses, return as object
      result = {
        status: response.ok ? 'success' : 'error',
        message: responseBody,
        raw: responseBody
      };
    }
    
    return result;
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
    'Expires': forceRefresh ? '0' : '',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };
};

/**
 * Get forced request configuration for API calls
 */
export const getForcedRequestConfig = (isAdminMode = false) => {
  return {
    headers: getBypassHeaders(true, isAdminMode),
    cache: 'no-store' as RequestCache,
    next: { revalidate: 0 },
    mode: 'cors' as RequestMode,
    credentials: 'omit' as RequestCredentials
  };
};
