
/**
 * Configuration for API endpoints
 */

/**
 * Get the base API URL from environment variables or fallback to a default
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Check if running in development mode with local API
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // If in development, use the VITE_API_BASE_URL env variable or fallback to localhost
    if (isLocalDev) {
      return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    }
    
    // In production, use the same origin
    return window.location.origin;
  }
  
  // Fallback for SSR or other environments
  return import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';
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
  
  // Ensure endpoint starts with a slash if it doesn't already
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // For absolute URLs (those that already contain http:// or https://), return as is
  if (endpoint.match(/^https?:\/\//i)) {
    return endpoint;
  }
  
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
