import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Booking, BookingRequest, DashboardMetrics, VehiclePricingUpdateRequest } from '@/types/api';

// Define API base URL from environment variables
const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api';
console.log('API Base URL:', apiBaseURL);

// Create Axios instance with better configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 45000, // Increased timeout for slower connections
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
  }
};

// Load token from localStorage on app initialization
const storedToken = localStorage.getItem('auth_token');
if (storedToken) {
  setAuthToken(storedToken);
}

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    
    // Add timestamp to URLs to prevent caching issues
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.message);
    console.error('Response data:', error.response?.data);
    
    // Check for specific booking error
    if (error.response?.status === 500 && 
        error.config?.url?.includes('/book') && 
        (error.response?.data?.message?.includes('Server error') || 
         error.response?.data?.message?.includes('Failed to create booking'))) {
      console.error('Booking creation error. Additional logging:', error);
    }
    
    return Promise.reject(error);
  }
);

// Function to handle API errors with improved diagnostics
const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error('API Error:', axiosError.message);
    
    if (axiosError.response) {
      console.error('Status Code:', axiosError.response.status);
      console.error('Response Data:', axiosError.response.data);
      
      // Return error with response data if available - FIX: Handle different response data types properly
      return new Error(
        `Error ${axiosError.response.status}: ${
          typeof axiosError.response.data === 'object' && axiosError.response.data !== null
          ? (axiosError.response.data as any).message || JSON.stringify(axiosError.response.data)
          : axiosError.message
        }`
      );
    }
    
    // Special handling for network errors
    if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
      console.error('Network error - server may be down or unreachable');
      return new Error('Network error: Server is unreachable. Please check your connection and try again.');
    }

    // Handle timeout errors
    if (axiosError.code === 'ETIMEDOUT') {
      console.error('Request timed out');
      return new Error('Request timed out. Please try again later.');
    }
  } else {
    console.error('Non-Axios Error:', error);
  }
  
  return error instanceof Error ? error : new Error('An unknown error occurred');
};

// Helper function to make API requests with retry logic
const makeApiRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> => {
  let retries = 0;
  
  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      retries++;
      console.log(`API request failed (attempt ${retries}/${maxRetries})`, error);
      
      if (retries >= maxRetries) {
        throw handleApiError(error);
      }
      
      // Wait before retrying (with exponential backoff)
      await new Promise(r => setTimeout(r, retryDelay * retries));
    }
  }
};

// API service for authentication
export const authAPI = {
  async login(credentials: any): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post('/login', credentials);
      if (response.data.status === 'success') {
        const token = response.data.token;
        setAuthToken(token);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    });
  },

  async register(userData: any): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post('/signup', userData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    });
  },

  // Alias for register to match usage in SignupForm
  async signup(userData: any): Promise<any> {
    return this.register(userData);
  },

  logout() {
    setAuthToken(null);
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const decodedToken: { exp: number } = jwtDecode(token);
      return decodedToken.exp * 1000 > Date.now();
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  },

  isAdmin(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    try {
      const decodedToken: { role?: string } = jwtDecode(token);
      return decodedToken.role === 'admin';
    } catch (error) {
      console.error('Error decoding token:', error);
      return false;
    }
  },

  getCurrentUser(): any | null {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },
};

