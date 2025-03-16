
import axios, { AxiosInstance, AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Booking, BookingRequest, DashboardMetrics, TourFare, VehiclePricingUpdateRequest, VehiclePricing } from '@/types/api';

// Define API base URL - modify to use import.meta.env for Vite instead of process.env
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 15000, // Add a timeout to prevent long-hanging requests
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
    
    // Add special handling for network errors
    if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
      console.error('Network error - server may be down or unreachable');
      return new Error('Network error: Server is unreachable. Please check your connection and try again.');
    }
  } else {
    console.error('Non-Axios Error:', error);
  }
  
  return error instanceof Error ? error : new Error('An unknown error occurred');
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
      throw handleApiError(error);
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
      throw handleApiError(error);
    }
  },

  // Alias for register to match usage in SignupForm
  async signup(userData: any): Promise<any> {
    return this.register(userData);
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

  isAdmin(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const decodedToken: { role?: string } = jwtDecode(token);
      return decodedToken.role === 'admin';
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
      throw handleApiError(error);
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
      throw handleApiError(error);
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
      throw handleApiError(error);
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
      throw handleApiError(error);
    }
  },

  // Add method to get all bookings for admin
  async getAllBookings(): Promise<Booking[]> {
    try {
      console.log('Admin: Fetching all bookings...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/admin/bookings.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch all bookings');
      }
    } catch (error) {
      console.error('Error in getAllBookings:', error);
      throw handleApiError(error);
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
      throw handleApiError(error);
    }
  },
};

// API service for fare management
export const fareAPI = {
  async getTourFares(): Promise<TourFare[]> {
    try {
      console.log('Fetching tour fares...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/tours.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch tour fares');
      }
    } catch (error) {
      console.error('Error in getTourFares:', error);
      throw handleApiError(error);
    }
  },
  
  async updateTourFares(fareData: any): Promise<any> {
    try {
      const response = await apiClient.post('/fares/update-tour.php', fareData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update tour fares');
      }
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      console.log('Fetching vehicle pricing data...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/vehicles.php?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicle pricing data');
      }
    } catch (error) {
      console.error('Error in getVehiclePricing:', error);
      throw handleApiError(error);
    }
  },
  
  async updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<any> {
    try {
      const response = await apiClient.post('/fares/update-vehicle.php', pricingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update vehicle pricing');
      }
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// API service for vehicle pricing (aliased under fareAPI now)
export const vehiclePricingAPI = {
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    return fareAPI.getVehiclePricing();
  },
};

// API service for tour fares (aliased under fareAPI now)
export const tourFaresAPI = {
  async getTourFares(): Promise<TourFare[]> {
    return fareAPI.getTourFares();
  },
};
