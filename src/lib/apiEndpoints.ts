// API Endpoints for the application
// This file centralizes all API endpoint URLs and provides fallback mechanisms

// Base URLs for API requests
const API_BASE_URLS = [
  '/api',                   // Primary endpoint - relative to current domain
  'https://api.example.com', // Placeholder for production API (update with real URL)
  'https://backup-api.example.com', // Placeholder for backup API (update with real URL)
];

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
  
  // Generate all possible URLs for the endpoint
  // Primary base + standard PHP extension
  const standardUrls = API_BASE_URLS.map(base => `${base}${endpointPath}.php${timestamp}`);
  
  // Primary base without PHP extension (for frameworks that don't use .php)
  const cleanUrls = API_BASE_URLS.map(base => `${base}${endpointPath}${timestamp}`);
  
  // Combine and return all URLs with primary URLs first
  return [...standardUrls, ...cleanUrls];
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