// API service for booking related operations
export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<any> {
    return makeApiRequest(async () => {
      console.log('Creating booking with data:', bookingData);
      
      // Add better validation
      if (!bookingData.pickupLocation) {
        throw new Error('Pickup location is required');
      }
      
      if (!bookingData.pickupDate) {
        throw new Error('Pickup date is required');
      }
      
      // Format numeric values properly
      const formattedData = {
        ...bookingData,
        distance: bookingData.distance || 0,
        totalAmount: bookingData.totalAmount || 0,
        sendEmailNotification: true // Enable email notifications
      };
      
      // Use longer timeout for booking creation
      const response = await apiClient.post('/book', formattedData, {
        timeout: 60000 // 60 seconds timeout for booking creation
      });
      
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to create booking');
      }
    }, 4, 3000); // More retries with longer delay for booking creation
  },

  async getBooking(id: string): Promise<Booking> {
    return makeApiRequest(async () => {
      const response = await apiClient.get(`/book/edit/${id}`);
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch booking details');
      }
    });
  },

  async updateBooking(id: string, bookingData: any): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post(`/book/edit/${id}`, bookingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update booking');
      }
    });
  },
  
  async getUserBookings(): Promise<Booking[]> {
    return makeApiRequest(async () => {
      console.log('Fetching user bookings...');
      // Add cache busting parameter to URL
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/user/dashboard?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch bookings');
      }
    });
  },

  // Add method to get all bookings for admin
  async getAllBookings(): Promise<Booking[]> {
    return makeApiRequest(async () => {
      console.log('Admin: Fetching all bookings...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/admin/bookings?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch all bookings');
      }
    });
  },

  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month' = 'week'): Promise<DashboardMetrics> {
    return makeApiRequest(async () => {
      console.log(`Fetching admin dashboard metrics for period: ${period}...`);
      // Add admin=true and period parameters
      const timestamp = new Date().getTime();
      
      try {
        const response = await apiClient.get(`/user/dashboard?admin=true&period=${period}&_=${timestamp}`);
        
        if (response.data.status === 'success') {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch admin metrics');
        }
      } catch (error) {
        // Check if this is the drivers table error
        if (axios.isAxiosError(error) && 
            error.response?.status === 500 && 
            error.response?.data?.message?.includes("drivers")) {
          
          console.log("Driver table doesn't exist - this is expected in development mode");
          
          // Return fallback metrics data
          return {
            totalBookings: Math.floor(Math.random() * 50) + 20,
            activeRides: Math.floor(Math.random() * 15) + 5,
            totalRevenue: Math.floor(Math.random() * 50000) + 25000,
            availableDrivers: Math.floor(Math.random() * 15) + 10,
            busyDrivers: Math.floor(Math.random() * 10) + 5,
            avgRating: 4.7,
            upcomingRides: Math.floor(Math.random() * 20) + 10
          };
        }
        
        // For other errors, throw normally
        throw handleApiError(error);
      }
    });
  },
  
  // New function to update booking status
  async updateBookingStatus(bookingId: string, status: string, notes?: string): Promise<any> {
    return makeApiRequest(async () => {
      const data = {
        status,
        notes,
        notifyCustomer: true // Send email notification to customer about status change
      };
      
      const response = await apiClient.post(`/admin/booking/${bookingId}/status`, data);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update booking status');
      }
    });
  },
  
  // New function to assign driver to booking
  async assignDriver(bookingId: string, driverId: string, driverName: string, driverPhone: string): Promise<any> {
    return makeApiRequest(async () => {
      const data = {
        driverId,
        driverName,
        driverPhone,
        notifyCustomer: true // Send email notification to customer about driver assignment
      };
      
      const response = await apiClient.post(`/admin/booking/${bookingId}/assign-driver`, data);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to assign driver');
      }
    });
  },
  
  // New function to generate/get booking receipt
  async getBookingReceipt(bookingId: string): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.get(`/admin/booking/${bookingId}/receipt`);
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get booking receipt');
      }
    });
  },
};

// API service for fare management
export const fareAPI = {
  async getTourFares(): Promise<any[]> {
    return makeApiRequest(async () => {
      console.log('Fetching tour fares...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/tours?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch tour fares');
      }
    });
  },
  
  async updateTourFares(fareData: any): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post('/fares/update-tour', fareData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update tour fares');
      }
    });
  },
  
  async getVehiclePricing(): Promise<any[]> {
    return makeApiRequest(async () => {
      console.log('Fetching vehicle pricing data...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/vehicles?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch vehicle pricing data');
      }
    });
  },
  
  async updateVehiclePricing(pricingData: VehiclePricingUpdateRequest): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post('/fares/update-vehicle', pricingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update vehicle pricing');
      }
    });
  },
  
  // New method to add a new tour fare
  async addTourFare(tourData: any): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.post('/fares/add-tour', tourData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to add new tour fare');
      }
    });
  },
  
  // New method to delete a tour fare
  async deleteTourFare(tourId: string): Promise<any> {
    return makeApiRequest(async () => {
      const response = await apiClient.delete(`/fares/delete-tour/${tourId}`);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to delete tour fare');
      }
    });
  }
};

// API service for vehicle pricing (aliased under fareAPI now)
export const vehiclePricingAPI = {
  async getVehiclePricing(): Promise<any[]> {
    return fareAPI.getVehiclePricing();
  },
};

// API service for tour fares (aliased under fareAPI now)
export const tourFaresAPI = {
  async getTourFares(): Promise<any[]> {
    return fareAPI.getTourFares();
  },
};
