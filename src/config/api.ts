
/**
 * Configuration for API endpoints
 */

/**
 * Get the base API URL from environment variables or fallback to a default
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Check if running in Lovable environment
    const isLovableEnv = window.location.hostname.includes('lovableproject.com');
    
    // If in Lovable environment, use relative URLs (empty base)
    if (isLovableEnv) {
      return '';
    }
    
    // If in development, use the VITE_API_BASE_URL env variable or fallback to empty string
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev) {
      return import.meta.env.VITE_API_BASE_URL || '';
    }
    
    // In production, use the environment variable if available, otherwise same origin
    return import.meta.env.VITE_API_BASE_URL || window.location.origin;
  }
  
  // Fallback for SSR or other environments
  return import.meta.env.VITE_API_BASE_URL || '';
};

// Add apiBaseUrl export that returns the current base URL
export const apiBaseUrl = getApiBaseUrl();

/**
 * Get the full API URL for a specific endpoint
 * @param endpoint API endpoint path (should start with 'api/')
 * @returns Full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  
  // For absolute URLs (those that already contain http:// or https://), return as is
  if (endpoint.match(/^https?:\/\//i)) {
    return endpoint;
  }
  
  // If no base URL, just use the endpoint as is (relative path)
  if (!baseUrl) {
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
  
  // Ensure endpoint starts with a slash if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Compose and return the full URL
  return `${baseUrl}${formattedEndpoint}`;
};

/**
 * Get an authenticated API URL with token
 * @param endpoint API endpoint path
 * @returns Full API URL with auth token
 */
export const getAuthApiUrl = (endpoint: string): string => {
  const url = getApiUrl(endpoint);
  
  // Get the auth token from localStorage
  const token = localStorage.getItem('authToken');
  
  // If token exists, append it as a query parameter
  if (token) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  
  return url;
};

// Add forceRefreshHeaders for use in API requests
export const forceRefreshHeaders = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Force-Refresh': 'true',
  'X-Requested-With': 'XMLHttpRequest'
};

// Add defaultHeaders for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

export default {
  getApiBaseUrl,
  getApiUrl,
  getAuthApiUrl,
  apiBaseUrl,
  forceRefreshHeaders,
  defaultHeaders
};
