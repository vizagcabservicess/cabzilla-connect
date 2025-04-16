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
  
  // In Lovable environment, use backend/php-templates path for PHP files
  if (typeof window !== 'undefined' && 
      (window.location.hostname.includes('lovableproject.com') || 
       window.location.hostname.includes('localhost') || 
       window.location.hostname === '127.0.0.1')) {
    
    // If endpoint contains .php, route it through the backend/php-templates directory
    if (endpoint && endpoint.includes('.php')) {
      // Handle both with and without leading slash
      if (endpoint.startsWith('/')) {
        // If it already has /backend/php-templates, don't add it again
        if (endpoint.startsWith('/backend/php-templates')) {
          return endpoint;
        }
        // If it starts with /api, replace with /backend/php-templates/api
        if (endpoint.startsWith('/api/')) {
          return `/backend/php-templates${endpoint}`;
        }
        return `/backend/php-templates${endpoint}`;
      } else {
        // Add leading slash if missing
        return `/backend/php-templates/${endpoint}`;
      }
    }
    
    // Otherwise just ensure there's a leading slash
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  }
  
  // Outside Lovable, use the base URL
  const baseUrl = getApiBaseUrl();
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
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
