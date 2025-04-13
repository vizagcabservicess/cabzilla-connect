
// API configuration

// Get base API URL from environment or fallback to empty string (relative URLs)
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

// Function to generate full API URL
export const getApiUrl = (path: string): string => {
  // If the path already starts with http(s), return it as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If path already starts with a slash, don't add another one
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Return the full URL
  return `${apiBaseUrl}${normalizedPath}`;
};

// Headers for forcing API refresh (no caching)
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'X-Requested-With': 'XMLHttpRequest'
};

// Headers for administrative actions
export const adminHeaders = {
  ...forceRefreshHeaders,
  'X-Admin-Mode': 'true'
};

// Function to get request config with force refresh
export const getForcedRequestConfig = () => ({
  headers: forceRefreshHeaders,
  cache: 'no-store' as const
});

// Function to get admin request config
export const getAdminRequestConfig = () => ({
  headers: adminHeaders,
  cache: 'no-store' as const
});
