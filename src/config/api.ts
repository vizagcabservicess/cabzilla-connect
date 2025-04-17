
// API configuration

// Base API URL - auto-detect between development and production
export const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://vizagup.com' 
  : 'https://43014fa9-5dfc-4d2d-a3b8-389cd9ef25a7.lovableproject.com';

// Helper function to get full API URL
export const getApiUrl = (path: string = ''): string => {
  // Check if path is already a complete URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Determine if we should use Vizagup API for certain endpoints
  const useVizagupApi = process.env.NODE_ENV === 'development' && 
                        (path.includes('direct-local-fares.php') || 
                         path.includes('direct-booking-data.php'));
  
  // Use vizagup.com API directly for certain endpoints even in development
  const baseUrl = useVizagupApi ? 'https://vizagup.com' : apiBaseUrl;
  
  // If no path is provided, return the base URL
  if (!path) {
    return baseUrl;
  }
  
  // Ensure path starts with a slash if it doesn't already
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${baseUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
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
