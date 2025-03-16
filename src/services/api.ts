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
  timeout: 30000, // Increased timeout for slower connections
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_token', token); // Add to sessionStorage as backup
    console.log('Auth token set in headers and storages');
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    console.log('Auth token removed from headers and storages');
  }
};

// Improved token retrieval that tries multiple storage locations
const getStoredToken = (): string | null => {
  const localToken = localStorage.getItem('auth_token');
  const sessionToken = sessionStorage.getItem('auth_token');
  
  // Return whichever token is available, preferring localStorage
  const token = localToken || sessionToken || null;
  
  if (token) {
    // Ensure the token is properly set in both storage locations and headers
    setAuthToken(token);
  }
  
  return token;
};

// Load token from storage on app initialization with improved validation
const storedToken = getStoredToken();
if (storedToken) {
  try {
    // Verify token expiration before setting
    const decodedToken: { exp: number } = jwtDecode(storedToken);
    const isValid = decodedToken.exp * 1000 > Date.now();
    
    if (isValid) {
      console.log('Found valid stored token on initialization');
      setAuthToken(storedToken);
    } else {
      console.warn('Found expired token on initialization, removing it');
      setAuthToken(null);
    }
  } catch (error) {
    console.error('Invalid token found in storage, removing it', error);
    setAuthToken(null);
  }
}

// Add request interceptor for debugging and token validation
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    
    // Check token validity before each request
    const token = getStoredToken();
    if (token) {
      try {
        const decoded: { exp: number } = jwtDecode(token);
        if (decoded.exp * 1000 <= Date.now()) {
          console.warn('Token expired before request, removing it');
          setAuthToken(null);
          // We'll let the request proceed and the 401 handler will redirect
        }
      } catch (error) {
        console.error('Invalid token found before request', error);
        setAuthToken(null);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging and handling auth errors
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle authentication errors (401)
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.warn('Received 401 Unauthorized, clearing auth tokens');
      setAuthToken(null);
      
      // Don't redirect here - let the component handle redirection
      // This prevents loops when multiple requests fail simultaneously
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
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    const token = getStoredToken();
    if (!token) return false;
    
    try {
      const decodedToken: { exp: number } = jwtDecode(token);
      const isValid = decodedToken.exp * 1000 > Date.now();
      
      if (!isValid) {
        console.warn('Token is expired, clearing it');
        setAuthToken(null);
      }
      
      return isValid;
    } catch (error) {
      console.error('Error decoding token:', error);
      setAuthToken(null);
      return false;
    }
  },

  isAdmin(): boolean {
    const token = getStoredToken();
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
    const token = getStoredToken();
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },
  
  // Alias for backward compatibility
  getUser(): any | null {
    return this.getCurrentUser();
  }
};

// API service for booking related operations
export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<any> {
    return makeApiRequest(async () => {
      console.log('Creating booking with data:', bookingData);
      // Add flag to request email notifications
      const requestWithNotification = {
        ...bookingData,
        sendEmailNotification: true // Enable email notifications
      };
      const response = await apiClient.post('/book', requestWithNotification);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to create booking');
      }
    }, 3, 2000); // More retries with longer delay for booking creation
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
      const response = await apiClient.get(`/user/dashboard?admin=true&period=${period}&_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch admin metrics');
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
