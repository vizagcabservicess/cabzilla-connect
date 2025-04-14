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
  VehiclePricingUpdateRequest
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

const api = {
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

  // Bookings
  getBookings: async (): Promise<any[]> => {
    try {
      const response = await axiosInstance.get('/api/bookings.php');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
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

  updateBooking: async (bookingId: string, bookingData: BookingRequest): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.put(`/api/bookings.php?id=${bookingId}`, bookingData);
      return response.data;
    } catch (error) {
      console.error('Failed to update booking:', error);
      throw error;
    }
  },

  deleteBooking: async (bookingId: string): Promise<ApiResponse> => {
    try {
      const response = await axiosInstance.delete(`/api/bookings.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete booking:', error);
      throw error;
    }
  },

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
  },

  // Utility function to set auth token
  setAuthToken,
};

export default api;
