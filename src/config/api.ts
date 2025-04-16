
/**
 * Configuration for API endpoints
 */

/**
 * Get the base API URL from environment variables or fallback to a default
 */
export const getApiBaseUrl = (): string => {
  // Always use relative URLs in Lovable environment - prioritize this case
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('lovableproject.com') || 
       window.location.hostname.includes('localhost') || 
       window.location.hostname === '127.0.0.1')) {
    return '';
  }
  
  // In production, use environment variable or same origin
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  return typeof window !== 'undefined' ? window.location.origin : '';
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
  
  // Clean the endpoint to ensure it starts with /api/ if it doesn't contain it already
  let formattedEndpoint = endpoint;
  
  // If it's a relative path that doesn't start with a slash, add one
  if (formattedEndpoint && !formattedEndpoint.startsWith('/')) {
    formattedEndpoint = `/${formattedEndpoint}`;
  }
  
  // For paths that should be in /api/ but don't have it yet, adjust them
  if (formattedEndpoint && 
      !formattedEndpoint.startsWith('/api/') && 
      !formattedEndpoint.includes('/api/') &&
      formattedEndpoint.includes('.php')) {
    formattedEndpoint = `/api${formattedEndpoint}`;
  }
  
  // Compose the full URL
  return baseUrl + formattedEndpoint;
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
