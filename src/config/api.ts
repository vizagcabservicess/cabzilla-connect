
// API configuration

// Base API URL - auto-detect between development and production
export const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://vizagup.com' 
  : '';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  // For relative URLs in development (working with Vite's proxy)
  if (process.env.NODE_ENV !== 'production') {
    // Ensure path starts with a slash if it doesn't already
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return normalizedPath;
  }
  
  // For production, use the full URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)\/+/g, '$1');
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

// Vehicle ID mapping to help with database/UI consistency
export const vehicleIdMapping = {
  // UI id to database column
  'MPV': 'innova',
  'innova_crysta': 'innova',
  'innova_hycross': 'innova',
  'etios': 'sedan',
  'dzire_cng': 'sedan',
  'tempo_traveller': 'tempo',
  'Toyota': 'sedan',
  'Dzire CNG': 'sedan',
  
  // Database column to UI id (for reverse mapping)
  'sedan': 'sedan',
  'ertiga': 'ertiga',
  'innova': 'innova',
  'tempo': 'tempo',
  'luxury': 'luxury',
  
  // Numeric ID to column mapping
  '1': 'sedan',
  '2': 'ertiga',
  '1266': 'innova',
  '1299': 'sedan',  // Etios
  '1311': 'sedan',  // Dzire CNG
  '1313': 'innova', // Innova Crysta
  '1314': 'tempo'   // Tempo Traveller
};

// Debug utility function - helps track API issues
export const logApiError = (error: any, context: string) => {
  console.error(`API Error in ${context}:`, error);
  
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    console.error('No response received. Request:', error.request);
  } else {
    console.error('Error message:', error.message);
  }
  
  console.error('Error config:', error.config);
  
  // Return a structured error object that can be used in UI
  return {
    message: error.response?.data?.message || error.message || 'Unknown error occurred',
    status: error.response?.status || 0,
    isNetworkError: !error.response,
    isServerError: error.response?.status >= 500,
    isAuthError: error.response?.status === 401 || error.response?.status === 403
  };
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  defaultHeaders,
  forceRefreshHeaders,
  vehicleIdMapping,
  logApiError
};
