
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
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  withCredentials: false,
  timeout: 30000, // Increased timeout for slower connections
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_token', token);
    console.log(`Auth token set (${token.length} chars)`);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    console.log('Auth token removed');
  }
};

// Load token from localStorage on app initialization with fallback to sessionStorage
const loadAuthToken = () => {
  const storedToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (storedToken) {
    console.log(`Found stored auth token (${storedToken.length} chars)`);
    setAuthToken(storedToken);
    return true;
  }
  return false;
};

// Initial token load
loadAuthToken();

// Add request interceptor for debugging and token refresh
apiClient.interceptors.request.use(
  (config) => {
    // Check for token in localStorage on each request as a fallback
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Added token from storage to request headers');
      }
    }
    
    // Add cache prevention headers
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    
    // Add timestamp to GET requests to prevent caching
    if (config.method?.toLowerCase() === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 
      config.method?.toLowerCase() === 'post' ? JSON.stringify(config.data).slice(0, 500) : '');
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
    console.log(`API Response: ${response.status} ${response.config.url}`, 
      typeof response.data === 'object' ? JSON.stringify(response.data).slice(0, 500) : response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.error('Status:', axiosError.response?.status);
      console.error('Response data:', axiosError.response?.data);
      console.error('Request URL:', axiosError.config?.url);
      console.error('Request method:', axiosError.config?.method);
      console.error('Request data:', axiosError.config?.data);
    }
    
    // Check if error is due to token expiration
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.log('Authentication error detected, clearing local storage');
      // Clear token on auth errors
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        console.log('Redirecting to login page due to authentication error');
        window.location.href = '/login';
      }
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
      
      // Return error with response data if available
      const errorData = axiosError.response.data as any;
      let errorMessage = 'Unknown server error';
      
      if (typeof errorData === 'object' && errorData !== null) {
        // Try to extract error message from different common formats
        errorMessage = errorData.message || 
                      errorData.error || 
                      (errorData.errors ? JSON.stringify(errorData.errors) : 
                      JSON.stringify(errorData));
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
      
      return new Error(
        `Error ${axiosError.response.status}: ${errorMessage}`
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
  retryDelay = 1000,
  description = 'API Request'
): Promise<T> => {
  let retries = 0;
  
  while (true) {
    try {
      console.log(`${description} - attempt ${retries + 1}/${maxRetries + 1}`);
      return await requestFn();
    } catch (error) {
      retries++;
      console.log(`${description} failed (attempt ${retries}/${maxRetries})`, error);
      
      if (retries >= maxRetries) {
        throw handleApiError(error);
      }
      
      // Wait before retrying (with exponential backoff)
      const delay = retryDelay * Math.pow(1.5, retries - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
};

// API service for authentication
export const authAPI = {
  async login(credentials: any): Promise<any> {
    return makeApiRequest(async () => {
      console.log('Attempting login with credentials:', { email: credentials.email, passwordLength: credentials.password?.length });
      
      // Clear any existing tokens before login
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      
      const response = await apiClient.post('/login', credentials);
      
      if (response.data.token) {
        console.log(`Login successful, received token (${response.data.token.length} chars)`);
        setAuthToken(response.data.token);
        return response.data;
      } else if (response.data.status === 'success') {
        console.warn('Login returned success but no token was found in the response');
        return response.data;
      } else {
        throw new Error(response.data.message || 'Login failed - no token received');
      }
    }, 3, 1500); // 3 retries with 1.5s initial delay
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
      console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
      
      // Clear local cache to prevent using stale data
      sessionStorage.removeItem('cabFares');
      localStorage.removeItem('fare-cache');
      
      // For local bookings, ensure distance is set based on package
      if (bookingData.tripType === 'local' && (!bookingData.distance || bookingData.distance === 0)) {
        if (bookingData.hourlyPackage === '8hrs-80km') {
          bookingData.distance = 80;
        } else if (bookingData.hourlyPackage === '10hrs-100km') {
          bookingData.distance = 100;
        } else {
          bookingData.distance = 80; // Default fallback
        }
        console.log('Set default distance for local booking:', bookingData.distance);
      }
      
      // Make sure all numeric fields are actually numbers, not strings
      if (typeof bookingData.distance === 'string') {
        bookingData.distance = parseFloat(bookingData.distance);
      }
      
      if (typeof bookingData.totalAmount === 'string') {
        bookingData.totalAmount = parseFloat(bookingData.totalAmount);
      }
      
      // Make sure the date strings are in ISO format
      if (!bookingData.pickupDate) {
        throw new Error('Pickup date is required');
      }
      
      // Safely convert pickupDate to ISO string
      if (typeof bookingData.pickupDate === 'object') {
        // Check if it's a Date object by looking for the toISOString method
        if (bookingData.pickupDate && 'toISOString' in bookingData.pickupDate) {
          bookingData.pickupDate = bookingData.pickupDate.toISOString();
        }
      }
      
      // Safely convert returnDate to ISO string if it exists
      if (bookingData.returnDate && typeof bookingData.returnDate === 'object') {
        // Check if it's a Date object by looking for the toISOString method
        if ('toISOString' in bookingData.returnDate) {
          bookingData.returnDate = bookingData.returnDate.toISOString();
        }
      }
      
      // Log the sanitized data
      console.log('Sanitized booking data:', JSON.stringify(bookingData, null, 2));
      
      const response = await apiClient.post('/book', bookingData);
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to create booking');
      }
    }, 3, 2000, 'Create Booking'); // More retries with longer delay for booking creation
  },

  async getBooking(id: string): Promise<Booking> {
    return makeApiRequest(async () => {
      // Add cache busting parameter
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/book/edit/${id}?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch booking details');
      }
    });
  },

  async updateBooking(id: string, bookingData: any): Promise<any> {
    return makeApiRequest(async () => {
      // Clear local cache when updating booking
      sessionStorage.removeItem('cabFares');
      localStorage.removeItem('fare-cache');
      
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
  
  async getReceipt(id: string): Promise<Booking> {
    return makeApiRequest(async () => {
      // Add cache busting parameter
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/receipt/${id}?_=${timestamp}`);
      
      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch receipt');
      }
    });
  },
  
  async sendReceiptEmail(bookingId: string, email?: string): Promise<any> {
    return makeApiRequest(async () => {
      const data = { bookingId, email };
      const response = await apiClient.post('/send-receipt', data);
      
      if (response.data.status === 'success') {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to send receipt');
      }
    });
  }
};

// API service for fare management
export const fareAPI = {
  async getTourFares(): Promise<any[]> {
    return makeApiRequest(async () => {
      console.log('Fetching tour fares...');
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/tours?_=${timestamp}`);
      
      if (response.data) {
        return response.data;
      } else {
        throw new Error('Failed to fetch tour fares');
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
      // Clear any cached data first
      sessionStorage.removeItem('cabFares');
      localStorage.removeItem('fare-cache');
      
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/vehicles?_=${timestamp}`);
      
      if (response.data) {
        return response.data;
      } else {
        throw new Error('Failed to fetch vehicle pricing data');
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
