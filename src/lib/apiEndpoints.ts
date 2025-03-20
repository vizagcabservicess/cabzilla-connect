
// API Endpoints for the application
// This file centralizes all API endpoint URLs and provides fallback mechanisms

// Get base URL from environment or use relative paths
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_DIRECT_API_PATH = import.meta.env.VITE_USE_DIRECT_API_PATH === 'true';

// Base URLs for API requests - prioritize relative paths for better CORS handling
const API_BASE_URLS = [
  '/api',                   // Primary endpoint - relative to current domain
  API_BASE_URL ? `${API_BASE_URL}/api` : '', // Environment-configured base URL
  'https://api.example.com', // Placeholder for production API (update with real URL)
];

// Filter out empty URLs
const FILTERED_BASE_URLS = API_BASE_URLS.filter(url => url);

// Endpoint paths (without base URL)
const ENDPOINTS = {
  // Vehicle data endpoints
  VEHICLES: {
    LIST: '/fares/vehicles',
    DATA: '/fares/vehicles-data',
    UPDATE: '/admin/vehicles-update',
    PRICING: '/admin/vehicle-pricing'
  },
  
  // Other endpoint categories can be added here as needed
  FARES: {
    TOURS: '/fares/tours',
    UPDATE: '/admin/fares/update',
    KM_PRICE: '/admin/km-price/update'
  }
};

// Function to get all possible URLs for a specific endpoint
export const getEndpointUrls = (endpointPath: string, appendTimestamp = true): string[] => {
  const timestamp = appendTimestamp ? `?_t=${Date.now()}` : '';
  const urls: string[] = [];
  
  // For direct path option, just prepend base URL directly
  if (USE_DIRECT_API_PATH && API_BASE_URL) {
    urls.push(`${API_BASE_URL}${endpointPath}.php${timestamp}`);
    urls.push(`${API_BASE_URL}${endpointPath}${timestamp}`);
  }
  
  // Generate all possible URLs for the endpoint
  FILTERED_BASE_URLS.forEach(base => {
    // Add standard PHP extension
    urls.push(`${base}${endpointPath}.php${timestamp}`);
    // Add clean URL (for frameworks that don't use .php)
    urls.push(`${base}${endpointPath}${timestamp}`);
  });
  
  // For local development fallback to /api path
  urls.push(`/api${endpointPath}.php${timestamp}`);
  urls.push(`/api${endpointPath}${timestamp}`);
  
  // Direct access for some endpoints (fallback)
  if (API_BASE_URL) {
    // Add direct access without /api prefix for some endpoints
    urls.push(`${API_BASE_URL}/admin${endpointPath.replace('/admin', '')}.php${timestamp}`);
    urls.push(`${API_BASE_URL}/admin${endpointPath.replace('/admin', '')}${timestamp}`);
    urls.push(`${API_BASE_URL}/fares${endpointPath.replace('/fares', '')}.php${timestamp}`);
    urls.push(`${API_BASE_URL}/fares${endpointPath.replace('/fares', '')}${timestamp}`);
  }

  // Remove duplicates
  return [...new Set(urls)];
};

// Helper function to get vehicle data endpoint URLs with timestamp
export const getVehicleDataUrls = (appendTimestamp = true): string[] => {
  return getEndpointUrls(ENDPOINTS.VEHICLES.DATA, appendTimestamp);
};

// Helper function to get vehicle list endpoint URLs with timestamp
export const getVehicleListUrls = (appendTimestamp = true): string[] => {
  return getEndpointUrls(ENDPOINTS.VEHICLES.LIST, appendTimestamp);
};

// Helper function to get vehicle pricing endpoint URLs
export const getVehiclePricingUrls = (appendTimestamp = true): string[] => {
  return getEndpointUrls(ENDPOINTS.VEHICLES.PRICING, appendTimestamp);
};

// Helper function to get vehicle update endpoint URLs
export const getVehicleUpdateUrls = (appendTimestamp = true): string[] => {
  return getEndpointUrls(ENDPOINTS.VEHICLES.UPDATE, appendTimestamp);
};

export default {
  getEndpointUrls,
  getVehicleDataUrls,
  getVehicleListUrls,
  getVehiclePricingUrls,
  getVehicleUpdateUrls,
  ENDPOINTS
};
