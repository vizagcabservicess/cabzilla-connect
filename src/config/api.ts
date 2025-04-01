
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
  'Origin': typeof window !== 'undefined' ? window.location.origin : '*',
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': '*/*'
};

// Force refresh headers
export const forceRefreshHeaders = {
  ...defaultHeaders,
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'
};

// Direct vehicle API headers - more aggressive CORS settings
export const directVehicleHeaders = {
  ...forceRefreshHeaders,
  'X-Admin-Mode': 'true', 
  'Origin': typeof window !== 'undefined' ? window.location.origin : '*',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Request-Method': 'POST, GET, OPTIONS',
  'Access-Control-Request-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-Force-Refresh'
};

// Check if we should use the CORS fix endpoint
export const useCorsFixEndpoint = import.meta.env.VITE_USE_CORS_FIX === 'true';

// Check if we should use direct vehicle API
export const useDirectVehicleApi = import.meta.env.VITE_USE_DIRECT_VEHICLE_API === 'true';

// Maximum vehicle retry attempts
export const maxVehicleRetries = Number(import.meta.env.VITE_MAX_VEHICLE_RETRIES || 3);

// Enable offline fallback for vehicle operations
export const enableOfflineFallback = import.meta.env.VITE_ENABLE_OFFLINE_FALLBACK === 'true';
