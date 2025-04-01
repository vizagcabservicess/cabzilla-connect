
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// Default timeout in milliseconds
export const apiTimeout = 30000;

// Default headers
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Force refresh headers
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'X-Force-Refresh': 'true'
};

// Add CORS headers to help with cross-domain requests
export const corsHeaders = {
  ...defaultHeaders,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Force-Refresh, X-Admin-Mode'
};

// Create a direct connection endpoint with enhanced error handling
export const createDirectApiUrl = (endpoint: string) => {
  // Strip any leading slashes from the endpoint
  const cleanEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;
  
  // Ensure base URL doesn't end with a slash
  const cleanBaseUrl = apiBaseUrl.endsWith('/')
    ? apiBaseUrl.slice(0, -1)
    : apiBaseUrl;
  
  // Add timestamp to avoid caching
  const timestamp = Date.now();
  const separator = cleanEndpoint.includes('?') ? '&' : '?';
  
  return `${cleanBaseUrl}${cleanEndpoint}${separator}_t=${timestamp}`;
};

// Helper to check if API is available
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const url = createDirectApiUrl('/api/admin/database-diagnostic.php');
    const response = await fetch(url, {
      method: 'HEAD',
      headers: defaultHeaders,
      // Short timeout for quick checking
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok;
  } catch (error) {
    console.warn('API availability check failed:', error);
    return false;
  }
};
