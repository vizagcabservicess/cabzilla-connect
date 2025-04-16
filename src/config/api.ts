
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
  
  // Check if the endpoint already starts with /backend or /api in Lovable environment
  if (endpoint && (endpoint.startsWith('/backend/') || endpoint.startsWith('/api/'))) {
    return endpoint;
  }
  
  const baseUrl = getApiBaseUrl();
  
  // If we're in Lovable environment or no base URL, use relative paths
  if (!baseUrl) {
    // Special case: If we have a PHP endpoint, prioritize the backend path for better access
    if (endpoint && (endpoint.endsWith('.php') || endpoint.includes('php'))) {
      // Handle PHP files by routing them through our backend templates
      const phpPath = endpoint.startsWith('/') 
        ? `/backend/php-templates${endpoint}` 
        : `/backend/php-templates/${endpoint}`;
      
      console.log(`Using backend PHP template path: ${phpPath}`);
      return phpPath;
    }
    
    // For API endpoints, ensure they start with /api/
    if (endpoint && !endpoint.startsWith('/api/') && !endpoint.startsWith('/backend/')) {
      if (endpoint.startsWith('/')) {
        return `/api${endpoint}`;
      } else {
        return `/api/${endpoint}`;
      }
    }
    
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
