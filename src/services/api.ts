
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Booking, BookingRequest, DashboardMetrics, VehiclePricingUpdateRequest } from '@/types/api';

// Define API base URL from environment variables with fallback to hostinger site
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

// Define retry constants
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;

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
      config.method?.toLowerCase() === 'post' ? config.data : '');
    
    // For debugging, log the full URL being requested
    const fullUrl = `${apiClient.defaults.baseURL}${config.url}`;
    console.log(`Full request URL: ${fullUrl}`);
    
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
    console.error('Response error:', error);
    
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
  apiCall: () => Promise<T>, 
  maxRetries: number = DEFAULT_MAX_RETRIES, 
  retryDelay: number = DEFAULT_RETRY_DELAY
): Promise<T> => {
  let retries = 0;
  
  while (true) {
    try {
      return await apiCall();
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
      
      // Try multiple endpoints for booking creation
      const endpoints = ['/book', '/api/book', '/booking', '/api/booking'];
      let lastError: any = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying booking endpoint: ${endpoint}`);
          const response = await apiClient.post(endpoint, bookingData);
          
          if (response.data.status === 'success') {
            console.log(`Booking successfully created using endpoint: ${endpoint}`);
            return response.data;
          } else {
            lastError = new Error(response.data.message || `Failed to create booking at ${endpoint}`);
          }
        } catch (error) {
          console.error(`Booking endpoint ${endpoint} failed:`, error);
          lastError = error;
          // Continue trying next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('Failed to create booking after trying all endpoints');
    });
  },

  async getBooking(id: string): Promise<Booking> {
    return makeApiRequest(async () => {
      console.log(`Fetching booking details for ID: ${id}`);
      
      // Try multiple endpoint formats with proper error handling
      try {
        console.log(`Trying first endpoint format: /booking/${id}/edit`);
        const response = await apiClient.get(`/booking/${id}/edit`);
        if (response.data.status === 'success') {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch booking');
        }
      } catch (firstError) {
        console.log('First endpoint format failed, error:', firstError);
        
        try {
          console.log(`Trying second endpoint format: /book/edit/${id}`);
          const response = await apiClient.get(`/book/edit/${id}`);
          if (response.data.status === 'success') {
            return response.data.data;
          } else {
            throw new Error(response.data.message || 'Failed to fetch booking');
          }
        } catch (secondError) {
          console.log('Second endpoint format failed, error:', secondError);
          
          // Try a third format as a last resort
          try {
            console.log(`Trying third endpoint format: /api/booking/edit/${id}`);
            const response = await apiClient.get(`/api/booking/edit/${id}`);
            if (response.data.status === 'success') {
              return response.data.data;
            }
          } catch (thirdError) {
            console.log('All endpoint formats failed');
            // Re-throw the first error for consistent error reporting
            throw firstError;
          }
        }
        
        // If we somehow get here without returning or throwing, throw the first error
        throw firstError;
      }
    });
  },

  async updateBooking(id: string, bookingData: any): Promise<any> {
    return makeApiRequest(async () => {
      console.log(`Updating booking ID: ${id} with data:`, bookingData);
      
      // Try multiple endpoint formats with proper error handling
      const endpoints = [
        `/booking/${id}/edit`,
        `/book/edit/${id}`,
        `/api/booking/edit/${id}`,
        `/api/book/edit/${id}`
      ];
      
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint for update: ${endpoint}`);
          const response = await apiClient.post(endpoint, bookingData);
          
          if (response.data.status === 'success') {
            console.log(`Booking successfully updated using endpoint: ${endpoint}`);
            return response.data;
          } else {
            lastError = new Error(response.data.message || `Failed to update booking at ${endpoint}`);
          }
        } catch (error) {
          console.error(`Update endpoint ${endpoint} failed:`, error);
          lastError = error;
          // Continue trying next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('Failed to update booking after trying all endpoints');
    });
  },
  
  async cancelBooking(id: string, reason: string = ''): Promise<any> {
    return makeApiRequest(async () => {
      console.log(`Cancelling booking ID: ${id} with reason: ${reason}`);
      
      // Try multiple endpoint formats for cancellation
      const endpoints = [
        { url: '/booking/cancel', data: { bookingId: id, reason } },
        { url: `/booking/${id}/cancel`, data: { reason } },
        { url: `/book/cancel/${id}`, data: { reason } },
        { url: `/api/booking/cancel`, data: { bookingId: id, reason } },
        { url: `/api/book/cancel/${id}`, data: { reason } }
      ];
      
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying cancellation endpoint: ${endpoint.url}`);
          const response = await apiClient.post(endpoint.url, endpoint.data);
          
          if (response.data.status === 'success') {
            console.log(`Booking successfully cancelled using endpoint: ${endpoint.url}`);
            return response.data;
          } else {
            lastError = new Error(response.data.message || `Failed to cancel booking at ${endpoint.url}`);
          }
        } catch (error) {
          console.error(`Cancellation endpoint ${endpoint.url} failed:`, error);
          lastError = error;
          // Continue trying next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('Failed to cancel booking after trying all endpoints');
    });
  },
  
  async getReceipt(id: string): Promise<any> {
    return makeApiRequest(async () => {
      console.log(`Fetching receipt for booking ID: ${id}`);
      
      // Try multiple endpoint formats for receipt retrieval
      const endpoints = [
        `/receipt/${id}`,
        `/booking/${id}/receipt`,
        `/book/${id}/receipt`,
        `/api/receipt/${id}`,
        `/api/booking/${id}`
      ];
      
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying receipt endpoint: ${endpoint}`);
          const response = await apiClient.get(endpoint);
          
          if (response.data.status === 'success') {
            console.log(`Receipt successfully retrieved using endpoint: ${endpoint}`);
            return response.data.data;
          } else {
            lastError = new Error(response.data.message || `Failed to fetch receipt at ${endpoint}`);
          }
        } catch (error) {
          console.error(`Receipt endpoint ${endpoint} failed:`, error);
          lastError = error;
          // Continue trying next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw lastError || new Error('Failed to fetch receipt after trying all endpoints');
    });
  },
  
  async getUserBookings(): Promise<Booking[]> {
    return makeApiRequest(async () => {
      console.log('Fetching user bookings...');
      
      // Try with various endpoint formats for dashboard data
      const endpoints = [
        '/user/dashboard',
        '/user/dashboard/',
        '/api/user/dashboard.php'
      ];
      
      let lastError: any = null;
      const timestamp = new Date().getTime();
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying dashboard endpoint: ${endpoint}`);
          const response = await apiClient.get(`${endpoint}?_t=${timestamp}`);
          
          if (response.data.status === 'success') {
            console.log(`User bookings successfully retrieved using endpoint: ${endpoint}`);
            return response.data.data;
          } else {
            lastError = new Error(response.data.message || `Failed to fetch bookings at ${endpoint}`);
          }
        } catch (error) {
          console.error(`Dashboard endpoint ${endpoint} failed:`, error);
          lastError = error;
          // Continue trying next endpoint
        }
      }
      
      // Emergency fallback: return empty array to prevent UI breaks
      console.log('All dashboard endpoints failed, using emergency fallback');
      return [];
    });
  },

  // Add method to get all bookings for admin
  async getAllBookings(): Promise<Booking[]> {
    return makeApiRequest(async () => {
      console.log('Admin: Fetching all bookings...');
      const timestamp = new Date().getTime();
      
      try {
        const response = await apiClient.get(`/admin/bookings?_t=${timestamp}`);
        
        if (response.data.status === 'success') {
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch all bookings');
        }
      } catch (error) {
        console.log('Admin bookings endpoint failed:', error);
        
        // Fallback to empty array if failed
        return [];
      }
    });
  },

  async getAdminDashboardMetrics(period: 'today' | 'week' | 'month' = 'week'): Promise<DashboardMetrics> {
    return makeApiRequest(async () => {
      console.log(`Fetching admin dashboard metrics for period: ${period}...`);
      
      try {
        // First attempt
        console.log('Trying primary admin metrics endpoint');
        const timestamp = new Date().getTime();
        const response = await apiClient.get(`/user/dashboard?admin=true&period=${period}&_t=${timestamp}`);
        
        if (response.data.status === 'success') {
          console.log('Primary admin metrics endpoint succeeded');
          return response.data.data;
        } else {
          throw new Error(response.data.message || 'Failed to fetch admin metrics');
        }
      } catch (firstError) {
        console.log('Primary admin metrics endpoint failed:', firstError);
        
        try {
          // Second attempt with trailing slash
          console.log('Trying admin metrics endpoint with trailing slash');
          const timestamp = new Date().getTime();
          const response = await apiClient.get(`/user/dashboard/?admin=true&period=${period}&_t=${timestamp}`);
          
          if (response.data.status === 'success') {
            console.log('Admin metrics endpoint with trailing slash succeeded');
            return response.data.data;
          } else {
            throw new Error(response.data.message || 'Failed to fetch admin metrics');
          }
        } catch (secondError) {
          console.log('Both admin metrics endpoints failed');
          
          // Emergency fallback: return dummy data to prevent UI breaks
          console.log('Using emergency fallback data for dashboard metrics');
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
    });
  },
};

// API service for fare management
export const fareAPI = {
  async getTourFares(): Promise<any[]> {
    return makeApiRequest(async () => {
      console.log('Fetching tour fares...');
      const timestamp = new Date().getTime();
      const response = await apiClient.get(`/fares/tours?_t=${timestamp}`);
      
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
      const response = await apiClient.get(`/fares/vehicles?_t=${timestamp}`);
      
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
