
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
    'Origin': window.location.origin,
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json, */*'
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
    credentials: 'include' as const, // Send credentials for same-origin requests
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
  if (!navigator.onLine) {
    throw new Error('No internet connection');
  }
  
  // Special handling for login endpoint
  if (endpoint.includes('login')) {
    endpoint = '/api/login.php';
  }
  
  // Prepare enhanced options with CORS headers
  const enhancedOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'include', // Changed to include for same-origin requests
    headers: {
      ...getBypassHeaders(),
      ...(options.headers || {})
    }
  };
  
  // Use direct URL to API without proxy
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Try up to 3 times
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(url, enhancedOptions);
      
      if (result.status === 0) {
        throw new Error('Network error - status 0 received');
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
  
  // If we got here, all attempts failed
  throw lastError || new Error('Failed to fetch after multiple attempts');
};
