
import axios from 'axios';
import { BookingRequest } from '@/types/api';

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

export const bookingAPI = {
  getBookings: async (userId?: number) => {
    const response = await apiClient.get(userId ? `/user/bookings?userId=${userId}` : '/bookings');
    return response.data;
  },
  
  getBookingById: async (id: string | number) => {
    const response = await apiClient.get(`/bookings/${id}`);
    return response.data;
  },
  
  createBooking: async (bookingData: BookingRequest, authToken?: string | null) => {
    // Create headers object with auth token if available
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    
    console.log('Creating booking with auth:', !!authToken);
    
    try {
      const response = await apiClient.post('/book', bookingData, { headers });
      
      // Handle if response is HTML instead of JSON (error case)
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.error('Received HTML response instead of JSON:', response.data.substring(0, 100));
        throw new Error('Invalid response format received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Booking creation error:', error);
      throw error;
    }
  },
  
  updateBooking: async (id: string | number, data: any) => {
    const response = await apiClient.put(`/update-booking/${id}`, data);
    return response.data;
  },
  
  cancelBooking: async (id: string | number) => {
    const response = await apiClient.put(`/update-booking/${id}`, { status: 'cancelled' });
    return response.data;
  }
};

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post('/login', credentials);
    return response.data;
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post('/signup', userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
      const response = await apiClient.get('/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
};

export const vehicleAPI = {
  getVehicles: async () => {
    const response = await apiClient.get('/vehicles');
    return response.data;
  }
};

export default {
  booking: bookingAPI,
  auth: authAPI,
  vehicle: vehicleAPI
};
