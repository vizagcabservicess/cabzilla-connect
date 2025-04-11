// Import necessary types
import { TourFare } from '@/types/api';
import axios, { AxiosRequestConfig, AxiosHeaders } from 'axios';

// Create an axios instance with defaults
const apiClient = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token in all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    // Log token for debugging purposes
    console.log('Auth token for request:', token);
    
    if (token) {
      // Ensure config.headers is properly initialized as AxiosHeaders
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      
      // Set the Authorization header
      config.headers.set('Authorization', `Bearer ${token}`);
      
      // Log the headers for debugging
      console.log('Request headers:', JSON.stringify(config.headers));
    } else {
      console.warn('No auth token found in localStorage');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Tour fare API methods
export const fareAPI = {
  // Get all tour fares
  getTourFares: async (): Promise<TourFare[]> => {
    try {
      // Use the correct endpoint from fares/tours.php
      const response = await apiClient.get('/api/fares/tours.php');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      throw error;
    }
  },

  // Update a tour fare
  updateTourFares: async (fareData: any): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      console.log('Sending tour fare update with auth token:', token);
      
      // Use the correct endpoint for tour fare updates with explicit headers
      const response = await apiClient.post('/api/admin/fares-update.php', fareData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  // Add a new tour fare
  addTourFare: async (fareData: any): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      console.log('Sending new tour fare with auth token:', token);
      
      // Use the correct endpoint for adding tour fares with explicit headers
      const response = await apiClient.put('/api/admin/fares-update.php', fareData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  // Delete a tour fare
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      
      // Use the correct endpoint with query parameter and explicit headers
      const response = await apiClient.delete(`/api/admin/fares-update.php?tourId=${tourId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },
  
  // Get vehicle pricing - placeholder implementation for compatibility
  getVehiclePricing: async (): Promise<any[]> => {
    try {
      // This is a redirect to use the tour fares API for now
      return await fareAPI.getTourFares();
    } catch (error) {
      console.error('Error fetching vehicle pricing:', error);
      throw error;
    }
  },
  
  // Update vehicle pricing - placeholder implementation for compatibility
  updateVehiclePricing: async (pricingData: any): Promise<any> => {
    try {
      // Redirect to use the tour fares update API
      return await fareAPI.updateTourFares(pricingData);
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      throw error;
    }
  }
};

// Create booking API service - now properly exported
export const bookingAPI = {
  // Placeholder methods for booking API
  createBooking: async (bookingData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/bookings/create.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  getBookingById: async (bookingId: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/api/bookings/${bookingId}.php`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  getUserBookings: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/api/bookings/user.php');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },
  
  // Add the missing getAllBookings method
  getAllBookings: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/api/admin/booking.php');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      throw error;
    }
  },
  
  updateBooking: async (bookingId: number, bookingData: any): Promise<any> => {
    try {
      const response = await apiClient.post(`/api/bookings/${bookingId}/update.php`, bookingData);
      return response.data;
    } catch (error) {
      console.error(`Error updating booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: number, status: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/api/bookings/${bookingId}/status.php`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating status for booking ${bookingId}:`, error);
      throw error;
    }
  },
  
  deleteBooking: async (bookingId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/api/bookings/${bookingId}/delete.php`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (period: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/api/admin/metrics.php?period=${period}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard metrics:', error);
      throw error;
    }
  }
};

// Create auth API service - now properly exported
export const authAPI = {
  // Placeholder methods for auth API
  login: async (credentials: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/login.php', credentials);
      if (response.data && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
  },
  
  signup: async (userData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/signup.php', userData);
      if (response.data && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },
  
  isAdmin: (): boolean => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user.role === 'admin';
    } catch {
      return false;
    }
  },
  
  getCurrentUser: async (): Promise<any> => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
};

// Export the API client for direct use
export default apiClient;
