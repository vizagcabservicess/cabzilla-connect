// API configuration

// Base API URL - use localhost for development, vizagup.com for production
export const apiBaseUrl = window.location.hostname.includes('localhost')
  ? ''
  : 'https://www.vizagup.com';

// Helper function to get full API URL
export const getApiUrl = (path: string = ''): string => {
  // Ensure path starts with a slash if it doesn't already and isn't empty
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  // List of known API directories that should not get .php
  const apiDirectories = ['/api/pooling', '/api/admin', '/api/user'];
  const isApiDirectory = apiDirectories.some(dir => normalizedPath.startsWith(dir + '/') || normalizedPath === dir);

  // Add .php extension if the path is an API endpoint and doesn't already have an extension, doesn't end with a slash, and is not a known API directory
  if (
    normalizedPath.includes('/api/') &&
    !normalizedPath.includes('.php') &&
    !normalizedPath.endsWith('/') &&
    !isApiDirectory
  ) {
    return `${apiBaseUrl}${normalizedPath}.php`.replace(/([^:]\/)+/g, '$1');
  }

  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)+/g, '$1');
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
  getApiUrl,
  defaultHeaders,
  forceRefreshHeaders
};
