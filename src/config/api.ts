
// Base API URL configuration
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

// Function to get properly formatted API URL
export function getApiUrl(endpoint: string): string {
  // Handle absolute URLs
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Clean any double slashes in the URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${apiBaseUrl}${cleanEndpoint}`;
  
  // Always log the URL being accessed for debugging
  console.log(`API request to: ${fullUrl}`);
  
  return fullUrl;
}

// Increase default timeout for stability
export const apiTimeout = 60000; // 60 seconds for maximum reliability

// Enhanced default headers with CORS support
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Origin': window.location.origin,
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': '*/*'
};

// Force refresh headers
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
};
