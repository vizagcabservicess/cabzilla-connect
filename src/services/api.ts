import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  SignupRequest, 
  Booking,
  BookingRequest, 
  BookingStatus, 
  TourFare, 
  FareUpdateRequest,
  VehiclePricing,
  VehiclePricingUpdateRequest,
  DashboardMetrics
} from '@/types/api';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API Service
export const authAPI = {
  // Login user
  async login(credentials: LoginRequest): Promise<User> {
    try {
      const response = await api.post<AuthResponse>('/login', credentials);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  },
  
  // Signup user
  async signup(userData: SignupRequest): Promise<User> {
    try {
      const response = await api.post<AuthResponse>('/signup', userData);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data.user;
    } catch (error) {
      console.error('Signup error:', error);
      throw new Error(error instanceof Error ? error.message : 'Signup failed');
    }
  },
  
  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired
      if (decodedToken.exp && decodedToken.exp < currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      this.logout();
      return false;
    }
  },
  
  // Get current user
  getCurrentUser(): User | null {
    if (!this.isAuthenticated()) return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },
  
  // Check if current user is admin
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  },
  
  // Logout user
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await api.get('/admin/users');
      return response.data.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get users');
    }
  },

  // Update user role (admin only)
  async updateUserRole(userId: number, role: string): Promise<User> {
    try {
      const response = await api.put('/admin/users', { userId, role });
      return response.data.data;
    } catch (error) {
      console.error('Update user role error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update user role');
    }
  }
};

// Booking API Service
export const bookingAPI = {
  // Create new booking
  async createBooking(bookingData: BookingRequest): Promise<Booking> {
    try {
      const response = await api.post('/book', bookingData);
      return response.data.data;
    } catch (error) {
      console.error('Create booking error:', error);
      throw new Error(error instanceof Error ? error.message : 'Booking creation failed');
    }
  },
  
  // Get user's bookings
  async getUserBookings(): Promise<Booking[]> {
    try {
      const response = await api.get('/user/bookings');
      return response.data.data;
    } catch (error) {
      console.error('Get user bookings error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load bookings');
    }
  },
  
  // Get specific booking by ID
  async getBookingById(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/user/booking/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Get booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load booking details');
    }
  },
  
  // Update booking
  async updateBooking(id: number, bookingData: Partial<BookingRequest>): Promise<Booking> {
    try {
      const response = await api.put(`/update-booking/${id}`, bookingData);
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking');
    }
  },
  
  // Update booking status
  async updateBookingStatus(id: number, status: BookingStatus): Promise<Booking> {
    try {
      const response = await api.put(`/update-booking/${id}`, { status });
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} status error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking status');
    }
  },
  
  // Get booking receipt
  async getBookingReceipt(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/receipt/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Get receipt for booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load receipt');
    }
  },
  
  // Admin-specific methods
  
  // Get all bookings (admin only)
  async getAllBookings(): Promise<Booking[]> {
    try {
      const response = await api.get('/admin/bookings');
      return response.data.data;
    } catch (error) {
      console.error('Get all bookings error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load all bookings');
    }
  },
  
  // Get admin booking details
  async getAdminBookingDetails(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/admin/booking/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Get admin booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load booking details');
    }
  },
  
  // Delete booking (admin only)
  async deleteBooking(id: number): Promise<void> {
    try {
      await api.delete(`/admin/booking/${id}`);
    } catch (error) {
      console.error(`Delete booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete booking');
    }
  },
  
  // Get admin dashboard metrics
  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month', status?: BookingStatus): Promise<DashboardMetrics> {
    try {
      const params: Record<string, string> = { period };
      if (status) {
        params.status = status;
      }
      
      const response = await api.get('/admin/metrics', { params });
      return response.data.data;
    } catch (error) {
      console.error('Get admin metrics error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load dashboard metrics');
    }
  }
};

// Fare API Service
export const fareAPI = {
  // Get tour fares
  async getTourFares(): Promise<TourFare[]> {
    try {
      const response = await api.get('/fares/tours');
      return response.data.data;
    } catch (error) {
      console.error('Get tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load tour fares');
    }
  },
  
  // Get vehicle pricing
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      const response = await api.get('/fares/vehicles');
      return response.data.data;
    } catch (error) {
      console.error('Get vehicle pricing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load vehicle pricing');
    }
  },
  
  // Admin-specific methods
  
  // Update tour fares (admin only)
  async updateTourFares(fareData: FareUpdateRequest): Promise<TourFare> {
    try {
      const response = await api.post('/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Update tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update tour fares');
    }
  },
  
  // Add new tour fare (admin only)
  async addTourFare(fareData: TourFare): Promise<TourFare> {
    try {
      const response = await api.put('/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Add tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add new tour');
    }
  },
  
  // Delete tour fare (admin only)
  async deleteTourFare(tourId: string): Promise<void> {
    try {
      await api.delete('/admin/fares/update', { params: { tourId } });
    } catch (error) {
      console.error('Delete tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete tour');
    }
  },
  
  // Update vehicle pricing (admin only)
  async updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing> {
    try {
      const response = await api.post('/admin/km-price/update', pricingData);
      return response.data.data;
    } catch (error) {
      console.error('Update vehicle pricing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update vehicle pricing');
    }
  }
};

export default {
  auth: authAPI,
  booking: bookingAPI,
  fare: fareAPI
};
