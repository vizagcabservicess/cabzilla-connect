
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// CORS proxy settings - ENHANCED TO PREVENT ISSUES
const useCorsProxy = true; // Always use CORS proxy regardless of env setting
export const corsProxyUrl = 'https://corsproxy.io/?'; // Hardcoded for reliability

// Function to get properly formatted URL with CORS proxy if needed
export function getApiUrl(endpoint: string): string {
  // Clean any double slashes in the URL
  let fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // Always apply CORS proxy for maximum compatibility
  const finalUrl = `${corsProxyUrl}${encodeURIComponent(fullUrl)}`;
  
  // Add debug info to console
  console.log(`API URL: ${finalUrl} (CORS proxy: enabled)`);
  
  return finalUrl;
}

// Increase default timeout for stability
export const apiTimeout = 45000;

// Enhanced default headers with additional CORS support
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Origin': window.location.origin,
  'X-Requested-With': 'XMLHttpRequest',
  // Add additional headers to help with CORS
  'Accept': '*/*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Force refresh headers
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'X-Force-Refresh': 'true'
};
