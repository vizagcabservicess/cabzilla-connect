
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

// Create a direct connection endpoint 
export const createDirectApiUrl = (endpoint: string) => {
  const baseUrl = apiBaseUrl.endsWith('/')
    ? apiBaseUrl.slice(0, -1)
    : apiBaseUrl;
  
  const formattedEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;
  
  return `${baseUrl}${formattedEndpoint}`;
};
