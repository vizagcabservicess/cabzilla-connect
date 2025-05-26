
// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-domain.com' 
  : 'http://localhost';

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login.php',
    REGISTER: '/api/auth/register.php',
    LOGOUT: '/api/auth/logout.php',
    ME: '/api/auth/me.php',
  },
  POOLING: {
    RIDES: '/api/pooling/rides.php',
    BOOKINGS: '/api/pooling/bookings.php',
    SEARCH: '/api/pooling/search.php',
    WALLET: '/api/pooling/wallet.php',
  },
};
