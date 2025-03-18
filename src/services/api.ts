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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
console.log('API Base URL:', apiBaseUrl);

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  params: {
    '_t': Date.now()
  }
});

api.interceptors.request.use(
  (config) => {
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        '_t': Date.now()
      };
    }
    
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

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', `${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Error Response:', error.response || error.message);
    
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

export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Login attempt with email:', credentials.email);
      
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
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_token', token);
      
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
  
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken') || 
                 localStorage.getItem('auth_token') || 
                 sessionStorage.getItem('auth_token');
    if (!token) return false;
    
    try {
      const decodedToken: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
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
  
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  },
  
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },
  
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await api.get('/admin/users');
      return response.data.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to get users');
    }
  },
  
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

export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<Booking> {
    try {
      const response = await api.post('/api/book', bookingData);
      return response.data.data;
    } catch (error) {
      console.error('Create booking error:', error);
      throw new Error(error instanceof Error ? error.message : 'Booking creation failed');
    }
  },
  
  async getUserBookings(): Promise<Booking[]> {
    try {
      console.log('Fetching user bookings with auth token');
      
      const timestamp = Date.now();
      const url = `/api/user/bookings?_t=${timestamp}`;
      
      console.log('User bookings request URL:', apiBaseUrl + url);
      
      const response = await api.get(url);
      
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
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
  
  async getBookingById(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/api/user/booking/${id}`);
      
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
  
  async updateBooking(id: number, bookingData: Partial<BookingRequest>): Promise<Booking> {
    try {
      const response = await api.put(`/api/update-booking/${id}`, bookingData);
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking');
    }
  },
  
  async updateBookingStatus(id: number, status: BookingStatus): Promise<Booking> {
    try {
      const response = await api.put(`/api/update-booking/${id}`, { status });
      return response.data.data;
    } catch (error) {
      console.error(`Update booking ${id} status error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update booking status');
    }
  },
  
  async getBookingReceipt(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/api/receipt/${id}`);
      
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
  
  async getAllBookings(): Promise<Booking[]> {
    try {
      const response = await api.get('/admin/bookings');
      
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
  
  async getAdminBookingDetails(id: number): Promise<Booking> {
    try {
      const response = await api.get(`/admin/booking/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Get admin booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load booking details');
    }
  },
  
  async deleteBooking(id: number): Promise<void> {
    try {
      await api.delete(`/admin/booking/${id}`);
    } catch (error) {
      console.error(`Delete booking ${id} error:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete booking');
    }
  },
  
  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month', status?: BookingStatus): Promise<DashboardMetrics> {
    try {
      const params: Record<string, string> = { 
        period,
        admin: 'true',
        '_t': Date.now().toString()
      };
      
      if (status) {
        params.status = status;
      }
      
      console.log('Requesting admin metrics with params:', params);
      
      const apiUrl = `${apiBaseUrl}/api/user/dashboard`;
      console.log('Admin metrics API URL:', apiUrl);
      console.log('Auth token present:', !!localStorage.getItem('authToken'));
      
      const response = await api.get('/api/user/dashboard', { 
        params,
        timeout: 10000
      });
      
      console.log('Admin metrics raw response:', response.data);
      
      if (!response.data) {
        console.error('Empty response received from metrics API');
        throw new Error('Empty response received from metrics API');
      }
      
      let metricsData: DashboardMetrics;
      
      if (response.data.data && typeof response.data.data === 'object') {
        console.log('Using standard data property format');
        metricsData = response.data.data;
      } else if (response.data.status === 'success' && response.data.data) {
        console.log('Using success.data format');
        metricsData = response.data.data;
      } else if (typeof response.data === 'object' && 'totalBookings' in response.data) {
        console.log('Using direct metrics object format');
        metricsData = response.data;
      } else {
        console.error('Invalid metrics data format:', response.data);
        throw new Error('Invalid data format received from metrics API');
      }
      
      console.log('Processed metrics data:', metricsData);
      
      if (typeof metricsData !== 'object' || !('totalBookings' in metricsData)) {
        console.error('Metrics data missing required properties:', metricsData);
        throw new Error('Invalid metrics data: missing required properties');
      }
      
      const defaultMetrics: DashboardMetrics = {
        totalBookings: 0,
        activeRides: 0,
        totalRevenue: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        avgRating: 0,
        upcomingRides: 0
      };
      
      return { ...defaultMetrics, ...metricsData };
    } catch (error: any) {
      console.error('Get admin metrics error:', error);
      
      if (error.response?.status === 401) {
        console.error('Authentication error in getAdminDashboardMetrics');
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth_token');
        throw new Error('Authentication failed: Please log in again');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: The server took too long to respond');
      }
      
      if (error.message === 'Network Error') {
        throw new Error('Network error: Unable to connect to the server. Please check your connection.');
      }
      
      throw new Error(error.response?.data?.message || error.message || 'Failed to load dashboard metrics');
    }
  }
};

export const fareAPI = {
  async getTourFares(): Promise<TourFare[]> {
    try {
      const response = await api.get('/api/fares/tours');
      return response.data.data;
    } catch (error) {
      console.error('Get tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load tour fares');
    }
  },
  
  async getVehiclePricing(): Promise<VehiclePricing[]> {
    try {
      const response = await api.get('/api/fares/vehicles');
      return response.data.data;
    } catch (error) {
      console.error('Get vehicle pricing error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to load vehicle pricing');
    }
  },
  
  async updateTourFares(fareData: FareUpdateRequest): Promise<TourFare> {
    try {
      const response = await api.post('/api/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Update tour fares error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update tour fares');
    }
  },
  
  async addTourFare(fareData: TourFare): Promise<TourFare> {
    try {
      const response = await api.put('/api/admin/fares/update', fareData);
      return response.data.data;
    } catch (error) {
      console.error('Add tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add new tour');
    }
  },
  
  async deleteTourFare(tourId: string): Promise<void> {
    try {
      await api.delete('/api/admin/fares/update', { params: { tourId } });
    } catch (error) {
      console.error('Delete tour fare error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete tour');
    }
  },
  
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
