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

// Create axios instance with proper configuration
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
console.log('API Base URL:', apiBaseUrl);

// Create axios instance with cache busting for GET requests
const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  // Add timestamp parameter to prevent caching
  params: {
    '_t': Date.now()
  }
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    // Add cache busting timestamp for GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        '_t': Date.now()
      };
    }
    
    // Try to get token from multiple storage locations for redundancy
    const token = localStorage.getItem('authToken') || 
                 localStorage.getItem('auth_token') || 
                 sessionStorage.getItem('auth_token');
    
    console.log(`Adding auth token to request: ${token ? 'Token exists' : 'No token'}`);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🚀 API Request:', `${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling and logging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', `${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Error Response:', error.response || error.message);
    
    // Check if the error is due to authentication issues
    if (error.response && error.response.status === 401) {
      console.log('Authentication error detected, clearing tokens');
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
    
    return Promise.reject(error);
  }
);

// Auth API Service
export const authAPI = {
  // Login user with improved error handling
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Login attempt with email:', credentials.email);
      
      // Clear any existing tokens first for a clean login attempt
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      const response = await api.post<AuthResponse>('/api/login', credentials);
      
      if (!response.data || !response.data.token) {
        console.error('Login response missing token:', response.data);
        throw new Error('Authentication failed: No token received');
      }
      
      const token = response.data.token;
      console.log('Login successful, token received:', { 
        tokenLength: token.length,
        tokenParts: token.split('.').length,
        user: response.data.user?.id
      });
      
      // Store token in multiple places for redundancy
      localStorage.setItem('authToken', token);
      localStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_token', token);
      
      // Store user data
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error details:', error.response || error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Authentication failed. Please check your credentials.';
      
      throw new Error(errorMessage);
    }
  },
  
  // Signup user
  async signup(userData: SignupRequest): Promise<User> {
    try {
      const response = await api.post<AuthResponse>('/api/signup', userData);
      
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('auth_token', response.data.token);
        sessionStorage.setItem('auth_token', response.data.token);
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
    const token = localStorage.getItem('authToken') || 
                 localStorage.getItem('auth_token') || 
                 sessionStorage.getItem('auth_token');
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
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
      const response = await api.post('/api/book', bookingData);
      return response.data.data;
    } catch (error) {
      console.error('Create booking error:', error);
      throw new Error(error instanceof Error ? error.message : 'Booking creation failed');
    }
  },
  
  // Get user's bookings with better error handling and flexible response format
  async getUserBookings(): Promise<Booking[]> {
    try {
      console.log('Fetching user bookings with auth token');
      
      // Add cache busting to URL
      const timestamp = Date.now();
      const url = `/api/user/bookings?_t=${timestamp}`;
      
      console.log('User bookings request URL:', apiBaseUrl + url);
      
      const response = await api.get(url);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      // Handle both formats: direct array or wrapped in data property
      let bookingsData: Booking[];
      
      if (Array.isArray(response.data)) {
        console.log('Response is direct array format');
        bookingsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        console.log('Response is wrapped in data property');
        bookingsData = response.data.data;
      } else if (response.data.status === 'success' && Array.isArray(response.data.data)) {
        console.log('Response is success object with data array');
        bookingsData = response.data.data;
      } else {
        console.error('Invalid bookings data format:', response.data);
        throw new Error('Invalid data format received from server');
      }
      
      console.log('User bookings processed:', bookingsData.length, 'bookings found');
      return bookingsData;
    } catch (error: any) {
      console.error('Get user bookings error:', error.response || error);
      
      // Check if this is an authentication error
      if (error.response?.status === 401 || 
          (error.message && (
            error.message.includes('Authentication failed') ||
            error.message.includes('Invalid token') ||
            error.message.includes('token')
          ))) {
        console.error('Authentication error in getUserBookings');
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth_token');
        throw new Error('Authentication failed: Please log in again');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to load bookings');
    }
  },
  
  // Get specific booking by ID with flexible response format
  async getBookingById(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/api/user/booking/${id}`);
      
      // Handle both formats: direct object or wrapped in data property
      if (response.data && response.data.id) {
        return response.data;
      } else if (response.data && response.data.data && response.data.data.id) {
        return response.data.data;
      } else {
        console.error('Invalid booking data format:', response.data);
        throw new Error('Invalid data format received from server');
      }
    } catch (error) {
      console.error(`Get booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load booking details');
    }
  },
  
  // Update booking
  async updateBooking(id: number, bookingData: Partial<BookingRequest>): Promise<Booking> {
    try {
      const response = await api.put(`/api/update-booking/${id}`, bookingData);
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking');
    }
  },
  
  // Update booking status
  async updateBookingStatus(id: number, status: BookingStatus): Promise<Booking> {
    try {
      const response = await api.put(`/api/update-booking/${id}`, { status });
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} status error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking status');
    }
  },
  
  // Get booking receipt with flexible response format
  async getBookingReceipt(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/api/receipt/${id}`);
      
      // Handle both formats: direct object or wrapped in data property
      if (response.data && response.data.id) {
        return response.data;
      } else if (response.data && response.data.data && response.data.data.id) {
        return response.data.data;
      } else {
        console.error('Invalid receipt data format:', response.data);
        throw new Error('Invalid data format received from server');
      }
    } catch (error) {
      console.error(`Get receipt for booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load receipt');
    }
  },
  
  // Admin-specific methods with flexible response formats
  
  // Get all bookings (admin only)
  async getAllBookings(): Promise<Booking[]> {
    try {
      const response = await api.get('/admin/bookings');
      
      // Handle both formats: direct array or wrapped in data property
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.error('Invalid admin bookings data format:', response.data);
        throw new Error('Invalid data format received from server');
      }
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
  
  // Get admin dashboard metrics with flexible response format and error handling
  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month', status?: BookingStatus): Promise<DashboardMetrics> {
    try {
      const params: Record<string, string> = { 
        period,
        admin: 'true',  // Explicitly mark as admin request
        '_t': Date.now().toString() // Add cache busting
      };
      
      if (status) {
        params.status = status;
      }
      
      console.log('Requesting admin metrics with params:', params);
      
      const response = await api.get('/api/user/dashboard', { params });
      console.log('Admin metrics raw response:', response.data);
      
      // Handle different response formats
      if (!response.data) {
        throw new Error('Empty response received from metrics API');
      }
      
      let metricsData: DashboardMetrics;
      
      if (response.data.data && typeof response.data.data === 'object') {
        // Standard API format with data property
        metricsData = response.data.data;
      } else if (response.data.status === 'success' && response.data.data) {
        // Success object with data
        metricsData = response.data.data;
      } else if (typeof response.data === 'object' && 'totalBookings' in response.data) {
        // Direct metrics object
        metricsData = response.data;
      } else {
        console.error('Invalid metrics data format:', response.data);
        throw new Error('Invalid data format received from metrics API');
      }
      
      console.log('Processed metrics data:', metricsData);
      
      // Set defaults for any missing properties
      const defaultMetrics: DashboardMetrics = {
        totalBookings: 0,
        activeRides: 0,
        totalRevenue: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        avgRating: 0,
        upcomingRides: 0,
        availableStatuses: [],
        currentFilter: 'all'
      };
      
      return { ...defaultMetrics, ...metricsData };
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
      const response = await api.get('/api/fares/tours');
      return response.data.data;
    } catch (error) {
      console.error('Get tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load tour fares');
    }
  },
  
  // Get vehicle pricing
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      const response = await api.get('/api/fares/vehicles');
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
      const response = await api.post('/api/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Update tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update tour fares');
    }
  },
  
  // Add new tour fare (admin only)
  async addTourFare(fareData: TourFare): Promise<TourFare> {
    try {
      const response = await api.put('/api/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Add tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add new tour');
    }
  },
  
  // Delete tour fare (admin only)
  async deleteTourFare(tourId: string): Promise<void> {
    try {
      await api.delete('/api/admin/fares/update', { params: { tourId } });
    } catch (error) {
      console.error('Delete tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete tour');
    }
  },
  
  // Update vehicle pricing (admin only)
  async updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<VehiclePricing> {
    try {
      const response = await api.post('/api/admin/km-price/update', pricingData);
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
