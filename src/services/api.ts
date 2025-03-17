
import axios from 'axios';
import { LoginRequest, SignupRequest, User, BookingRequest, Booking, 
  FareUpdateRequest, VehiclePricingUpdateRequest, TourFare, VehiclePricing,
  DashboardMetrics, Location } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

const storedToken = localStorage.getItem('auth_token');
if (storedToken) {
  setAuthToken(storedToken);
}

interface AuthAPI {
  login(credentials: LoginRequest): Promise<{ user: User; token: string }>;
  signup(userData: SignupRequest): Promise<{ user: User; token: string }>;
  logout(): void;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  isAdmin(): boolean;
}

interface ApiService {
  login(credentials: LoginRequest): Promise<{ user: User; token: string }>;
  signup(userData: SignupRequest): Promise<{ user: User; token: string }>;
  logout(): void;
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  createBooking(bookingData: BookingRequest): Promise<Booking>;
  getUserBookings(): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking>;
  updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<Booking>;
  getAdminDashboardMetrics(period: 'today' | 'week' | 'month'): Promise<DashboardMetrics>;
}

export const authAPI: AuthAPI = {
  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await axiosInstance.post('/login', credentials);
      const { token, user } = response.data;
      setAuthToken(token);
      return { user, token };
    } catch (error) {
      console.error('Login failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw new Error('Network error during login');
    }
  },

  async signup(userData: SignupRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await axiosInstance.post('/signup', userData);
      const { token, user } = response.data;
      setAuthToken(token);
      return { user, token };
    } catch (error) {
      console.error('Signup failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Signup failed');
      }
      throw new Error('Network error during signup');
    }
  },

  logout() {
    setAuthToken(null);
  },

  getCurrentUser(): User | null {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload) as User;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.role === 'admin';
  },
};

export const bookingAPI: {
  createBooking(bookingData: BookingRequest): Promise<Booking>;
  getUserBookings(): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking>;
  updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<Booking>;
  getAdminDashboardMetrics(period: 'today' | 'week' | 'month'): Promise<DashboardMetrics>;
} = {
  async createBooking(bookingData: BookingRequest): Promise<Booking> {
    try {
      const response = await axiosInstance.post('/book', bookingData);

      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking creation failed:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to create booking');
      }
      throw new Error('Network error during booking creation');
    }
  },

  async getUserBookings(): Promise<Booking[]> {
    try {
      const response = await axiosInstance.get('/user/dashboard');

      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch bookings');
      }
      throw new Error('Network error when fetching user bookings');
    }
  },

  async getAllBookings(): Promise<Booking[]> {
    try {
      const response = await axiosInstance.get('/admin/bookings');

      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch all bookings');
      }
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch all bookings');
      }
      throw new Error('Network error when fetching all bookings');
    }
  },
  
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      console.log(`Fetching booking details for ID: ${bookingId}`);
      const response = await axiosInstance.get(`/user/booking/${bookingId}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get booking details');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get booking details');
      }
      throw new Error('Network error when fetching booking details');
    }
  },
  
  async updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<Booking> {
    try {
      console.log(`Updating booking ${bookingId} with data:`, bookingData);
      
      const processedData: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(bookingData)) {
        if (key === 'pickupLocation' || key === 'dropLocation') {
          if (typeof value === 'object' && value !== null) {
            const locationValue = value as any;
            
            if (locationValue && 'address' in locationValue && typeof locationValue.address === 'string') {
              processedData[key] = locationValue.address;
            } else if (locationValue && 'name' in locationValue && typeof locationValue.name === 'string') {
              processedData[key] = locationValue.name;
            } else if (locationValue !== null) {
              processedData[key] = String(locationValue);
            }
          } else {
            processedData[key] = value;
          }
        } else if (key === 'pickupDate' || key === 'returnDate') {
          // Fix null check and add type guard for the toISOString method
          if (value !== null && value !== undefined && typeof value === 'object') {
            // Verify toISOString exists and is a function before calling it
            if ('toISOString' in value && typeof (value as Date).toISOString === 'function') {
              processedData[key] = (value as Date).toISOString();
            } else {
              processedData[key] = value;
            }
          } else {
            processedData[key] = value;
          }
        } else {
          processedData[key] = value;
        }
      }
      
      console.log("Processed data for API:", processedData);
      
      const response = await axiosInstance.put(`/update-booking/${bookingId}`, processedData);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      if ('response' in error && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Network error when updating booking');
    }
  },

  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month'): Promise<DashboardMetrics> {
    try {
      const response = await axiosInstance.get(`/admin/metrics?period=${period}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch dashboard metrics');
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch dashboard metrics');
      }
      throw new Error('Network error when fetching dashboard metrics');
    }
  }
};

export const fareAPI: {
  getTourFares(): Promise<TourFare[]>;
  updateTourFares(fareData: FareUpdateRequest): Promise<TourFare>;
  getVehiclePricing(): Promise<VehiclePricing[]>;
  updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing>;
} = {
  async getTourFares(): Promise<TourFare[]> {
    try {
      const response = await axiosInstance.get('/admin/fares/tours');
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch tour fares');
      }
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch tour fares');
      }
      throw new Error('Network error when fetching tour fares');
    }
  },
  
  async updateTourFares(fareData: FareUpdateRequest): Promise<TourFare> {
    try {
      const response = await axiosInstance.put('/admin/fares/tours', fareData);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update tour fares');
      }
    } catch (error) {
      console.error('Error updating tour fares:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to update tour fares');
      }
      throw new Error('Network error when updating tour fares');
    }
  },
  
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      const response = await axiosInstance.get('/admin/fares/vehicles');
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicle pricing');
      }
    } catch (error) {
      console.error('Error fetching vehicle pricing:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to fetch vehicle pricing');
      }
      throw new Error('Network error when fetching vehicle pricing');
    }
  },
  
  async updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing> {
    try {
      const response = await axiosInstance.put('/admin/fares/vehicles', pricingData);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update vehicle pricing');
      }
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to update vehicle pricing');
      }
      throw new Error('Network error when updating vehicle pricing');
    }
  }
};
