
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Booking, User, DashboardData, AuthResponse, LoginRequest, 
  SignupRequest, BookingRequest, FareData, TourFare, FareUpdateRequest,
  DashboardMetrics, AuthUser, VehiclePricing, VehiclePricingUpdateRequest,
  BookingUpdateRequest
} from '@/types/api';

const API_BASE_URL = '/api';

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
      return response.data;
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
      const response = await api.get('/user/dashboard.php');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getUserBookings: async (): Promise<Booking[]> => {
    try {
      const response = await api.get('/user/bookings.php');
      // Check if the response has the bookings array directly or inside a data property
      if (response.data && response.data.bookings) {
        return response.data.bookings;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      return handleApiError(error);
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
      
      const response = await api.get(url);
      
      // Check if the response has the bookings array in the expected format
      if (response.data && response.data.bookings) {
        return response.data.bookings;
      }
      
      return [];
    } catch (error) {
      // Fallback to user bookings if admin endpoint fails
      console.warn('Failed to get all bookings, falling back to user bookings');
      return bookingAPI.getUserBookings();
    }
  },
  
  updateBookingStatus: async (bookingId: number, status: string): Promise<any> => {
    try {
      const response = await api.post(`/admin/booking.php`, { id: bookingId, status });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getAdminDashboardMetrics: async (period: 'today' | 'week' | 'month' = 'week'): Promise<DashboardMetrics> => {
    try {
      const response = await api.get(`/user/dashboard.php?admin=true&period=${period}`);
      
      // Check if the response has the metrics data in the expected format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      // Fallback if the data isn't in the expected format
      return {
        totalBookings: 0,
        activeRides: 0,
        totalRevenue: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        avgRating: 0,
        upcomingRides: 0
      };
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      
      // Return default values in case of error
      return {
        totalBookings: 0,
        activeRides: 0,
        totalRevenue: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        avgRating: 0,
        upcomingRides: 0
      };
    }
  }
};

// Fare API functions
export const fareAPI = {
  // Get tour fares
  getTourFares: async (): Promise<TourFare[]> => {
    try {
      const response = await api.get('/fares/tours.php');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get vehicle pricing
  getVehiclePricing: async (): Promise<VehiclePricing[]> => {
    try {
      const response = await api.get('/fares/vehicles.php');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get vehicle data (includes both types and pricing)
  getVehicles: async (): Promise<any[]> => {
    try {
      const response = await api.get('/admin/vehicles-update.php');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update tour fares (admin only)
  updateTourFares: async (fareData: FareUpdateRequest): Promise<any> => {
    try {
      const response = await api.post('/admin/fares-update.php', fareData);
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
      const response = await api.post('/admin/vehicle-pricing.php', pricingData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Update vehicle (admin only)
  updateVehicle: async (vehicleData: any): Promise<any> => {
    try {
      const response = await api.post('/admin/vehicles-update.php', vehicleData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Add new vehicle (admin only)
  addVehicle: async (vehicleData: any): Promise<any> => {
    try {
      const response = await api.put('/admin/vehicles-update.php', vehicleData);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Delete vehicle (admin only)
  deleteVehicle: async (vehicleId: string): Promise<any> => {
    try {
      const response = await api.delete(`/admin/vehicles-update.php?vehicleId=${vehicleId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Get all vehicle data for booking
  getAllVehicleData: async (): Promise<any[]> => {
    try {
      const response = await api.get('/fares/vehicles-data.php');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};
