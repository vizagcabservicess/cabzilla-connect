
// API configuration

// Base API URL - auto-detect between development and production
const apiBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://vizagup.com' 
  : 'https://43014fa9-5dfc-4d2d-a3b8-389cd9ef25a7.lovableproject.com';

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  return `${apiBaseUrl}${path}`;
};

// Default headers for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  defaultHeaders
};
