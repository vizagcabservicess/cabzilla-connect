
// API configuration for the application
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://vizagup.com';

export const getApiUrl = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint}`;
};

export const config = {
  apiBaseUrl: API_BASE_URL,
  endpoints: {
    auth: '/api/auth',
    pooling: '/api/pooling',
    admin: '/api/admin',
    user: '/api/user'
  }
};
