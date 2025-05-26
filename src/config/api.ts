
// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-domain.com';

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export const API_ENDPOINTS = {
  // Main API endpoints
  auth: '/api/auth',
  bookings: '/api/bookings',
  
  // Pooling API endpoints
  pooling: {
    auth: '/api/pooling/auth',
    rides: '/api/pooling/rides',
    bookings: '/api/pooling/bookings',
    guest: '/api/pooling/guest',
    provider: '/api/pooling/provider',
    admin: '/api/pooling/admin',
    payments: '/api/pooling/payments'
  }
};
