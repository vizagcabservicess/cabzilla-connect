import axios from 'axios';
import { AuthResponse, LoginRequest, SignupRequest, BookingRequest, Booking, TourFare, VehiclePricing, FareUpdateRequest, VehiclePricingUpdateRequest, DashboardMetrics, User } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with improved configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
  withCredentials: false // Set to false to prevent CORS issues with credentials
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  config => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add cache busting parameter to GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    return config;
  },
  error => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  response => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  error => {
    if (error.response) {
      // Server responded with an error status code
      console.error(`❌ API Error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('❌ Network Error: No response received', error.request);
      
      // Add custom message for network errors
      const customError = new Error('Network Error: Unable to connect to the server');
      customError.name = 'NetworkError';
      return Promise.reject(customError);
    } else {
      // Something else happened in setting up the request
      console.error('❌ Request configuration error:', error.message);
    }
    return Promise.reject(error);
  }
);

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
  getUserBookings: async (): Promise<Booking[]> => {
    console.log('Fetching user bookings with auth token');
    try {
      // Ensure we have a token set
      const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required to fetch bookings');
      }
      
      // Make sure token is in headers for this request
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      // Add timestamp to bypass cache
      const timestamp = new Date().getTime();
      const url = `/api/user/bookings?_t=${timestamp}`;
      console.log('User bookings request URL:', `${API_BASE_URL}${url}`);
      
      const response = await axiosInstance.get(url, { 
        headers,
        withCredentials: false
      });
      
      console.log('User bookings response:', response.data);
      
      // Process the response to consistently return a Booking array
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle object response with data property
      if (response.data && typeof response.data === 'object') {
        // Case 1: The response has a 'data' property that is an array
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        // Case 2: The response has a 'status' property and a 'data' array
        else if (response.data.status === 'success' && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
      
      // If we reach here with a non-array response, log and return an empty array
      console.error('Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      
      // Better handling of specific error types
      if (axios.isAxiosError(error) && error.response) {
        console.error('Axios error response:', error.response.status, error.response.data);
        
        // If authentication issue, clear token
        if (error.response.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('auth_token');
          console.warn('Auth token cleared due to 401 response');
          throw new Error('Authentication failed. Please login again.');
        }
        
        // Throw error with server message if available
        if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      }
      
      // For network errors, provide a clearer message
      if (error instanceof Error) {
        if (error.message.includes('Network Error')) {
          throw new Error('Unable to connect to the server. Please check your internet connection.');
        }
        
        // Pass through the error message
        throw error;
      }
      
      // Fallback for any other errors
      throw new Error('Failed to fetch bookings. Please try again later.');
    }
  },
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month'): Promise<DashboardMetrics> => {
    const response = await axiosInstance.get(`/api/admin/metrics?period=${period}`);
    
    // Make sure we return the proper data format
    if (response.data && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
  deleteBooking: async (bookingId: string): Promise<any> => {
    console.log('Deleting booking:', bookingId);
    const response = await axiosInstance.delete(`/api/admin/booking/${bookingId}`);
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
