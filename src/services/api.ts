import axios, { AxiosInstance, AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Booking, BookingRequest, DashboardMetrics } from '@/types/api';

// Define API base URL
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

// Load token from localStorage on app initialization
const storedToken = localStorage.getItem('auth_token');
if (storedToken) {
  setAuthToken(storedToken);
}

// Function to handle API errors
const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error('API Error:', axiosError.message);
    if (axiosError.response) {
      console.error('Status Code:', axiosError.response.status);
      console.error('Response Data:', axiosError.response.data);
    }
  } else {
    console.error('Non-Axios Error:', error);
  }
};

// API service for authentication
export const authAPI = {
  async login(credentials: any): Promise<any> {
    try {
      const response = await apiClient.post('/auth/login.php', credentials);
      if (response.data.status === 'success') {
        const token = response.data.token;
        setAuthToken(token);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async register(userData: any): Promise<any> {
    try {
      const response = await apiClient.post('/auth/register.php', userData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  logout() {
    setAuthToken(null);
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const decodedToken: { exp: number } = jwtDecode(token);
      return decodedToken.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  },

  getCurrentUser(): any | null {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },
};

// API service for booking related operations
export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<any> {
    try {
      const response = await apiClient.post('/booking/create.php', bookingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to create booking');
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async getBooking(id: string): Promise<Booking> {
    try {
      const response = await apiClient.get(`/booking/details.php?id=${id}`);
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch booking details');
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  async updateBooking(id: string, bookingData: any): Promise<any> {
    try {
      const response = await apiClient.post(`/booking/update.php?id=${id}`, bookingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update booking');
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  async getUserBookings(): Promise<Booking[]> {
    try {
      console.log('Fetching user bookings...');
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/user/dashboard.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      handleApiError(error);
      throw error;
    }
  },

  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month' = 'week'): Promise<DashboardMetrics> {
    try {
      console.log(`Fetching admin dashboard metrics for period: ${period}...`);
      // Add admin=true and period parameters
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/user/dashboard.php?admin=true&period=${period}&_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch admin metrics');
      }
    } catch (error) {
      console.error('Error in getAdminDashboardMetrics:', error);
      handleApiError(error);
      throw error;
    }
  },
};

// API service for vehicle pricing
export const vehiclePricingAPI = {
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      console.log('Fetching vehicle pricing data...');
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/vehicles.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicle pricing data');
      }
    } catch (error) {
      console.error('Error in getVehiclePricing:', error);
      handleApiError(error);
      throw error;
    }
  },
};

// API service for tour fares
export const tourFaresAPI = {
  async getTourFares(): Promise<TourFare[]> {
    try {
      console.log('Fetching tour fares...');
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/tours.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch tour fares');
      }
    } catch (error) {
      console.error('Error in getTourFares:', error);
      handleApiError(error);
      throw error;
    }
  },
};
