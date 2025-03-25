
import { TourFare, FareUpdateRequest, VehiclePricingData, VehiclePricingUpdateRequest, OutstationFare, BookingRequest, BookingUpdateRequest, BookingStatus } from '@/types/api';
import { getVehicleData, updateVehicle, addVehicle, deleteVehicle, getVehicleTypes, getOutstationFares as getOutstationFaresService, updateOutstationFares as updateOutstationFaresService } from '@/services/vehicleDataService';
import axios from 'axios';

// Create base API instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    // Log detailed information for debugging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    return Promise.reject(error);
  }
);

// Error handler function
const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  if (error.response) {
    console.error('Response data:', error.response.data);
    console.error('Response status:', error.response.status);
  }
  throw error;
};

// Export the API service objects
export const bookingAPI = {
  getBooking: async (id: number) => {
    // Placeholder - implement as needed
    console.log(`Getting booking with ID: ${id}`);
    return {};
  },
  
  updateBooking: async (id: number, data: any) => {
    // Placeholder - implement as needed
    console.log(`Updating booking with ID: ${id}`, data);
    return {};
  },
  
  // Add the missing methods
  createBooking: async (data: BookingRequest) => {
    try {
      const response = await api.post('/bookings.php', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getUserBookings: async () => {
    try {
      const response = await api.get('/user/bookings.php');
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getAllBookings: async (status?: string) => {
    try {
      const url = status ? `/admin/bookings.php?status=${status}` : '/admin/bookings.php';
      const response = await api.get(url);
      return response.data?.bookings || [];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getBookingById: async (id: number) => {
    try {
      const response = await api.get(`/bookings/${id}.php`);
      return response.data || {};
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  updateBookingStatus: async (id: number, status: BookingStatus) => {
    try {
      const response = await api.post(`/admin/booking.php?id=${id}`, { status });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  deleteBooking: async (id: number) => {
    try {
      const response = await api.delete(`/admin/booking.php?id=${id}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getAdminDashboardMetrics: async (period: string = 'week') => {
    try {
      const response = await api.get(`/admin/dashboard-metrics.php?period=${period}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Add other methods as needed
};

export const authAPI = {
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
  
  getCurrentUser: () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
  
  getAllUsers: async () => {
    try {
      const response = await api.get('/admin/users.php');
      return response.data || [];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      const response = await api.post('/admin/users.php', { userId, role, action: 'updateRole' });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log('Attempting login with credentials:', { email: credentials.email });
      
      // First clear any existing tokens to avoid conflicts
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Add cache-busting timestamp
      const cacheBuster = new Date().getTime();
      
      // Use a more robust approach with detailed error handling
      const response = await api.post(`/login.php?_t=${cacheBuster}`, credentials, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Timestamp': cacheBuster.toString()
        }
      });
      
      console.log('Login response received:', {
        status: response.status,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user
      });
      
      // Validate the response contains the expected data
      if (!response.data) {
        throw new Error('Empty response received from server');
      }
      
      if (!response.data.token) {
        throw new Error('Authentication failed: No token received');
      }
      
      // Store token in localStorage
      localStorage.setItem('auth_token', response.data.token);
      
      // Store user data if available
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      } else {
        throw new Error('User data missing from response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error details:', error);
      
      // Check if it's a network error
      if (error.message === 'Network Error') {
        throw new Error('Unable to connect to the server. Please check your internet connection.');
      }
      
      // Extract more helpful error message from response when available
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      return handleApiError(error);
    }
  },
  
  signup: async (userData: any) => {
    try {
      // Add cache-busting timestamp
      const cacheBuster = new Date().getTime();
      
      const response = await api.post(`/signup.php?_t=${cacheBuster}`, userData, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true',
          'X-Timestamp': cacheBuster.toString()
        }
      });
      
      // Store token in localStorage
      if (response.data && response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
        
        // Store user data if available
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    return true;
  },
  
  isAdmin: () => {
    const userData = localStorage.getItem('user');
    if (!userData) return false;
    
    try {
      const user = JSON.parse(userData);
      return user.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
};

export const fareAPI = {
  // Tour fares methods
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
  
  addTourFare: async (tourFare: TourFare): Promise<any> => {
    try {
      const response = await api.put('/admin/fares-update.php', tourFare);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      const response = await api.delete(`/admin/fares-update.php?tourId=${tourId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Vehicle pricing methods
  getVehiclePricing: async (): Promise<VehiclePricingData[]> => {
    try {
      const cacheBuster = new Date().getTime();
      console.log(`Fetching vehicle pricing with cache busting...${cacheBuster}`);
      const response = await api.get(`/fares/vehicles.php?_t=${cacheBuster}`);
      console.log("Vehicle pricing raw response:", response.data);
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data as VehiclePricingData[];
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data as VehiclePricingData[];
      } else if (response.data && response.data.vehicles && Array.isArray(response.data.vehicles)) {
        return response.data.vehicles as VehiclePricingData[];
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
          .map(([_, value]) => value as VehiclePricingData);
        
        if (pricingArray.length > 0) {
          return pricingArray;
        }
      }
      
      console.warn('Unexpected vehicle pricing response format:', response.data);
      return [] as VehiclePricingData[];
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getVehicles: async (includeInactive: boolean = false): Promise<any[]> => {
    return getVehicleData(includeInactive);
  },
  
  updateVehiclePricing: async (vehicleData: VehiclePricingUpdateRequest): Promise<any> => {
    return updateVehicle(vehicleData);
  },
  
  addVehicle: async (vehicleData: any): Promise<any> => {
    return addVehicle(vehicleData);
  },
  
  deleteVehicle: async (vehicleId: string): Promise<boolean> => {
    return deleteVehicle(vehicleId);
  },
  
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
  },
  
  // Outstation fare methods
  getOutstationFares: async (vehicleId: string, tripMode: 'one-way' | 'round-trip'): Promise<any> => {
    const fareData = await getOutstationFaresService(vehicleId);
    
    if (tripMode === 'one-way') {
      return {
        vehicleId,
        basePrice: fareData?.basePrice || fareData?.oneWayBasePrice || 0,
        pricePerKm: fareData?.pricePerKm || fareData?.oneWayPricePerKm || 0,
        nightHaltCharge: fareData?.nightHaltCharge || fareData?.nightHalt || 0,
        driverAllowance: fareData?.driverAllowance || 0
      };
    } else {
      return {
        vehicleId,
        basePrice: fareData?.roundTripBasePrice || 0,
        pricePerKm: fareData?.roundTripPricePerKm || 0,
        nightHaltCharge: fareData?.nightHaltCharge || fareData?.nightHalt || 0,
        driverAllowance: fareData?.driverAllowance || 0
      };
    }
  },
  
  updateOutstationFares: async (fareData: {
    vehicleId: string;
    basePrice: number;
    pricePerKm: number;
    nightHaltCharge: number;
    driverAllowance: number;
    tripMode: 'one-way' | 'round-trip';
  }): Promise<any> => {
    const { vehicleId, basePrice, pricePerKm, nightHaltCharge, driverAllowance, tripMode } = fareData;
    
    // Get current outstation fares to maintain other values
    const currentFares = await getOutstationFaresService(vehicleId);
    
    // Define OutstationFare type to satisfy TypeScript
    type OutstationFare = {
      vehicleId: string;
      basePrice?: number;
      pricePerKm?: number;
      oneWayBasePrice?: number;
      oneWayPricePerKm?: number;
      roundTripBasePrice?: number;
      roundTripPricePerKm?: number;
      driverAllowance: number;
      nightHalt: number;
      nightHaltCharge: number;
    };
    
    // Prepare the update data
    const updateData: OutstationFare = {
      vehicleId,
      driverAllowance,
      nightHalt: nightHaltCharge,
      nightHaltCharge,
    };
    
    // Update the appropriate fields based on trip mode
    if (tripMode === 'one-way') {
      Object.assign(updateData, {
        basePrice,
        pricePerKm,
        oneWayBasePrice: basePrice,
        oneWayPricePerKm: pricePerKm,
        // Preserve round trip values
        roundTripBasePrice: currentFares?.roundTripBasePrice || 0,
        roundTripPricePerKm: currentFares?.roundTripPricePerKm || 0
      });
    } else {
      Object.assign(updateData, {
        roundTripBasePrice: basePrice,
        roundTripPricePerKm: pricePerKm,
        // Preserve one way values
        basePrice: currentFares?.basePrice || currentFares?.oneWayBasePrice || 0,
        pricePerKm: currentFares?.pricePerKm || currentFares?.oneWayPricePerKm || 0,
        oneWayBasePrice: currentFares?.basePrice || currentFares?.oneWayBasePrice || 0,
        oneWayPricePerKm: currentFares?.pricePerKm || currentFares?.oneWayPricePerKm || 0
      });
    }
    
    return updateOutstationFaresService(vehicleId, updateData);
  }
};
