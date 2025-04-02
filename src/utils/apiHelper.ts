
import { toast } from 'sonner';
import { apiBaseUrl } from '@/config/api';

/**
 * Helper function for direct vehicle operations with better error handling
 */
export const directVehicleOperation = async (endpoint: string, method: string, data?: any) => {
  try {
    const fullUrl = `${apiBaseUrl}/${endpoint}`;
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
    
    // Prepare headers with unique cache-busting value
    const uniqueCacheBuster = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Force-Refresh': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Admin-Mode': 'true',
      'X-Cache-Buster': uniqueCacheBuster
    };
    
    // Only add Content-Type if not using FormData
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    // Use AbortController to set timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(finalUrl, {
        method,
        headers,
        body,
        signal: controller.signal,
        credentials: 'include', // Include cookies
        cache: 'no-store',
        mode: 'cors' // Enable CORS
      });
      
      clearTimeout(timeoutId);
      
      // Handle different error status codes
      if (!response.ok) {
        const errorStatusCode = response.status;
        let errorText;
        
        try {
          // Try to get response as text first
          const responseText = await response.text();
          try {
            // Then try to parse it as JSON
            const errorData = JSON.parse(responseText);
            errorText = errorData.message || errorData.error || response.statusText;
          } catch (parseError) {
            // If JSON parsing fails, use the text directly
            errorText = responseText || response.statusText;
          }
        } catch (textError) {
          // Fall back to status text if text extraction fails
          errorText = response.statusText;
        }
        
        // Create detailed error message with status code
        throw new Error(`API error: ${errorStatusCode} - ${errorText}`);
      }
      
      // Clone the response before consuming it
      const responseClone = response.clone();
      
      // First try to get the response as text
      const responseText = await responseClone.text();
      
      // If empty response, return a simple success object
      if (!responseText || responseText.trim() === '') {
        return { status: 'success', message: 'Operation completed successfully (empty response)' };
      }
      
      // Try to parse the text as JSON
      try {
        return JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError, responseText);
        
        // Check if response contains HTML or PHP error messages
        if (responseText.includes('<?php') || responseText.includes('<!DOCTYPE') || 
            responseText.includes('<html') || responseText.includes('Warning:') || 
            responseText.includes('Fatal error:')) {
          throw new Error('Server returned HTML or PHP error instead of JSON');
        }
        
        // Return text response as an object
        return {
          status: response.ok ? 'success' : 'error',
          message: responseText,
          raw: responseText
        };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: The server took too long to respond');
    }
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to the server. Please check your internet connection.');
    }
    
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
export const getBypassHeaders = (forceRefresh = true, isAdminMode = true) => {
  const uniqueCacheBuster = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  return {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Force-Refresh': 'true',
    'X-Admin-Mode': isAdminMode ? 'true' : 'false',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Cache-Buster': uniqueCacheBuster
  };
};

/**
 * Get forced request configuration for API calls
 */
export const getForcedRequestConfig = (isAdminMode = true) => {
  return {
    headers: getBypassHeaders(true, isAdminMode),
    cache: 'no-store' as RequestCache,
    next: { revalidate: 0 }
  };
};
