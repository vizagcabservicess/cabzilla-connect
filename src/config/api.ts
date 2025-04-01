
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
