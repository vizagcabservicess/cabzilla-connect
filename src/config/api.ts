
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
  
  // Direct access to PHP files is highest priority
  if (endpoint.endsWith('.php')) {
    console.log('Using direct PHP file access for:', endpoint);
    
    // If running in a production domain, try to access the PHP file directly
    if (window.location.hostname.includes('vizagup.com')) {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      return `${window.location.origin}/${cleanEndpoint}`;
    }
    
    // Try the domain directly for PHP files
    return `https://vizagup.com/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}`;
  }
  
  // Email endpoints should always use direct PHP access
  if (endpoint.includes('/send-booking-confirmation') || 
      endpoint.includes('/test-email')) {
    console.log('Redirecting email endpoint to direct PHP access');
    return getApiUrl(endpoint + '.php');
  }
  
  // For admin users endpoint, we want to ensure direct access to the PHP file
  if (endpoint.includes('/admin/users') || endpoint === '/api/admin/users') {
    console.log('Redirecting admin users endpoint to direct PHP access');
    return getApiUrl('/api/admin/direct-user-data.php');
  }
  
  // Check for direct API access via environment variable
  if (import.meta.env.VITE_USE_DIRECT_API === 'true') {
    // If running on a production domain, allow direct API calls to the same domain
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
  }
  
  // For all environments, use relative URLs to avoid CORS and external domain issues
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Ensure API directory paths are preserved
  if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('data/')) {
    return `api/${cleanEndpoint}`;
  }
  
  return cleanEndpoint;
};
