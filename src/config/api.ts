
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// CORS proxy settings
const useCorsProxy = import.meta.env.VITE_USE_CORS_PROXY === 'true';
export const corsProxyUrl = 'https://corsproxy.io/?';

// Function to get properly formatted URL with CORS proxy if needed
export function getApiUrl(endpoint: string): string {
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  return useCorsProxy ? `${corsProxyUrl}${encodeURIComponent(fullUrl)}` : fullUrl;
}

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
