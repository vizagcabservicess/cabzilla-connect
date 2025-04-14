import axios from 'axios';
import { 
  ApiResponse, 
  BookingRequest, 
  FareUpdateRequest, 
  LoginRequest, 
  SignupRequest, 
  TourFare, 
  User, 
  VehiclePricing,
  VehiclePricingUpdateRequest,
  Booking
} from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set JWT token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Authentication API
export const authAPI = {
  // Authentication
  login: async (credentials: LoginRequest): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.post('/api/login.php', credentials);
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  signup: async (userData: SignupRequest): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.post('/api/signup.php', userData);
      return response.data;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
  
  isAdmin: () => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        return parsed.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },
  
  getCurrentUser: async () => {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        return JSON.parse(userData);
      }
      const response = await axiosInstance.get('/api/me.php');
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setAuthToken(null);
  },
  
  updateUserRole: async (userId: string | number, role: 'admin' | 'user' | 'driver') => {
    try {
      const response = await axiosInstance.put(`/api/users.php?id=${userId}`, { role });
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  }
};

// Booking API
export const bookingAPI = {
  getBookings: async (): Promise<Booking[]> => {
    try {
      const response = await axiosInstance.get('/api/bookings.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      throw error;
    }
  },

  getAllBookings: async (): Promise<Booking[]> => {
    try {
      const response = await axiosInstance.get('/api/admin/bookings.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all bookings:', error);
      throw error;
    }
  },

  createBooking: async (bookingData: BookingRequest) => {
    // bookingRequest may or may not include userId, so we don't need to check for it
    console.log('Creating booking:', bookingData);

    try {
      const response = await axiosInstance.post('/api/create-booking.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  getBookingById: async (bookingId: number) => {
    try {
      const response = await axiosInstance.get(`/api/bookings.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch booking ${bookingId}:`, error);
      throw error;
    }
  },

  updateBooking: async (bookingId: number, bookingData: Partial<BookingRequest>): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put(`/api/bookings.php?id=${bookingId}`, bookingData);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking:', error);
      throw error;
    }
  },

  updateBookingStatus: async (bookingId: number, newStatus: string): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put(`/api/bookings.php?id=${bookingId}`, { status: newStatus });
      return response.data;
    } catch (error) {
      console.error('Failed to update booking status:', error);
      throw error;
    }
  },

  deleteBooking: async (bookingId: number): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.delete(`/api/bookings.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete booking:', error);
      throw error;
    }
  },
  
  getUserBookings: async (userId?: number, options = {}) => {
    try {
      const params = userId ? { userId, ...options } : options;
      const response = await axiosInstance.get(`/api/user-bookings.php`, { params });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user bookings:`, error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (period = 'week', options = {}) => {
    try {
      const response = await axiosInstance.get(`/api/admin/dashboard-metrics.php?period=${period}`, { params: options });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch admin dashboard metrics:', error);
      throw error;
    }
  }
};

// User API
export const userAPI = {
  // User Management
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await axiosInstance.get('/api/users.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  createUser: async (userData: User): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.post('/api/users.php', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  updateUser: async (userId: string | number, userData: User): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put(`/api/users.php?id=${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },

  deleteUser: async (userId: string | number): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.delete(`/api/users.php?id=${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },
  
  updateUserRole: async (userId: string | number, role: 'admin' | 'user' | 'driver'): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put(`/api/users.php?id=${userId}`, { role });
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  }
};

// Fare API
export const fareAPI = {
  // Fare Management
  getVehiclePricing: async (): Promise<VehiclePricing[]> => {
    try {
      const response = await axiosInstance.get('/api/admin/vehicle-pricing.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch vehicle pricing:', error);
      throw error;
    }
  },

  updateVehiclePricing: async (pricingData: VehiclePricingUpdateRequest): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.post('/api/admin/vehicle-pricing-update.php', pricingData);
      return response.data;
    } catch (error) {
      console.error('Failed to update vehicle pricing:', error);
      throw error;
    }
  },

  getTourFares: async (): Promise<TourFare[]> => {
    try {
      const response = await axiosInstance.get('/api/admin/fares-tours.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch tour fares:', error);
      throw error;
    }
  },

  updateTourFares: async (fareData: FareUpdateRequest): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.post('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Failed to update tour fares:', error);
      throw error;
    }
  },

  addTourFare: async (fareData: TourFare): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put('/api/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      console.error('Failed to add tour fare:', error);
      throw error;
    }
  },

  deleteTourFare: async (tourId: string): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.delete(`/api/admin/fares-update.php?tourId=${tourId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete tour fare:', error);
      throw error;
    }
  }
};

// Export the full API object for backward compatibility
export default {
  ...authAPI,
  ...bookingAPI,
  ...userAPI,
  ...fareAPI,
  setAuthToken
};
