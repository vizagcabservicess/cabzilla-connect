
// Import necessary types
import { TourFare } from '@/types/api';
import axios from 'axios';

// Create an axios instance with defaults
const apiClient = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      // Use the correct endpoint for tour fare updates
      const response = await apiClient.post('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fare:', error);
      throw error;
    }
  },

  // Add a new tour fare
  addTourFare: async (fareData: any): Promise<any> => {
    try {
      // Use the correct endpoint for adding tour fares
      const response = await apiClient.put('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      throw error;
    }
  },

  // Delete a tour fare
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      // Use the correct endpoint with query parameter
      const response = await apiClient.delete(`/api/admin/fares-update.php?tourId=${tourId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      throw error;
    }
  },
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
