
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// CORS proxy settings
const useCorsProxy = import.meta.env.VITE_USE_CORS_PROXY === 'true';
export const corsProxyUrl = import.meta.env.VITE_CORS_PROXY_URL || 'https://corsproxy.io/?';

// Function to get properly formatted URL with CORS proxy if needed
export function getApiUrl(endpoint: string): string {
  // Make sure we have a full URL to encode
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Apply CORS proxy if enabled
  const finalUrl = useCorsProxy ? `${corsProxyUrl}${encodeURIComponent(fullUrl)}` : fullUrl;
  
  // Add debug info to console
  console.log(`API URL: ${finalUrl} (CORS proxy: ${useCorsProxy ? 'enabled' : 'disabled'})`);
  
  return finalUrl;
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
