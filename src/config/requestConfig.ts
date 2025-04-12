
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
    'Accept': '*/*'
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
 * Get auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Get auth headers with token if available
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = getBypassHeaders();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
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
  
  // Add auth token if available
  const authHeaders = getAuthHeaders();
  
  // Prepare enhanced options with CORS headers
  const enhancedOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      ...authHeaders,
      ...(options.headers || {})
    }
  };
  
  // Use direct URL to API without proxy
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  console.log(`API Request: ${endpoint}`);
  
  // Try up to 3 times
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(url, enhancedOptions);
      
      if (result.status === 0) {
        throw new Error('Network error - status 0 received');
      }
      
      // Log successful response for debugging
      if (result.ok) {
        try {
          // Clone the response to avoid consuming it
          const clonedResponse = result.clone();
          const jsonData = await clonedResponse.json();
          console.log(`API Response (${result.status}):`, jsonData);
        } catch (err) {
          console.log(`API Response (${result.status}): Non-JSON response`);
        }
      } else {
        console.error(`API Error (${result.status}):`, result.statusText);
        // Try to get error details
        try {
          const errorData = await result.json();
          console.error('Error details:', errorData);
        } catch (e) {
          // Ignore error parsing issues
        }
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

/**
 * Helper to safely parse JSON responses and handle common error patterns
 */
export const safeJsonParse = async (response: Response): Promise<any> => {
  try {
    const text = await response.text();
    // Check if the response is empty
    if (!text || text.trim() === '') {
      console.warn('Empty response received');
      return { status: 'error', message: 'Empty response from server' };
    }
    
    // Check if it's HTML instead of JSON
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
      console.error('HTML response received instead of JSON');
      return { 
        status: 'error', 
        message: 'HTML response received instead of JSON', 
        htmlReceived: true 
      };
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      return { 
        status: 'error', 
        message: 'Invalid JSON response', 
        rawResponse: text.substring(0, 500) // First 500 chars for debugging
      };
    }
  } catch (e) {
    console.error('Error processing response:', e);
    return { status: 'error', message: 'Failed to process response' };
  }
};
