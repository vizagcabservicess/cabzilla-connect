// API configuration for all endpoints

// Import from config
import { apiBaseUrl, getApiUrl } from '@/config/api';
import { safeFetch, safeJsonParse, getAuthHeaders } from '@/config/requestConfig';

// Import types
import { Booking, DashboardMetrics, BookingStatus, User } from '@/types/api';

// Base API service
class ApiService {
  // Base URL for API requests
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Helper to get full URL for API endpoint
  private getFullUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  }

  // GET request with authorization
  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    try {
      console.log(`API Request: GET ${endpoint}`);
      const response = await safeFetch(url, {
        method: 'GET',
        headers,
        ...options
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await safeJsonParse(response);
      console.log(`API Response data:`, data);
      
      // Handle wrapped responses where data is in a nested property
      if (data && typeof data === 'object') {
        // If the response has bookings, return that directly
        if (data.bookings) {
          return data as unknown as T;
        }
        // If the response has a data property, return that
        if (data.data) {
          return data.data as T;
        }
        // For user endpoint that returns user object
        if (data.user) {
          return data.user as T;
        }
        // Fallback to returning the whole response
        return data as T;
      }

      return data as T;
    } catch (error) {
      console.error(`API Request failed for GET ${endpoint}:`, error);
      throw error;
    }
  }

  // POST request with authorization
  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    try {
      console.log(`API Request: POST ${endpoint}`, data);
      const response = await safeFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await safeJsonParse(response);
      console.log(`API Response data:`, responseData);
      
      // Handle wrapped responses
      if (responseData && typeof responseData === 'object') {
        if (responseData.data) {
          return responseData.data as T;
        }
        return responseData as T;
      }

      return responseData as T;
    } catch (error) {
      console.error(`API Request failed for POST ${endpoint}:`, error);
      throw error;
    }
  }

  // DELETE request with authorization
  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    try {
      console.log(`API Request: DELETE ${endpoint}`);
      const response = await safeFetch(url, {
        method: 'DELETE',
        headers,
        ...options
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await safeJsonParse(response);
      
      // Handle wrapped responses
      if (data && typeof data === 'object' && data.data) {
        return data.data as T;
      }

      return data as T;
    } catch (error) {
      console.error(`API Request failed for DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  // PUT request with authorization
  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    try {
      console.log(`API Request: PUT ${endpoint}`, data);
      const response = await safeFetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        ...options
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const responseData = await safeJsonParse(response);
      
      // Handle wrapped responses
      if (responseData && typeof responseData === 'object' && responseData.data) {
        return responseData.data as T;
      }

      return responseData as T;
    } catch (error) {
      console.error(`API Request failed for PUT ${endpoint}:`, error);
      throw error;
    }
  }

  // Check API status
  async checkStatus(): Promise<boolean> {
    try {
      const response = await safeFetch(this.getFullUrl('/api/status'));
      return response.ok;
    } catch (error) {
      console.error('API status check failed:', error);
      return false;
    }
  }
}

// Initialize the API service
const api = new ApiService(apiBaseUrl);

// Auth API
export const authAPI = {
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await api.get<User>('/api/user');
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post<{token: string; user: User}>('/api/login', credentials);
    if (response && response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone: string }) => {
    return await api.post('/api/signup', userData);
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  isAdmin: (): boolean => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role === 'admin';
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
};

// Booking API
export const bookingAPI = {
  getUserBookings: async (): Promise<Booking[]> => {
    try {
      console.log('Fetching user bookings...');
      const response = await api.get<{bookings: Booking[], status: string}>('/api/user/bookings');
      console.log('User bookings response:', response);
      
      // Handle different response formats
      if (response && Array.isArray(response)) {
        return response;
      } else if (response && response.bookings && Array.isArray(response.bookings)) {
        return response.bookings;
      } else if (response && typeof response === 'object') {
        console.warn('Unexpected bookings response format:', response);
        // Try to extract bookings from an unknown structure
        const possibleBookings = Object.values(response).find(value => 
          Array.isArray(value) && value.length > 0 && 
          value[0] && typeof value[0] === 'object' && 
          'bookingNumber' in value[0]
        );
        
        if (Array.isArray(possibleBookings)) {
          return possibleBookings as Booking[];
        }
      }
      
      console.warn('No bookings found in response');
      return [];
    } catch (error) {
      console.error('Error getting user bookings:', error);
      throw error;
    }
  },
  
  getBookingById: async (id: number | string): Promise<Booking> => {
    return await api.get(`/api/booking/${id}`);
  },
  
  createBooking: async (bookingData: any): Promise<any> => {
    return await api.post('/api/book', bookingData);
  },
  
  updateBookingStatus: async (id: number | string, status: BookingStatus): Promise<Booking> => {
    return await api.put(`/api/admin/booking/${id}`, { status });
  },
  
  updateBooking: async (id: number | string, bookingData: any): Promise<Booking> => {
    return await api.put(`/api/booking/${id}`, bookingData);
  },
  
  cancelBooking: async (id: number | string): Promise<any> => {
    return await api.put(`/api/booking/${id}/cancel`, {});
  },
  
  getAdminBookings: async (status?: BookingStatus): Promise<Booking[]> => {
    const endpoint = status && status !== 'all' 
      ? `/api/admin/booking?status=${status}` 
      : '/api/admin/booking';
      
    const response = await api.get<{bookings: Booking[], status: string}>(endpoint);
    return response && response.bookings ? response.bookings : [];
  },
  
  getAllBookings: async (status?: BookingStatus | 'all'): Promise<Booking[]> => {
    const endpoint = status && status !== 'all' 
      ? `/api/admin/booking?status=${status}` 
      : '/api/admin/booking';
      
    const response = await api.get<{bookings: Booking[], status: string}>(endpoint);
    return response && response.bookings ? response.bookings : [];
  },
  
  getAdminDashboardMetrics: async (period: 'day' | 'week' | 'month' = 'week'): Promise<DashboardMetrics> => {
    return await api.get(`/api/admin/metrics?period=${period}`);
  },
  
  deleteBooking: async (id: number | string): Promise<any> => {
    return await api.delete(`/api/admin/booking/${id}`);
  }
};

// Fare API for managing vehicle fares and pricing
export const fareAPI = {
  getLocalFares: async () => {
    return await api.get('/api/fares/local');
  },
  
  getAirportFares: async () => {
    return await api.get('/api/fares/airport');
  },
  
  getOutstationFares: async () => {
    return await api.get('/api/fares/outstation');
  },
  
  getTourFares: async () => {
    return await api.get('/api/fares/tours');
  },
  
  getVehiclePricing: async (vehicleId: number | string) => {
    return await api.get(`/api/admin/vehicle-pricing/${vehicleId}`);
  },
  
  updateVehiclePricing: async (vehicleId: number | string, pricingData: any) => {
    return await api.put(`/api/admin/vehicle-pricing/${vehicleId}`, pricingData);
  },
  
  updateLocalFares: async (fareData: any) => {
    return await api.put('/api/admin/fare-update/local', fareData);
  },
  
  updateAirportFares: async (fareData: any) => {
    return await api.put('/api/admin/fare-update/airport', fareData);
  },
  
  updateOutstationFares: async (fareData: any) => {
    return await api.put('/api/admin/fare-update/outstation', fareData);
  },
  
  updateTourFares: async (fareData: any) => {
    return await api.put('/api/admin/fare-update/tours', fareData);
  }
};

export default api;
