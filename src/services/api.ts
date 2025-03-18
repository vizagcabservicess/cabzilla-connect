
import axios from 'axios';
import { AuthResponse, LoginRequest, SignupRequest, BookingRequest, Booking, TourFare, VehiclePricing, FareUpdateRequest, VehiclePricingUpdateRequest, DashboardMetrics, User } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('Auth token set in headers', { tokenLength: token.length });
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
    console.log('Auth token removed from headers');
  }
};

// Initialize auth token from localStorage with more robust checking
const initializeToken = () => {
  try {
    if (typeof window !== 'undefined') {
      // Check both possible storage locations
      const storedToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      
      if (storedToken) {
        console.log('Found stored token, initializing API client', { tokenLength: storedToken.length });
        setAuthToken(storedToken);
      } else {
        console.log('No stored token found during initialization');
      }
    }
  } catch (error) {
    console.error('Error initializing auth token:', error);
  }
};

// Call initialization function
initializeToken();

// Authentication API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    console.log('Login request to:', `${API_BASE_URL}/api/login`);
    const response = await axiosInstance.post<AuthResponse>('/api/login', credentials);
    
    if (response.data.success && response.data.token) {
      // Store token in both keys for backward compatibility
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('auth_token', response.data.token);
      
      // Store user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      setAuthToken(response.data.token);
      console.log('Login successful, token saved');
    }
    
    return response.data;
  },
  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    console.log('Signup request to:', `${API_BASE_URL}/api/signup`);
    const response = await axiosInstance.post<AuthResponse>('/api/signup', userData);
    
    if (response.data.success && response.data.token) {
      // Store token in both keys for backward compatibility
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('auth_token', response.data.token);
      
      // Store user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      setAuthToken(response.data.token);
      console.log('Signup successful, token saved');
    }
    
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setAuthToken(null);
    console.log('User logged out, tokens cleared');
  },
  getUserDashboard: async () => {
    const response = await axiosInstance.get('/api/user/dashboard');
    return response.data;
  },
  // Authentication helper methods
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    return !!token;
  },
  getCurrentUser: (): User | null => {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
    } catch (e) {
      console.error('Error parsing user data', e);
    }
    return null;
  },
  isAdmin: (): boolean => {
    const user = authAPI.getCurrentUser();
    return user?.role === 'admin' || false;
  }
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: BookingRequest) => {
    console.log('Creating booking with data:', bookingData);
    const response = await axiosInstance.post('/api/book', bookingData);
    console.log('Booking API response:', response.data);
    return response.data;
  },
  getBookingById: async (bookingId: string) => {
    const response = await axiosInstance.get(`/api/user/booking/${bookingId}`);
    return response.data;
  },
  updateBooking: async (bookingId: string, bookingData: Partial<BookingRequest>) => {
    const response = await axiosInstance.put(`/api/update-booking/${bookingId}`, bookingData);
    return response.data;
  },
  getReceipt: async (bookingId: string) => {
    const response = await axiosInstance.get(`/api/receipt/${bookingId}`);
    return response.data;
  },
  getAllBookings: async () => {
    const response = await axiosInstance.get('/api/admin/bookings');
    return response.data;
  },
  getUserBookings: async () => {
    console.log('Fetching user bookings with auth token');
    try {
      // Add timestamp to bypass cache
      const timestamp = new Date().getTime();
      const url = `/api/user/bookings?_t=${timestamp}`;
      console.log('User bookings request URL:', url);
      
      const response = await axiosInstance.get(url);
      console.log('User bookings response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      // Check specific error types and provide better handling
      if (axios.isAxiosError(error) && error.response) {
        console.error('Axios error response:', error.response.status, error.response.data);
        // If authentication issue, clear token
        if (error.response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('auth_token');
          console.warn('Auth token cleared due to 401 response');
        }
      }
      throw error;
    }
  },
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month'): Promise<DashboardMetrics> => {
    const response = await axiosInstance.get(`/api/admin/metrics?period=${period}`);
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  getBookings: async () => {
    const response = await axiosInstance.get('/api/admin/bookings');
    return response.data;
  },
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month'): Promise<DashboardMetrics> => {
    const response = await axiosInstance.get(`/api/admin/metrics?period=${period}`);
    return response.data;
  },
};

// Fare Management API
export const fareAPI = {
  getTourFares: async (): Promise<TourFare[]> => {
    const response = await axiosInstance.get('/api/admin/fares/tours');
    return response.data;
  },
  updateTourFares: async (fareData: FareUpdateRequest): Promise<TourFare> => {
    const response = await axiosInstance.post('/api/admin/fares/update', fareData);
    return response.data;
  },
  getVehiclePricing: async (): Promise<VehiclePricing[]> => {
    const response = await axiosInstance.get('/api/admin/fares/vehicles');
    return response.data;
  },
  updateVehiclePricing: async (pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing> => {
    const response = await axiosInstance.post('/api/admin/km-price/update', pricingData);
    return response.data;
  },
};
