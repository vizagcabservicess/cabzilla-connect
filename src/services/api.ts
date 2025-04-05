import axios from 'axios';
import { apiBaseUrl, defaultHeaders } from '@/config/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultHeaders,
  timeout: 30000
});

// Add request interceptor for authentication
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/api/auth/login.php', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (userData: any) => {
    try {
      const response = await axiosInstance.post('/api/auth/register.php', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
  
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  isAdmin: () => {
    const user = authAPI.getCurrentUser();
    return user && user.role === 'admin';
  },
  
  updateUserRole: async (userId: string, role: string) => {
    try {
      const response = await axios.post(`/api/admin/users.php?id=${userId}`, { role });
      return response.data;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  },
  
  getAllUsers: async () => {
    try {
      const response = await axios.get('/api/admin/users.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }
};

// Booking API endpoints
export const bookingAPI = {
  createBooking: async (bookingData: any) => {
    try {
      const response = await axiosInstance.post('/api/booking.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Booking creation error:', error);
      throw error;
    }
  },
  
  getUserBookings: async () => {
    try {
      const response = await axiosInstance.get('/api/user/bookings.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },
  
  updateBooking: async (bookingId: string | number, data: any) => {
    try {
      const response = await axios.post(`/api/update-booking.php?id=${bookingId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: string | number, status: string) => {
    try {
      const response = await axios.post(`/api/update-booking.php?id=${bookingId}`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },
  
  deleteBooking: async (bookingId: string | number) => {
    try {
      const response = await axios.delete(`/api/admin/booking.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },
  
  getBookingById: async (bookingId: string | number) => {
    try {
      const response = await axios.get(`/api/user/booking.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw error;
    }
  },
  
  getAllBookings: async () => {
    try {
      const response = await axios.get('/api/admin/booking.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return [];
    }
  }
};

// Vehicle API endpoints
export const vehicleAPI = {
  getVehicles: async () => {
    try {
      const response = await axiosInstance.get('/api/vehicles.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  },
  
  getVehicleById: async (id: string) => {
    try {
      const response = await axiosInstance.get(`/api/vehicle.php?id=${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching vehicle ${id}:`, error);
      throw error;
    }
  }
};

// Fare API endpoints
export const fareAPI = {
  getTourFares: async () => {
    try {
      const response = await axios.get('/api/fares/tours.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      return [];
    }
  },
  
  getLocalFares: async () => {
    try {
      const response = await axios.get('/api/local-fares.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching local fares:', error);
      return [];
    }
  },
  
  getAirportFares: async () => {
    try {
      const response = await axios.get('/api/airport-fares.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching airport fares:', error);
      return [];
    }
  },
  
  getOutstationFares: async () => {
    try {
      const response = await axios.get('/api/outstation-fares.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching outstation fares:', error);
      return [];
    }
  },
  
  // Add other fare-related API methods
  updateLocalFares: async (data: any) => {
    try {
      const response = await axios.post('/api/admin/local-fares-update.php', data);
      return response.data;
    } catch (error) {
      console.error('Error updating local fares:', error);
      throw error;
    }
  },
  
  updateAirportFares: async (data: any) => {
    try {
      const response = await axios.post('/api/admin/airport-fares-update.php', data);
      return response.data;
    } catch (error) {
      console.error('Error updating airport fares:', error);
      throw error;
    }
  },
  
  updateOutstationFares: async (data: any) => {
    try {
      const response = await axios.post('/api/admin/outstation-fares-update.php', data);
      return response.data;
    } catch (error) {
      console.error('Error updating outstation fares:', error);
      throw error;
    }
  }
};

// User profile API endpoints
export const userAPI = {
  getUserProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/user/profile.php');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  updateUserProfile: async (profileData: any) => {
    try {
      const response = await axiosInstance.post('/api/user/profile.php', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

// Export the axios instance for direct use
export default axiosInstance;
