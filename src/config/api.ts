

export const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export const forceRefreshHeaders = {
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Export alias for backward compatibility
export const apiBaseUrl = API_BASE_URL;

// Helper function to get API URL
export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

