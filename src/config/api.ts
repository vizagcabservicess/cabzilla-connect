
// Base API URL configuration - support relative URLs for better domain flexibility
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

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
  // Get current location for domain-relative URLs
  const baseUrl = apiBaseUrl.startsWith('http') 
    ? apiBaseUrl // Use as-is if it's a full URL
    : apiBaseUrl.startsWith('/') 
      ? apiBaseUrl // Use as-is if it starts with / (relative to domain root)
      : `/${apiBaseUrl}`; // Add leading slash if missing
  
  // Strip any leading slashes from the endpoint
  const cleanEndpoint = endpoint.startsWith('/')
    ? endpoint.substring(1)
    : endpoint;
  
  // Ensure base URL doesn't end with a slash
  const cleanBaseUrl = baseUrl.endsWith('/')
    ? baseUrl.slice(0, -1)
    : baseUrl;
  
  // Add timestamp to avoid caching
  const timestamp = Date.now();
  const separator = cleanEndpoint.includes('?') ? '&' : '?';
  
  return `${cleanBaseUrl}/${cleanEndpoint}${separator}_t=${timestamp}`;
};

// Helper to check if API is available
export const checkApiAvailability = async (): Promise<boolean> => {
  try {
    const url = createDirectApiUrl('/admin/database-diagnostic.php');
    console.log(`Checking API availability at: ${url}`);
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: defaultHeaders,
      // Short timeout for quick checking
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log("API check succeeded: API is available");
      return true;
    } else {
      console.warn(`API check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn('API availability check failed:', error);
    return false;
  }
};
