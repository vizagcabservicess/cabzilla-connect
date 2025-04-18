
import axios, { AxiosRequestConfig } from 'axios';
import { apiBaseUrl, forceRefreshHeaders, defaultHeaders } from '@/config/api';
import { getForcedRequestConfig } from '@/config/requestConfig';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultHeaders,
  timeout: 30000
});

// Authentication API
export const authAPI = {
  login: async (credentials: any) => {
    try {
      const response = await api.post('/api/login', credentials);
      
      // Store token if present in response
      if (response.data && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  signup: async (userData: any) => {
    try {
      const response = await api.post('/api/signup', userData);
      
      // Store token if present in response
      if (response.data && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  
  logout: () => {
    // Clear authentication token and user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  isAdmin: () => {
    const userData = localStorage.getItem('user');
    if (!userData) return false;
    
    try {
      const user = JSON.parse(userData);
      return user.role === 'admin';
    } catch (e) {
      return false;
    }
  },
  
  getToken: () => {
    return localStorage.getItem('authToken');
  },
  
  // Add getCurrentUser method
  getCurrentUser: async () => {
    try {
      // Check if we have user data in localStorage first
      const userData = localStorage.getItem('user');
      if (userData) {
        return JSON.parse(userData);
      }
      
      // If not, fetch from API
      const response = await api.get('/api/get-current-user.php');
      if (response.data) {
        // Cache the user data
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }
};

// Fare API endpoints
export const fareAPI = {
  // Local fares
  getLocalFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/direct-local-fares.php', config);
    return response.data;
  },
  
  // Local fares for a specific vehicle
  getLocalFaresForVehicle: async (vehicleId: string, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get(`/api/direct-local-fares.php?vehicle_id=${vehicleId}`, config);
    return response.data;
  },
  
  // Outstation fares
  getOutstationFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/outstation-fares.php', config);
    return response.data;
  },
  
  // Outstation fares for a specific vehicle
  getOutstationFaresForVehicle: async (vehicleId: string, tripMode = 'one-way', distance = 0, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const params = new URLSearchParams();
    params.append('vehicle_id', vehicleId);
    params.append('trip_mode', tripMode);
    if (distance > 0) {
      params.append('distance', distance.toString());
    }
    
    const response = await api.get(`/api/outstation-fares.php?${params.toString()}`, config);
    return response.data;
  },
  
  // Airport fares
  getAirportFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/airport-fares.php', config);
    return response.data;
  },
  
  // Airport fares for a specific vehicle
  getAirportFaresForVehicle: async (vehicleId: string, distance = 0, forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const params = new URLSearchParams();
    params.append('vehicle_id', vehicleId);
    if (distance > 0) {
      params.append('distance', distance.toString());
    }
    
    const response = await api.get(`/api/airport-fares.php?${params.toString()}`, config);
    return response.data;
  },
  
  // Tour fares
  getTourFares: async (forceRefresh = false) => {
    const config: AxiosRequestConfig = {
      ...getForcedRequestConfig(),
      headers: {
        ...getForcedRequestConfig().headers,
        ...(forceRefresh ? forceRefreshHeaders : {})
      }
    };
    
    const response = await api.get('/api/tour-fares.php', config);
    return response.data;
  },
  
  // Add the missing methods for the tourAPI
  updateTourFares: async (tourData: any) => {
    try {
      const response = await api.put('/api/update-tour-fares.php', tourData);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fares:', error);
      throw error;
    }
  },
  
  addTourFare: async (tourData: any) => {
    try {
      const response = await api.post('/api/add-tour-fare.php', tourData);
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      throw error;
    }
  },
  
  deleteTourFare: async (tourId: string) => {
    try {
      const response = await api.delete(`/api/delete-tour-fare.php?id=${tourId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      throw error;
    }
  },
  
  // Add vehicle pricing methods
  getVehiclePricing: async (vehicleId: string) => {
    try {
      const response = await api.get(`/api/get-vehicle-pricing.php?id=${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting vehicle pricing:', error);
      throw error;
    }
  },
  
  updateVehiclePricing: async (vehicleId: string, pricingData: any) => {
    try {
      const response = await api.put(`/api/update-vehicle-pricing.php?id=${vehicleId}`, pricingData);
      return response.data;
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      throw error;
    }
  }
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: any) => {
    try {
      const response = await api.post('/api/create-booking.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  getBookings: async () => {
    try {
      const response = await api.get('/api/get-bookings.php');
      return response.data;
    } catch (error) {
      console.error('Error getting bookings:', error);
      throw error;
    }
  },
  
  getBookingById: async (bookingId: number) => {
    try {
      const response = await api.get(`/api/get-booking.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting booking #${bookingId}:`, error);
      throw error;
    }
  },
  
  updateBooking: async (bookingId: number, updateData: any) => {
    try {
      const response = await api.put(`/api/update-booking.php?id=${bookingId}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating booking #${bookingId}:`, error);
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: number, status: string) => {
    try {
      const response = await api.put(`/api/update-booking-status.php?id=${bookingId}`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating booking #${bookingId} status:`, error);
      throw error;
    }
  },
  
  deleteBooking: async (bookingId: number) => {
    try {
      const response = await api.delete(`/api/delete-booking.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting booking #${bookingId}:`, error);
      throw error;
    }
  },
  
  getUserBookings: async (userId?: number) => {
    try {
      const url = userId ? `/api/get-user-bookings.php?user_id=${userId}` : '/api/get-user-bookings.php';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  },
  
  getAllBookings: async () => {
    try {
      const response = await api.get('/api/get-all-bookings.php');
      return response.data;
    } catch (error) {
      console.error('Error getting all bookings:', error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async () => {
    try {
      const response = await api.get('/api/admin-dashboard-metrics.php');
      return response.data;
    } catch (error) {
      console.error('Error getting admin dashboard metrics:', error);
      throw error;
    }
  }
};

// Export missing methods for FareManagement
export const tourAPI = {
  updateTourFares: async (tourData: any) => {
    try {
      const response = await api.put('/api/update-tour-fares.php', tourData);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fares:', error);
      throw error;
    }
  },
  
  addTourFare: async (tourData: any) => {
    try {
      const response = await api.post('/api/add-tour-fare.php', tourData);
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      throw error;
    }
  },
  
  deleteTourFare: async (tourId: string) => {
    try {
      const response = await api.delete(`/api/delete-tour-fare.php?id=${tourId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      throw error;
    }
  }
};

// Export missing methods for VehicleFareManagement
export const vehicleAPI = {
  getVehiclePricing: async (vehicleId: string) => {
    try {
      const response = await api.get(`/api/get-vehicle-pricing.php?id=${vehicleId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting vehicle pricing:', error);
      throw error;
    }
  },
  
  updateVehiclePricing: async (vehicleId: string, pricingData: any) => {
    try {
      const response = await api.put(`/api/update-vehicle-pricing.php?id=${vehicleId}`, pricingData);
      return response.data;
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      throw error;
    }
  }
};

export default api;
