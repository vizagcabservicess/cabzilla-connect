
// Helper functions for making API requests with enhanced CORS support
import { getApiUrl } from './api';

/**
 * Get headers that bypass common API restrictions
 * Enhanced with additional CORS-friendly headers
 */
export const getBypassHeaders = (): Record<string, string> => {
  return {
    'X-Bypass-Cache': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Origin': window.location.origin,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': '*/*',
    'X-CORS-Bypass': 'true',
    'X-Admin-Mode': 'true', // Always include admin mode header for maximum compatibility
    'Access-Control-Allow-Origin': '*', // Add CORS headers directly in request
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Auth-Token, X-Force-Refresh, X-Admin-Mode, X-Debug, *'
  };
};

/**
 * Get forced request configuration with bypass headers and cache settings
 * Enhanced with ultra-reliable CORS settings
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
 * Create a CORS-friendly URL for API requests
 * Always uses the CORS proxy for maximum reliability
 */
export const createCorsUrl = (endpoint: string): string => {
  return getApiUrl(endpoint);
};

/**
 * Apply CORS workarounds for OPTIONS preflight requests
 * Enhanced with fix-cors.php endpoint
 */
export const checkCorsWithPreflight = async (endpoint: string): Promise<boolean> => {
  try {
    // First check if the CORS fix endpoint works
    const corsFixUrl = getApiUrl('/api/fix-cors');
    const response = await fetch(corsFixUrl, { 
      method: 'OPTIONS',
      headers: getBypassHeaders(),
      mode: 'cors'
    });
    
    if (response.ok) {
      console.log('CORS preflight check successful');
      return true;
    } else {
      console.warn('CORS preflight returned non-200 status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('CORS preflight check failed:', error);
    return false;
  }
};

/**
 * Universal function to perform CORS-safe fetch with retry logic
 * Use this for critical API calls
 */
export const safeFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  // Always run CORS fix first
  try {
    await fetch(getApiUrl('/api/fix-cors'), {
      method: 'GET',
      headers: getBypassHeaders(),
      mode: 'cors'
    });
  } catch (e) {
    console.log('CORS fix preflight failed, continuing anyway:', e);
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
  
  // Try up to 3 times
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(getApiUrl(endpoint), enhancedOptions);
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
  
  // If we got here, all attempts failed
  throw lastError || new Error('Failed to fetch after multiple attempts');
};
