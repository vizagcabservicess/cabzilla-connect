
// Helper functions for making API requests
import { apiBaseUrl, defaultHeaders } from './api';

/**
 * Get headers that bypass common API restrictions
 */
export const getBypassHeaders = (): Record<string, string> => {
  return {
    'X-Bypass-Cache': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Accept': '*/*',
    'X-Requested-With': 'XMLHttpRequest',
    // Add CORS-safe headers
    'Access-Control-Request-Method': 'GET, POST, OPTIONS',
    'Access-Control-Request-Headers': 'Content-Type, Authorization, X-Requested-With'
  };
};

/**
 * Get forced request configuration with bypass headers and cache settings
 */
export const getForcedRequestConfig = () => {
  return {
    headers: getBypassHeaders(),
    timeout: 60000, // Increased timeout for maximum reliability
    cache: 'no-store' as const,
    mode: 'cors' as const,
    credentials: 'omit' as const, // Don't send credentials for CORS
    keepalive: true, // Keep connection alive
    redirect: 'follow' as const, // Follow redirects
    referrerPolicy: 'no-referrer' as const // Don't send referrer for CORS
  };
};

/**
 * Format data for multipart form submission
 * This is more reliable for PHP endpoints than JSON
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    // Handle arrays and objects
    if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      // Convert other values to string
      formData.append(key, String(value ?? ''));
    }
  });
  
  return formData;
};

/**
 * Check if online before making API requests
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Universal function to perform CORS-safe fetch with retry logic
 * Use this for critical API calls
 */
export const safeFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  // Check if online
  if (!isOnline()) {
    throw new Error('No internet connection');
  }
  
  // Prepare enhanced options with CORS headers
  const enhancedOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      ...getBypassHeaders(),
      ...(options.headers || {})
    }
  };
  
  // Remove unsafe headers that could trigger CORS errors
  if (enhancedOptions.headers) {
    const headers = enhancedOptions.headers as Record<string, string>;
    // Remove headers that can't be set by JavaScript
    delete headers['Origin'];
    delete headers['Referer'];
    delete headers['Host'];
  }
  
  // Use direct URL to API without proxy
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Add timestamp to prevent caching
  const urlWithTimestamp = url.includes('?') 
    ? `${url}&_t=${Date.now()}` 
    : `${url}?_t=${Date.now()}`;
  
  // Try up to 3 times
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(urlWithTimestamp, enhancedOptions);
      
      if (result.status === 0) {
        throw new Error('Network error - status 0 received');
      }
      
      // Create a modified response to handle CORS errors gracefully
      if (result.status === 403 || result.status === 401) {
        // For 403/401 errors, try to create a fallback JSON response
        console.warn(`Received ${result.status} from API, attempting to create a fallback response`);
        
        return new Response(JSON.stringify({
          status: 'error',
          message: `API returned ${result.status} status code`,
          error: `Request failed with status ${result.status}`,
          fallback: true
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Check for CORS or OPTIONS preflight issues
      if (result.status === 0 || result.type === 'opaque' || result.type === 'error') {
        console.warn(`Potential CORS issue: Response type: ${result.type}, status: ${result.status}`);
        throw new Error(`CORS issue: ${result.type} response with status ${result.status}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Fetch attempt ${attempt} failed:`, error);
      
      // Wait a bit longer between retries
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  // If all attempts failed, create a fallback response
  if (endpoint.includes('fares') || endpoint.includes('fare')) {
    console.error(`All fetch attempts failed for ${endpoint}. Creating fallback response.`);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Failed to fetch fare data after multiple attempts',
      error: lastError?.message || 'Unknown error',
      fallback: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // If we got here, all attempts failed
  throw lastError || new Error('Failed to fetch after multiple attempts');
};
