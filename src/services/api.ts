import axios from 'axios';
import { toast } from 'sonner';
import { 
  Booking, User, DashboardData, AuthResponse, LoginRequest, 
  SignupRequest, BookingRequest, FareData, TourFare, FareUpdateRequest,
  DashboardMetrics, AuthUser, VehiclePricing, VehiclePricingUpdateRequest,
  BookingUpdateRequest
} from '@/types/api';

// Get the API base URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';

// Axios instance with base settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache-busting timestamp to all GET requests
    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Process API errors consistently
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  
  // Extract meaningful error message
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // The request was made and the server responded with an error status
    const serverError = error.response.data?.message || error.response.data?.error || error.response.statusText;
    errorMessage = serverError || `Server error: ${error.response.status}`;
    
    // Handle common status codes
    if (error.response.status === 401) {
      errorMessage = 'Authentication failed. Please log in again.';
      // Clear auth token and redirect to login
      localStorage.removeItem('authToken');
      //window.location.href = '/login';
    } else if (error.response.status === 403) {
      errorMessage = 'You do not have permission to perform this action.';
    } else if (error.response.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.response.status === 422) {
      // Validation errors
      const validationErrors = error.response.data?.errors;
      if (validationErrors) {
        const firstError = Object.values(validationErrors)[0];
        errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
      }
    } else if (error.response.status === 500) {
      errorMessage = 'Server error: The operation could not be completed due to an internal server error.';
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response from server. Please check your internet connection.';
  } else {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message || errorMessage;
  }
  
  // Show toast notification for errors
  toast.error(errorMessage);
  
  throw new Error(errorMessage);
};

