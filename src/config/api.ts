
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
  if (window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname.includes('lovableproject.com') ||
      true) { // Always use relative URLs
    
    // Remove leading slash if present for relative URLs
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
    // Ensure API directory paths are preserved
    if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('data/')) {
      return `api/${cleanEndpoint}`;
    }
    
    return cleanEndpoint;
  }
  
  // This code path should never be reached due to 'true' condition above
  // but kept for backward compatibility
  const base = typeof window !== 'undefined' ? window.location.origin : apiBaseUrl;
  const cleanBase = (base || '').endsWith('/') ? base.slice(0, -1) : base;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${cleanBase}${cleanEndpoint}`;
};
