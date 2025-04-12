
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { Booking, BookingRequest, BookingResponse, DashboardMetrics } from '@/types/api';

// Fallback metrics in case of API errors
const DEFAULT_METRICS = {
  totalBookings: 0,
  activeRides: 0,
  totalRevenue: 0,
  availableDrivers: 0,
  busyDrivers: 0, 
  avgRating: 0,
  upcomingRides: 0,
  availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
  currentFilter: 'all'
};

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000
});

// Add auth token to requests if available
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting to GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    return config;
  },
  error => Promise.reject(error)
);

export const bookingAPI = {
  createBooking: async (bookingData: BookingRequest): Promise<BookingResponse> => {
    try {
      console.log('Creating booking with data:', bookingData);
      const response = await apiClient.post(getApiUrl('/api/bookings'), bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  getUserBookings: async (): Promise<Booking[]> => {
    try {
      // Get user ID from localStorage
      const userIdToUse = Number(localStorage.getItem('userId'));
      console.log(`Fetching bookings for user ID: ${userIdToUse}`);
      
      // Prepare URL and query parameters
      const url = getApiUrl('/api/user/bookings');
      const params: Record<string, any> = { 
        _t: new Date().getTime()  // cache busting
      };
      
      // Add user_id parameter if available
      if (userIdToUse) {
        params.user_id = userIdToUse;
      }
      
      // Prepare headers with forced refresh and user ID
      const headers = {
        ...forceRefreshHeaders,
        'X-Force-User-Match': 'true'
      };
      
      // Add X-User-ID header if available
      if (userIdToUse) {
        headers['X-User-ID'] = userIdToUse.toString();
      }
      
      console.log(`API Request: GET ${url} with params:`, params);
      const response = await apiClient.get(url, { params, headers });
      
      if (response.data && response.data.bookings) {
        console.log('User bookings response:', response.data);
        return response.data.bookings;
      }
      
      if (Array.isArray(response.data)) {
        console.log('User bookings received as array:', response.data.length);
        return response.data;
      }
      
      console.error('Unexpected bookings response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  },
  
  getBookingDetails: async (bookingId: string | number): Promise<Booking> => {
    try {
      const response = await apiClient.get(getApiUrl(`/api/bookings/${bookingId}`));
      return response.data;
    } catch (error) {
      console.error(`Error getting booking details for ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (options: { 
    period?: 'day' | 'week' | 'month', 
    status?: string 
  } = {}): Promise<DashboardMetrics> => {
    try {
      // Get user ID from localStorage
      const userIdToUse = Number(localStorage.getItem('userId'));
      
      // Extract options or use defaults
      const period = options.period || 'week';
      const status = options.status || 'all';
      
      console.log(`Fetching admin dashboard metrics with user ID: ${userIdToUse}, period: ${period}, status: ${status}`);
      
      // Try multiple endpoints with better error handling for resilience
      const endpoints = [
        '/api/admin/dashboard',
        '/api/admin/metrics',
        '/api/user/dashboard'
      ];
      
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          // Prepare parameters and headers
          const params: Record<string, any> = {
            period,
            status,
            _t: new Date().getTime() // cache busting
          };
          
          // Add user_id parameter if available
          if (userIdToUse) {
            params.user_id = userIdToUse;
          }
          
          // Prepare headers with admin mode and user ID
          const headers = {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          };
          
          // Add explicit user ID header if available
          if (userIdToUse) {
            headers['X-User-ID'] = userIdToUse.toString();
          }
          
          console.log(`Trying metrics endpoint: ${endpoint} with params:`, params);
          const response = await apiClient.get(getApiUrl(endpoint), { params, headers });
          
          // Check for metrics in different response formats
          if (response.data) {
            console.log(`Metrics response from ${endpoint}:`, response.data);
            
            // Format 1: data property contains metrics
            if (response.data.data) {
              return response.data.data;
            }
            
            // Format 2: direct metrics object
            if (response.data.totalBookings !== undefined) {
              return response.data;
            }
            
            // Format 3: Nested under metrics property
            if (response.data.metrics) {
              return response.data.metrics;
            }
          }
          
          console.log(`Endpoint ${endpoint} didn't return usable metrics format`);
        } catch (error) {
          lastError = error;
          console.warn(`Admin metrics endpoint ${endpoint} failed:`, error);
          // Continue to next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      if (lastError) {
        throw lastError;
      }
      
      console.warn('All metrics endpoints failed but no error was thrown');
      return DEFAULT_METRICS;
    } catch (error) {
      console.error('Error getting admin dashboard metrics:', error);
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: string | number, status: string): Promise<any> => {
    try {
      const response = await apiClient.patch(getApiUrl(`/api/bookings/${bookingId}`), { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating booking status for ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  cancelBooking: async (bookingId: string | number): Promise<any> => {
    try {
      const response = await apiClient.patch(getApiUrl(`/api/bookings/${bookingId}/cancel`), {});
      return response.data;
    } catch (error) {
      console.error(`Error cancelling booking ID ${bookingId}:`, error);
      throw error;
    }
  }
};

export default bookingAPI;