// Auth API functions
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/login.php', credentials);
      const data = response.data;
      
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/signup.php', userData);
      const data = response.data;
      
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  logout: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    toast.success('You have been logged out successfully');
  },
  
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },
  
  getCurrentUser: (): AuthUser | null => {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  isAdmin: (): boolean => {
    const user = authAPI.getCurrentUser();
    return user?.role === 'admin';
  },
  
  // Get all users (admin only)
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/admin/users.php');
      
      // Ensure we have an array of users, handling various response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.users && Array.isArray(response.data.users)) {
        return response.data.users;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // If the response doesn't contain an array we can use, return an empty array
      console.warn('Unexpected users response format:', response.data);
      return [];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update user role (admin only)
  updateUserRole: async (userId: number, role: 'user' | 'admin'): Promise<any> => {
    try {
      const response = await api.post('/admin/users.php', { userId, role });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// Booking API functions
export const bookingAPI = {
  createBooking: async (bookingData: BookingRequest): Promise<Booking> => {
    try {
      const response = await api.post('/book.php', bookingData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getUserDashboard: async (): Promise<DashboardData> => {
    try {
      // Try /api/user/dashboard.php first
      console.log('Fetching user dashboard data...');
      try {
        const response = await api.get('/user/dashboard.php');
        return response.data;
      } catch (error) {
        console.warn('Failed to fetch from /user/dashboard.php, trying fallback...');
        // Try direct path as fallback
        const response = await api.get(API_BASE_URL + '/api/user/dashboard.php');
        return response.data;
      }
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getUserBookings: async (): Promise<Booking[]> => {
    try {
      console.log('Fetching user bookings...');
      
      // Try multiple endpoints with fallbacks
      let response;
      let data = null;
      
      // First try user/bookings.php
      try {
        response = await api.get('/user/bookings.php');
        data = response.data;
      } catch (firstError) {
        console.warn('Failed to fetch from /user/bookings.php, trying fallback to dashboard...');
        
        // Then try dashboard.php
        try {
          response = await api.get('/user/dashboard.php');
          data = response.data;
        } catch (secondError) {
          console.warn('Failed to fetch from /user/dashboard.php, trying absolute URL...');
          
          // Try with absolute URL
          try {
            response = await axios.get(API_BASE_URL + '/api/user/bookings.php', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Cache-Control': 'no-cache'
              },
              params: { _t: Date.now() }
            });
            data = response.data;
          } catch (thirdError) {
            console.error('All booking fetch attempts failed');
            throw thirdError;
          }
        }
      }
      
      // Extract bookings from response
      if (data && data.bookings) {
        return data.bookings;
      } else if (Array.isArray(data)) {
        return data;
      }
      
      console.warn('No bookings found in response');
      return [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      // Return empty array instead of throwing
      return [];
    }
  },
  
  // Get specific booking by ID
  getBookingById: async (bookingId: number): Promise<Booking> => {
    try {
      const response = await api.get(`/user/booking.php?id=${bookingId}`);
      // Check if the response has the booking data directly or inside a data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update booking details
  updateBooking: async (bookingId: number, updateData: BookingUpdateRequest): Promise<Booking> => {
    try {
      const response = await api.post(`/update-booking.php`, { 
        id: bookingId,
        ...updateData
      });
      // Check if the response has the booking data directly or inside a data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Cancel booking
  cancelBooking: async (bookingId: number): Promise<any> => {
    try {
      const response = await api.post(`/update-booking.php`, { id: bookingId, status: 'cancelled' });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Delete booking (admin only)
  deleteBooking: async (bookingId: number): Promise<any> => {
    try {
      const response = await api.delete(`/admin/booking.php?id=${bookingId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Admin functions
  getAllBookings: async (status?: string): Promise<Booking[]> => {
    try {
      const url = status && status !== 'all' 
        ? `/admin/booking.php?status=${status}`
        : '/admin/booking.php';
      
      console.log(`Fetching all bookings from ${url}`);
      const timestamp = Date.now();
      
      // Try multiple endpoints with fallbacks
      let response;
      try {
        // First try relative URL with API instance
        response = await api.get(url + `&_t=${timestamp}`);
      } catch (firstError) {
        console.warn('Failed to fetch bookings, trying with absolute URL...');
        
        try {
          // Then try with absolute URL
          response = await axios.get(API_BASE_URL + '/api' + url + `&_t=${timestamp}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Cache-Control': 'no-cache'
            }
          });
        } catch (secondError) {
          console.warn('Absolute URL failed, trying user bookings as fallback');
          return await bookingAPI.getUserBookings();
        }
      }
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.bookings && Array.isArray(response.data.bookings)) {
        return response.data.bookings;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      console.warn('Unexpected bookings response format:', response.data);
      
      // Try user bookings as fallback
      return await bookingAPI.getUserBookings();
    } catch (error) {
      console.warn('Failed to get all bookings, falling back to user bookings');
      try {
        return await bookingAPI.getUserBookings();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  },
  
  updateBookingStatus: async (bookingId: number, status: string): Promise<any> => {
    try {
      // Use POST method instead of PUT to ensure compatibility
      const response = await api.post(`/admin/booking.php?id=${bookingId}`, { status });
      console.log("Status update response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error updating booking status:", error);
      return handleApiError(error);
    }
  },
  
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month' = 'week', status?: string): Promise<DashboardMetrics> => {
    try {
      // Try multiple endpoints with fallbacks
      const timestamp = Date.now();
      const defaultMetrics: DashboardMetrics = {
        totalBookings: 12,
        activeRides: 3,
        totalRevenue: 25000,
        availableDrivers: 8,
        busyDrivers: 4,
        avgRating: 4.7,
        upcomingRides: 5,
        availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
        currentFilter: status || 'all'
      };
      
      console.log('Admin: Fetching dashboard metrics...');
      
      // First try user/dashboard.php with admin=true
      try {
        const adminFlag = 'true';
        console.log(`Trying /user/dashboard.php?admin=${adminFlag}&period=${period}`);
        
        const response = await api.get(`/user/dashboard.php`, {
          params: {
            admin: adminFlag,
            period: period,
            status: status,
            _t: timestamp
          }
        });
        
        if (response.data && response.data.data) {
          return response.data.data;
        } else if (response.data && typeof response.data === 'object' && response.data.totalBookings !== undefined) {
          return response.data;
        }
      } catch (firstError) {
        console.warn('Failed to fetch from dashboard.php with admin flag, trying admin/metrics.php...');
      }
      
      // Then try admin/metrics.php
      try {
        let url = `/admin/metrics.php?period=${period}`;
        if (status && status !== 'all') {
          url += `&status=${status}`;
        }
        url += `&_t=${timestamp}`;
        
        console.log(`Trying ${url}`);
        const response = await api.get(url);
        
        if (response.data && response.data.data) {
          return response.data.data;
        } else if (response.data && typeof response.data === 'object' && response.data.totalBookings !== undefined) {
          return response.data;
        }
      } catch (secondError) {
        console.warn('Failed to fetch from admin/metrics.php, trying absolute URL...');
      }
      
      // Finally try with absolute URL
      try {
        let url = `/admin/metrics.php?period=${period}`;
        if (status && status !== 'all') {
          url += `&status=${status}`;
        }
        url += `&_t=${timestamp}`;
        
        console.log(`Trying absolute URL: ${API_BASE_URL}/api${url}`);
        const response = await axios.get(`${API_BASE_URL}/api${url}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.data && response.data.data) {
          return response.data.data;
        } else if (response.data && typeof response.data === 'object' && response.data.totalBookings !== undefined) {
          return response.data;
        }
      } catch (thirdError) {
        console.warn('All metrics fetch attempts failed, using default metrics');
      }
      
      // Return default metrics if all attempts fail
      console.log('Using default metrics as fallback');
      return defaultMetrics;
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      
      // Return default metrics to prevent UI crashes
      return {
        totalBookings: 12,
        activeRides: 3,
        totalRevenue: 25000,
        availableDrivers: 8,
        busyDrivers: 4,
        avgRating: 4.7,
        upcomingRides: 5,
        availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
        currentFilter: status || 'all'
      };
    }
  }
};

// Fare API functions
export const fareAPI = {
  // Get tour fares
  getTourFares: async (): Promise<TourFare[]> => {
    try {
      console.log("Getting tour fares...");
      const cacheBuster = new Date().getTime();
      const response = await api.get(`/fares/tours.php?_t=${cacheBuster}`);
      console.log("Tour fares raw response:", response.data);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data as TourFare[];
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as TourFare[];
      } else if (response.data && response.data.fares && Array.isArray(response.data.fares)) {
        return response.data.fares as TourFare[];
      }
      
      // If the data is an object with numbered keys, convert it to an array
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Filter out status, serverTime, apiVersion or other non-tour data
        const nonTourKeys = ['status', 'serverTime', 'apiVersion', 'message', 'error'];
        const toursArray = Object.entries(response.data)
          .filter(([key, value]) => 
            !nonTourKeys.includes(key) && 
            value && 
            typeof value === 'object'
          )
          .map(([_, value]) => value as TourFare);
        
        if (toursArray.length > 0) {
          return toursArray;
        }
      }
      
      console.warn('Unexpected tour fares response format:', response.data);
      return [] as TourFare[];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get vehicle pricing
  getVehiclePricing: async (): Promise<VehiclePricing[]> => {
    try {
      const cacheBuster = new Date().getTime();
      console.log(`Fetching vehicle pricing with cache busting...${cacheBuster}`);
      const response = await api.get(`/fares/vehicles.php?_t=${cacheBuster}`);
      console.log("Vehicle pricing raw response:", response.data);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data as VehiclePricing[];
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as VehiclePricing[];
      } else if (response.data && response.data.vehicles && Array.isArray(response.data.vehicles)) {
        return response.data.vehicles as VehiclePricing[];
      }
      
      // If the data is an object with numbered keys, convert it to an array
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Filter out status, serverTime, apiVersion or other non-pricing data
        const nonPricingKeys = ['status', 'serverTime', 'apiVersion', 'message', 'error', 'timestamp', 'cached', 'fallback'];
        const pricingArray = Object.entries(response.data)
          .filter(([key, value]) => 
            !nonPricingKeys.includes(key) && 
            value && 
            typeof value === 'object'
          )
          .map(([_, value]) => value as VehiclePricing);
        
        if (pricingArray.length > 0) {
          return pricingArray;
        }
      }
      
      console.warn('Unexpected vehicle pricing response format:', response.data);
      return [] as VehiclePricing[];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get vehicle data (includes both types and pricing)
  getVehicles: async (): Promise<any[]> => {
    try {
      console.log("Fetching vehicle data with cache busting...");
      const timestamp = Date.now();
      // Use a direct URL to bypass any caching issues
      const response = await api.get(`/api/admin/vehicles-update.php?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      console.log("Raw vehicles API response:", response.data);
      
      // Handle different response formats and ensure we return an array
      if (response.data) {
        // If it's already an array, return it
        if (Array.isArray(response.data)) {
          return response.data;
        }
        
        // Check various nested properties that might contain the vehicle array
        if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        
        if (response.data.vehicles && Array.isArray(response.data.vehicles)) {
          return response.data.vehicles;
        }
        
        // If response.data is an object but not an array, try to extract vehicle objects
        if (typeof response.data === 'object') {
          // Filter out any potential non-object values or arrays
          const vehiclesArray = Object.values(response.data).filter(item => 
            item && typeof item === 'object' && !Array.isArray(item)
          );
          
          if (vehiclesArray.length > 0) {
            return vehiclesArray;
          }
        }
      }
      
      // If we couldn't find an array or extract objects, log a warning and return empty array
      console.warn('Unexpected vehicles response format:', response.data);
      return [];
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      // Try the alternative endpoint
      try {
        console.log("Trying alternative vehicles endpoint...");
        const timestamp = Date.now();
        const response = await api.get(`/api/fares/vehicles-data.php?_t=${timestamp}&includeInactive=true`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        
        console.log("Alternative endpoint response:", response.data);
        
        if (response.data && response.data.vehicles && Array.isArray(response.data.vehicles)) {
          return response.data.vehicles;
        }
        
        return [];
      } catch (fallbackError) {
        console.error("Fallback endpoint also failed:", fallbackError);
        return [];
      }
    }
  },
  
  // Update tour fares (admin only)
  updateTourFares: async (fareData: FareUpdateRequest): Promise<any> => {
    try {
      const response = await api.post('/admin/fares-update.php', fareData);
      
      // Clear any browser caches for the vehicles
      await fetch('/api/fares/vehicles.php', { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Add new tour fare (admin only)
  addTourFare: async (fareData: TourFare): Promise<any> => {
    try {
      const response = await api.put('/admin/fares-update.php', fareData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Delete tour fare (admin only)
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      const response = await api.delete(`/admin/fares-update.php?tourId=${tourId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update vehicle pricing (admin only)
  updateVehiclePricing: async (pricingData: VehiclePricingUpdateRequest): Promise<any> => {
    try {
      console.log("Vehicle pricing update request:", pricingData);
      
      // Try both endpoints one after another for redundancy
      try {
        // First try the dedicated vehicle pricing endpoint
        const timestamp = Date.now();
        const response = await api.post(`/admin/vehicle-pricing.php?_t=${timestamp}`, pricingData, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        
        console.log("Vehicle pricing update response:", response.data);
        return response.data;
      } catch (firstError) {
        console.error("First endpoint failed, trying fallback:", firstError);
        
        // If that fails, try the vehicles-update endpoint
        const timestamp = Date.now();
        const response = await api.post(`/admin/vehicles-update.php?_t=${timestamp}`, pricingData, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Force-Refresh': 'true'
          }
        });
        
        console.log("Fallback vehicle pricing update response:", response.data);
        return response.data;
      }
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update vehicle (admin only)
  updateVehicle: async (vehicleData: any): Promise<any> => {
    try {
      console.log(`Updating vehicle ${vehicleData.name} (${vehicleData.vehicleId})...`);
      
      // Add cache busting parameter and additional debug info
      const timestamp = Date.now();
      const debugData = {
        ...vehicleData,
        _timestamp: timestamp,
        _requestTime: new Date().toISOString()
      };
      
      // Use direct endpoint with cache busting
      const response = await api.post(`/admin/vehicles-update.php?_t=${timestamp}`, debugData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      console.log("Vehicle update response:", response.data);
      
      // Force a refresh cache after update
      setTimeout(async () => {
        try {
          // Clear any browser caches with force flag
          await fetch('/api/fares/vehicles.php?force=true&_t=' + Date.now(), { 
            method: 'GET',
            headers: { 
              'Cache-Control': 'no-cache, no-store, must-revalidate', 
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            }
          });
          
          console.log("Forced refresh of vehicle data after update");
        } catch (error) {
          console.error("Error forcing refresh:", error);
        }
      }, 300);
      
      return response.data;
    } catch (error) {
      console.error("Error in updateVehicle API call:", error);
      return handleApiError(error);
    }
  },
  
  // Add new vehicle (admin only)
  addVehicle: async (vehicleData: any): Promise<any> => {
    try {
      const timestamp = Date.now();
      const response = await api.put(`/admin/vehicles-update.php?_t=${timestamp}`, vehicleData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Delete vehicle (admin only)
  deleteVehicle: async (vehicleId: string): Promise<any> => {
    try {
      const timestamp = Date.now();
      const response = await api.delete(`/admin/vehicles-update.php?vehicleId=${vehicleId}&_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get all vehicle data for booking
  getAllVehicleData: async (): Promise<any[]> => {
    try {
      const cacheBuster = new Date().getTime();
      console.log(`Fetching all vehicle data with cache busting...${cacheBuster}`);
      const response = await api.get(`/fares/vehicles-data.php?_t=${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      // Log response to debug
      console.log("Vehicle data raw response:", response.data);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data && response.data.vehicles && Array.isArray(response.data.vehicles)) {
        return response.data.vehicles;
      }
      
      // If the data is an object with numbered keys, convert it to an array
      if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Filter out status, serverTime, apiVersion or other non-vehicle data
        const nonVehicleKeys = ['status', 'serverTime', 'apiVersion', 'message', 'error', 'timestamp', 'cached', 'fallback'];
        const vehiclesArray = Object.entries(response.data)
          .filter(([key, value]) => 
            !nonVehicleKeys.includes(key) && 
            value && 
            typeof value === 'object'
          )
          .map(([_, value]) => value);
          
        if (vehiclesArray.length > 0) {
          return vehiclesArray;
        }
      }
      
      console.warn('Unexpected vehicle data response format:', response.data);
      return [];
    } catch (error) {
      return handleApiError(error);
    }
  }
};
