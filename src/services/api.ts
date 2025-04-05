
import axios from 'axios';
import { isPreviewMode } from '@/utils/apiHelper';
import { toast } from 'sonner';

// Demo data for preview mode
const DEMO_USER = {
  id: 1,
  name: 'Demo User',
  email: 'demo@example.com',
  role: 'admin'
};

// Default API configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Allow absolute URLs
  allowAbsoluteUrls: true
});

// Add interceptors to handle errors consistently
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Check if in preview mode and return mock data
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Returning mock response for error:', error.config?.url);
      return Promise.resolve({ data: { status: 'success', message: 'Mock response in preview mode' } });
    }
    
    // Format error message
    let errorMessage = 'An error occurred while processing your request.';
    
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'string' && error.response.data.includes('<html')) {
        // HTML response usually means a 500 server error page
        errorMessage = 'The server returned an HTML response. Check the server logs.';
      } else {
        errorMessage = `Request failed with status: ${error.response.status}`;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response received from the server. Check your network connection.';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message || 'Request configuration error';
    }
    
    // Log the detailed error
    console.error('API Error details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: errorMessage
    });
    
    return Promise.reject(new Error(errorMessage));
  }
);

// Authentication service
export const authAPI = {
  // Check if user is logged in
  isAuthenticated() {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating authenticated user');
      return true;
    }
    
    return !!localStorage.getItem('authToken');
  },
  
  // Get current user data
  getCurrentUser() {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Returning demo user');
      return DEMO_USER;
    }
    
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  },
  
  // Get auth token
  getToken() {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Returning demo token');
      return 'demo-token-for-preview-mode';
    }
    
    return localStorage.getItem('authToken');
  },
  
  // Login user
  async login(email: string, password: string) {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating login for:', email);
      
      // Store demo user data
      localStorage.setItem('authToken', 'demo-token-for-preview-mode');
      localStorage.setItem('userData', JSON.stringify(DEMO_USER));
      
      return DEMO_USER;
    }
    
    try {
      const response = await api.post('/login.php', { email, password });
      
      if (response.data.status === 'success' && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      console.error('Login error details:', error);
      throw new Error(error instanceof Error ? error.message : 'The requested resource was not found.');
    }
  },
  
  // Register new user
  async signup(userData: any) {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating signup for:', userData.email);
      
      // Store demo user data
      localStorage.setItem('authToken', 'demo-token-for-preview-mode');
      localStorage.setItem('userData', JSON.stringify({
        ...DEMO_USER,
        name: userData.name,
        email: userData.email
      }));
      
      return DEMO_USER;
    }
    
    try {
      const response = await api.post('/signup.php', userData);
      
      if (response.data.status === 'success' && response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      throw new Error(response.data.message || 'Signup failed');
    } catch (error) {
      console.error('API Error:', error);
      throw new Error(error instanceof Error ? error.message : 'The requested resource was not found.');
    }
  },
  
  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
};

