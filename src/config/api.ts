
/**
 * Configuration for API endpoints
 */

/**
 * Get the base API URL from environment variables or fallback to a default
 */
export const getApiBaseUrl = (): string => {
  // Always use relative URLs in Lovable environment
  if (typeof window !== 'undefined' && window.location.hostname.includes('lovableproject.com')) {
    return '';
  }
  
  // Check if running in local development
  const isLocalDev = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // If in local development, use the environment variable or an empty string (relative URLs)
  if (isLocalDev) {
    return import.meta.env.VITE_API_BASE_URL || '';
  }
  
  // In production, use environment variable or same origin
  return import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
};

// Add apiBaseUrl export that returns the current base URL
export const apiBaseUrl = getApiBaseUrl();

/**
 * Get the full API URL for a specific endpoint
 * @param endpoint API endpoint path (should start with 'api/')
 * @returns Full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  // For absolute URLs (those that already contain http:// or https://), return as is
  if (endpoint && endpoint.match(/^https?:\/\//i)) {
    return endpoint;
  }
  
  const baseUrl = getApiBaseUrl();
  
  // If we're in Lovable environment or no base URL, use relative paths
  if (!baseUrl) {
    // Ensure endpoint starts with a slash for relative paths
    return endpoint ? (endpoint.startsWith('/') ? endpoint : `/${endpoint}`) : '/';
  }
  
  // Ensure endpoint starts with a slash if it doesn't already
  const formattedEndpoint = endpoint ? (endpoint.startsWith('/') ? endpoint : `/${endpoint}`) : '/';
  
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
