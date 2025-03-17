import axios from 'axios';
import { LoginRequest, SignupRequest, User, BookingRequest, Booking } from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

// Load token from local storage on app initialization
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
  
  // Update a booking
  updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<Booking>;
  
  // Get a booking by ID
  getBookingById(bookingId: string): Promise<Booking>;
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

      // Decode the token to get the user information
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
};

export const bookingAPI: {
  createBooking(bookingData: BookingRequest): Promise<Booking>;
  getUserBookings(): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking>;
  updateBooking(bookingId: string, bookingData: Partial<Booking>): Promise<Booking>;
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
      // Convert date objects to ISO strings for the API
      const processedData = { ...bookingData };
      
      if (bookingData.pickupDate && (bookingData.pickupDate as any) instanceof Date) {
        processedData.pickupDate = (bookingData.pickupDate as Date).toISOString();
      }
      
      if (bookingData.returnDate && (bookingData.returnDate as any) instanceof Date) {
        processedData.returnDate = (bookingData.returnDate as Date).toISOString();
      }
      
      const response = await axiosInstance.put(`/update-booking/${bookingId}`, processedData);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to update booking');
      }
      throw new Error('Network error when updating booking');
    }
  }
};