// Add auth token to all requests
api.interceptors.request.use(config => {
  const token = authAPI.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Booking service
export const bookingAPI = {
  // Create a new booking
  async createBooking(bookingData: any) {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating booking creation:', bookingData);
      
      // Return mock booking response
      return {
        id: Math.floor(Math.random() * 10000),
        bookingNumber: `BK${Math.floor(Math.random() * 100000)}`,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    const response = await api.post('/bookings.php', bookingData);
    return response.data;
  },
  
  // Get user's bookings
  async getUserBookings() {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating user bookings fetch');
      
      // Return mock bookings
      return [
        {
          id: 101,
          userId: 1,
          bookingNumber: 'BK12345',
          pickupLocation: 'Mumbai Airport',
          dropLocation: 'Hotel Taj, Colaba',
          pickupDate: '2025-04-10T10:00:00',
          returnDate: null,
          cabType: 'Sedan',
          distance: 25,
          tripType: 'airport',
          tripMode: 'one-way',
          totalAmount: 1500,
          status: 'confirmed',
          passengerName: 'John Doe',
          passengerPhone: '+911234567890',
          passengerEmail: 'john@example.com',
          driverName: 'Rajesh Kumar',
          driverPhone: '+919876543210',
          createdAt: '2025-04-01T08:30:00',
          updatedAt: '2025-04-01T09:15:00'
        },
        {
          id: 102,
          userId: 1,
          bookingNumber: 'BK12346',
          pickupLocation: 'Hotel Oberoi, Nariman Point',
          dropLocation: 'Mumbai Airport',
          pickupDate: '2025-04-12T14:00:00',
          returnDate: null,
          cabType: 'SUV',
          distance: 28,
          tripType: 'airport',
          tripMode: 'one-way',
          totalAmount: 1800,
          status: 'pending',
          passengerName: 'John Doe',
          passengerPhone: '+911234567890',
          passengerEmail: 'john@example.com',
          driverName: null,
          driverPhone: null,
          createdAt: '2025-04-02T10:15:00',
          updatedAt: '2025-04-02T10:15:00'
        },
        {
          id: 103,
          userId: 1,
          bookingNumber: 'BK12347',
          pickupLocation: 'Hotel Taj, Colaba',
          dropLocation: 'Pune',
          pickupDate: '2025-03-25T09:00:00',
          returnDate: '2025-03-26T18:00:00',
          cabType: 'Tempo Traveller',
          distance: 150,
          tripType: 'outstation',
          tripMode: 'round-trip',
          totalAmount: 8500,
          status: 'completed',
          passengerName: 'John Doe Family Trip',
          passengerPhone: '+911234567890',
          passengerEmail: 'john@example.com',
          driverName: 'Santosh Sharma',
          driverPhone: '+919988776655',
          createdAt: '2025-03-20T11:30:00',
          updatedAt: '2025-03-27T19:15:00'
        },
        {
          id: 104,
          userId: 1,
          bookingNumber: 'BK12348',
          pickupLocation: 'Office, BKC',
          dropLocation: null,
          pickupDate: '2025-03-15T10:00:00',
          returnDate: '2025-03-15T18:00:00',
          cabType: 'Sedan',
          distance: 40,
          tripType: 'local',
          tripMode: 'rental',
          totalAmount: 2500,
          status: 'cancelled',
          passengerName: 'John Doe',
          passengerPhone: '+911234567890',
          passengerEmail: 'john@example.com',
          driverName: null,
          driverPhone: null,
          createdAt: '2025-03-14T09:30:00',
          updatedAt: '2025-03-14T12:15:00'
        }
      ];
    }
    
    try {
      const response = await api.get('/user/dashboard.php');
      if (response.data.status === 'success' && Array.isArray(response.data.bookings)) {
        return response.data.bookings;
      } else if (response.data.bookings) {
        return response.data.bookings;
      }
      throw new Error('Failed to get bookings');
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  },
  
  // Get booking details
  async getBookingDetails(bookingId: number | string) {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating booking details fetch for ID:', bookingId);
      
      // Return mock booking details
      return {
        id: Number(bookingId),
        userId: 1,
        bookingNumber: `BK${bookingId}`,
        pickupLocation: 'Mumbai Airport',
        dropLocation: 'Hotel Taj, Colaba',
        pickupDate: '2025-04-10T10:00:00',
        returnDate: null,
        cabType: 'Sedan',
        distance: 25,
        tripType: 'airport',
        tripMode: 'one-way',
        totalAmount: 1500,
        status: 'confirmed',
        passengerName: 'John Doe',
        passengerPhone: '+911234567890',
        passengerEmail: 'john@example.com',
        driverName: 'Rajesh Kumar',
        driverPhone: '+919876543210',
        createdAt: '2025-04-01T08:30:00',
        updatedAt: '2025-04-01T09:15:00'
      };
    }
    
    const response = await api.get(`/bookings.php?id=${bookingId}`);
    return response.data;
  },
  
  // Cancel booking
  async cancelBooking(bookingId: number | string) {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating booking cancellation for ID:', bookingId);
      toast.success('Booking cancelled successfully in preview mode');
      return { status: 'success', message: 'Booking cancelled successfully' };
    }
    
    const response = await api.post(`/update-booking.php`, {
      id: bookingId,
      status: 'cancelled'
    });
    return response.data;
  },
  
  // Get admin dashboard metrics
  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month' = 'week', status: string = 'all') {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating admin metrics fetch for period:', period);
      
      // Return mock metrics
      const metrics = {
        totalBookings: period === 'today' ? 12 : period === 'week' ? 48 : 156,
        activeRides: 5,
        totalRevenue: period === 'today' ? 35000 : period === 'week' ? 125000 : 450000,
        availableDrivers: 12,
        busyDrivers: 18,
        avgRating: 4.7,
        upcomingRides: 15,
        availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
        currentFilter: status
      };
      
      return metrics;
    }
    
    try {
      const response = await api.get(`/admin/metrics.php?period=${period}${status !== 'all' ? `&status=${status}` : ''}`);
      
      if (response.data && response.data.status === 'success' && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data.data) {
        return response.data.data;
      }
      
      throw new Error('Failed to get metrics data');
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      throw error;
    }
  }
};

// Vehicle service
export const vehicleAPI = {
  // Get all vehicles
  async getVehicles() {
    // Check if in preview mode
    if (isPreviewMode()) {
      console.log('[PREVIEW MODE] Simulating vehicles fetch');
      
      // Return mock vehicles
      return [
        {
          id: 'sedan',
          name: 'Sedan',
          capacity: 4,
          price: 2500,
          image: '/cars/sedan.png'
        },
        {
          id: 'suv',
          name: 'SUV',
          capacity: 6,
          price: 3200,
          image: '/cars/suv.png'
        },
        {
          id: 'luxury',
          name: 'Luxury Sedan',
          capacity: 4,
          price: 4500,
          image: '/cars/luxury.png'
        }
      ];
    }
    
    const response = await api.get('/vehicles.php');
    return response.data;
  }
};

export default api;
