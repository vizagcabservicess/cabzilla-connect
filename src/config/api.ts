
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// CORS proxy settings - ULTRA ENHANCED VERSION
const corsProxyUrl = 'https://corsproxy.io/?'; // Hardcoded for maximum reliability

// Function to get properly formatted URL with CORS proxy ALWAYS enabled
export function getApiUrl(endpoint: string): string {
  // Clean any double slashes in the URL
  let fullUrl = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  // CRITICAL: Always apply CORS proxy - no conditional logic
  const finalUrl = `${corsProxyUrl}${encodeURIComponent(fullUrl)}`;
  
  // Add debug info to console
  console.log(`API URL: ${finalUrl} (CORS proxy: enforced)`);
  
  return finalUrl;
}

// Increase default timeout for stability
export const apiTimeout = 60000; // 60 seconds for maximum reliability

// Enhanced default headers with additional CORS support
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Origin': window.location.origin,
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': '*/*',
  'X-Force-Refresh': 'true',
  'X-CORS-Bypass': 'true'
};

// Force refresh headers
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
};
