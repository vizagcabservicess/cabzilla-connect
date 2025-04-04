
// Base URL for API requests
export const apiBaseUrl = import.meta.env.VITE_API_URL || '';

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
  
  // For development environments and certain domains, use relative URLs
  // This helps avoid CORS issues in development and preview environments
  if (window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('lovable.app') ||
      window.location.hostname.includes('lovableproject.com')) {
    
    // Remove leading slash if present for relative URLs
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    
    // Ensure API directory paths are preserved
    if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('data/')) {
      return `api/${cleanEndpoint}`;
    }
    
    return cleanEndpoint;
  }
  
  // For production, use origin or apiBaseUrl
  const base = typeof window !== 'undefined' ? window.location.origin : apiBaseUrl;
  
  // Remove trailing slash from base URL if present
  const cleanBase = (base || '').endsWith('/') ? base.slice(0, -1) : base;
  
  // Add leading slash to endpoint if not present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${cleanBase}${cleanEndpoint}`;
};
