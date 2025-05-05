
// API configuration

// Base API URL - use the vizagup.com domain
export const apiBaseUrl = window.location.hostname.includes('localhost') 
  ? 'http://localhost' 
  : 'https://vizagup.com';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash if it doesn't already
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Add .php extension if the path is an API endpoint and doesn't already have an extension
  if (normalizedPath.includes('/api/') && !normalizedPath.includes('.php') && !normalizedPath.endsWith('/')) {
    return `${apiBaseUrl}${normalizedPath}.php`.replace(/([^:]\/)\/+/g, '$1');
  }
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
