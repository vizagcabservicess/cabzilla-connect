
// API configuration

// Base API URL - Ensure we use the current domain
export const apiBaseUrl = window.location.origin;

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  // Ensure path starts with a slash if it doesn't already
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Add .php extension only if needed (for API endpoints without extension)
  const pathWithExtension = normalizedPath.includes('/api/') && 
    !normalizedPath.includes('.php') && 
    !normalizedPath.endsWith('/') 
      ? `${normalizedPath}.php` 
      : normalizedPath;
  
  // Remove any duplicate slashes and combine with base URL
  return `${apiBaseUrl}${pathWithExtension}`.replace(/([^:]\/)\/+/g, '$1');
};

// Force refresh headers for API requests
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'X-Database-First': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Default headers for API requests - Ensure proper content type
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json'
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  defaultHeaders,
  forceRefreshHeaders
};
