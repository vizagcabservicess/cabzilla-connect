
// API configuration

// Base API URL - auto-detect between development and production
export const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://vizagup.com' 
  : '';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  // For relative URLs in development (working with Vite's proxy)
  if (process.env.NODE_ENV !== 'production') {
    // Ensure path starts with a slash if it doesn't already
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return normalizedPath;
  }
  
  // For production, use the full URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
  return fullUrl;
};

// Force refresh headers for API requests to bypass cache
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Default headers for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  defaultHeaders,
  forceRefreshHeaders
};
