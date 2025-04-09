
// Base URL for API requests
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

// Default headers for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

// Headers to force fresh data (no caching)
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Force-Refresh': 'true'
};

/**
 * Get a properly formatted API URL by combining the base URL with an endpoint
 * Handles cases with or without trailing/leading slashes
 * 
 * @param endpoint - The API endpoint path
 * @returns Full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  // If endpoint already includes http/https, return it as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Special case for trying to access the database directly 
  // This should be the first priority for robust admin API access
  if (endpoint.includes('direct-user-data.php') || 
      endpoint.includes('users.php') || 
      endpoint.includes('direct-vehicle')) {
    // If we're running in a production domain, try to access the API directly
    if (window.location.hostname.includes('vizagup.com')) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      return `${window.location.origin}/${cleanEndpoint}`;
    }
    
    // If we have a defined API URL, use it
    if (apiBaseUrl) {
      const cleanBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    }
    
    // Try the domain directly if no API base URL
    const domain = "https://vizagup.com";
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${domain}${cleanEndpoint}`;
  }
  
  // Check for direct API access via environment variable
  if (import.meta.env.VITE_USE_DIRECT_API === 'true') {
    // If running on a production domain, allow direct API calls to the same domain
    if (window.location.hostname.includes('vizagup.com')) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      return `${window.location.origin}/${cleanEndpoint}`;
    }
    
    // If we have a defined API base URL, use it
    if (apiBaseUrl) {
      const cleanBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${cleanBase}${cleanEndpoint}`;
    }
  }
  
  // For all environments, use relative URLs to avoid CORS and external domain issues
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Ensure API directory paths are preserved
  if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('data/')) {
    return `api/${cleanEndpoint}`;
  }
  
  return cleanEndpoint;
};
