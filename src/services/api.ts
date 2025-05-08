
import axios from 'axios';
import { BookingRequest, Booking } from '@/types/api';
import { getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';
import { bookingAPI } from './api/bookingAPI';
import { authAPI } from './api/authAPI';
import { vehicleAPI } from './api/vehicleAPI';
import { fareAPI } from './api/fareAPI';
import { fleetAPI } from './api/fleetAPI';
import { userAPI } from './api/userAPI';
import { expenseAPI } from './api/expenseAPI';
import { payrollAPI } from './api/payrollAPI';

const API_URL = '/api';

// Create an axios instance for better control
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Log requests and responses globally
apiClient.interceptors.request.use(
  config => {
    // Add auth token to all requests if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
      data: config.data,
      params: config.params,
      headers: config.headers
    });
    return config;
  }, 
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => {
    console.log(`API Response (${response.status}):`, response.data);
    return response;
  },
  error => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Helper to get current user ID from localStorage
const getCurrentUserId = (): number | null => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user ID from localStorage:', error);
    return null;
  }
};

// Export the APIs from the separate modules directly
export { 
  bookingAPI, 
  authAPI, 
  vehicleAPI, 
  fareAPI, 
  fleetAPI, 
  userAPI,
  expenseAPI,
  payrollAPI
};

// Also export a default object for compatibility
export default {
  booking: bookingAPI,
  auth: authAPI,
  vehicle: vehicleAPI,
  fare: fareAPI,
  fleet: fleetAPI,
  user: userAPI,
  expense: expenseAPI,
  payroll: payrollAPI
};
