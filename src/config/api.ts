
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
  
  // CRITICAL: Special handling for login endpoints
  // Always use plain /api/login.php for maximum reliability
  if (endpoint === 'login.php' || endpoint === 'login' || endpoint === '/login' || endpoint === '/login.php' || 
      endpoint.includes('login') || endpoint.includes('auth')) {
    return '/api/login.php';
  }
  
  // Use relative URLs to avoid CORS and external domain issues
  // Remove leading slash if present for relative URLs
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Ensure API directory paths are preserved
  if (!cleanEndpoint.startsWith('api/') && !cleanEndpoint.startsWith('data/')) {
    return `api/${cleanEndpoint}`;
  }
  
  return cleanEndpoint;
};
