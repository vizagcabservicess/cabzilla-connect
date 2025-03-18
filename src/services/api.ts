import axios from 'axios';
import { AuthResponse, LoginRequest, SignupRequest, BookingRequest, Booking, TourFare, VehiclePricing, FareUpdateRequest, VehiclePricingUpdateRequest, DashboardMetrics } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Initialize auth token from localStorage
const storedToken = localStorage.getItem('authToken');
if (storedToken) {
  setAuthToken(storedToken);
}

// Authentication API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/login', credentials);
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      setAuthToken(response.data.token);
    }
    
    return response.data;
  },
  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/api/signup', userData);
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      setAuthToken(response.data.token);
    }
    
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
  },
  getUserDashboard: async () => {
    const response = await axiosInstance.get('/api/user/dashboard');
    return response.data;
  },
};

// Booking API
export const bookingAPI = {
  createBooking: async (bookingData: BookingRequest) => {
    const response = await axiosInstance.post('/api/book', bookingData);
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
