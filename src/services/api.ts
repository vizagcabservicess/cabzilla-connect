
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
  timeout: 90000, // Increased timeout for slower connections
});

// Function to set the auth token in the headers
const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('auth_token', token);
    
    // Also set token in sessionStorage for backup
    sessionStorage.setItem('auth_token', token);
    
    // Set cookie as another backup method
    document.cookie = `auth_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    
    // Clear cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }
};

// Try to load token from multiple sources - localStorage, sessionStorage, cookie
const loadToken = () => {
  const localToken = localStorage.getItem('auth_token');
  const sessionToken = sessionStorage.getItem('auth_token');
  
  // Get token from cookie if available
  const getCookieValue = (name: string) => {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? match[2] : null;
  };
  const cookieToken = getCookieValue('auth_token');
  
  // Use first available token
  const token = localToken || sessionToken || cookieToken;
  
  if (token) {
    try {
      // Verify token isn't expired
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp > currentTime) {
        console.log('Found valid token, setting authorization headers');
        setAuthToken(token);
        return true;
      } else {
        console.log('Token expired, clearing');
        setAuthToken(null);
        return false;
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      setAuthToken(null);
      return false;
    }
  }
  
  return false;
};

// Load token on app initialization
loadToken();

// Add request interceptor for debugging and token renewal
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    
    // Check if token exists and renew from multiple sources if needed
    const authHeader = config.headers.Authorization || config.headers.authorization;
    if (!authHeader) {
      loadToken(); // Try to load token if not in headers
    }
    
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
    
    // Check if the response data indicates an error despite 200 status
    if (response.data.status === 'error') {
      console.error('Error from server despite 200 status:', response.data.message);
      return Promise.reject(new Error(response.data.message || 'Unknown server error'));
    }
    
    return response;
  },
  (error) => {
    console.error('Response error:', error.response?.status, error.message);
    console.error('Response data:', error.response?.data);
    
    // Enhanced error debugging
    if (error.response?.status === 500 && error.config?.url?.includes('/book')) {
      console.error('Booking creation error details:', {
        requestData: error.config?.data,
        responseData: error.response?.data,
        headers: error.config?.headers
      });
    }
    
    // Handle 401 Unauthorized errors by clearing auth tokens
    if (error.response?.status === 401) {
      console.warn('Unauthorized request, clearing auth tokens');
      setAuthToken(null);
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
      const responseData = axiosError.response.data as any;
      if (typeof responseData === 'object' && responseData !== null && responseData.message) {
        return new Error(responseData.message);
      }
      
      if (typeof responseData === 'string' && responseData.includes('error')) {
        return new Error(responseData);
      }
      
      return new Error(
        `Error ${axiosError.response.status}: ${
          typeof responseData === 'object' && responseData !== null
          ? (responseData.message || JSON.stringify(responseData))
          : axiosError.message
        }`
      );
    }
    
    // Special handling for network errors
    if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
      return new Error('Network error: Server is unreachable. Please check your connection and try again.');
    }

    // Handle timeout errors
    if (axiosError.code === 'ETIMEDOUT') {
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

// Helper function to clear all cached data
const clearAllCachedData = () => {
  console.log("Clearing all cached data");
  localStorage.removeItem('cached_bookings');
  localStorage.removeItem('cached_metrics');
  sessionStorage.removeItem('selectedCab');
  sessionStorage.removeItem('hourlyPackage');
  sessionStorage.removeItem('tourPackage');
  sessionStorage.removeItem('bookingDetails');
  sessionStorage.removeItem('cabFares');
  sessionStorage.removeItem('dropLocation');
  sessionStorage.removeItem('pickupLocation');
  sessionStorage.removeItem('pickupDate');
  sessionStorage.removeItem('returnDate');
  
  // Clear all fare caches
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('_price') || key.includes('_fare') || key.includes('price_') || key.includes('fare_'))) {
      console.log(`Clearing cache for ${key}`);
      sessionStorage.removeItem(key);
    }
  }
};

// Check token validity periodically
setInterval(() => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn('Token expired during session, clearing');
        setAuthToken(null);
        window.location.href = '/login'; // Redirect to login if token expired
      }
    } catch (e) {
      console.error('Error checking token validity:', e);
    }
  }
}, 60000); // Check every minute

// API service for authentication
export const authAPI = {
  async login(credentials: any): Promise<any> {
    return makeApiRequest(async () => {
      // Clear all caches before login to ensure fresh state
      clearAllCachedData();
      
      const response = await apiClient.post('/login', credentials);
      if (response.data && (response.data.success === true || response.data.status === 'success')) {
        const token = response.data.token;
        setAuthToken(token);
        
        return response.data;
      } else {
        throw new Error(response.data?.message || 'Login failed');
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
    // Clear all cached data
    clearAllCachedData();
  },

  isAuthenticated(): boolean {
    // Check for token in multiple storage locations
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token');
    
    if (!token) return false;
    
    try {
      // Check if token is still valid
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp > currentTime) {
        return true;
      }
      
      // Token expired, clear it
      setAuthToken(null);
      return false;
    } catch (e) {
      console.error('Error decoding token:', e);
      setAuthToken(null);
      return false;
    }
  },

  getUser(): any {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    try {
      return jwtDecode(token);
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }
};

// API service for bookings
export const bookingAPI = {
  async createBooking(bookingData: BookingRequest): Promise<any> {
    return makeApiRequest(async () => {
      // Make a copy of the data to avoid mutating the original
      const requestData = { ...bookingData };
      
      // Ensure numeric fields are numbers
      if (typeof requestData.distance === 'string') {
        requestData.distance = parseFloat(requestData.distance);
      }
      
      if (typeof requestData.totalAmount === 'string') {
        requestData.totalAmount = parseFloat(requestData.totalAmount);
      }
      
      // Fix any null values that should be empty strings
      if (requestData.dropLocation === null) {
        requestData.dropLocation = '';
      }
      
      // Set returnDate to null explicitly if it's an empty string
      if (requestData.returnDate === '') {
        requestData.returnDate = null;
      }
      
      // Add sendEmailNotification for better visibility
      requestData.sendEmailNotification = true;
      
      console.log('Creating booking with data:', requestData);
      
      const response = await apiClient.post('/book', requestData);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to create booking');
      }
    }, 2, 2000); // 2 retries with 2 second delay
  },

  async getBookings(): Promise<Booking[]> {
    return makeApiRequest(async () => {
      // Add cache busting
      const cacheKey = `bookings_cache_${new Date().getTime()}`;
      
      const response = await apiClient.get(`/user/dashboard?${cacheKey}`);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch bookings');
      }
    });
  },

  async getDashboardMetrics(period: string = 'week', isAdmin: boolean = false): Promise<DashboardMetrics> {
    return makeApiRequest(async () => {
      // Add cache busting
      const timestamp = new Date().getTime();
      const url = isAdmin 
        ? `/user/dashboard?admin=true&period=${period}&refresh=true&_t=${timestamp}` 
        : `/user/dashboard?period=${period}&_t=${timestamp}`;
      
      const response = await apiClient.get(url);
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch metrics');
      }
    });
  }
};

// Export the Axios instance and token handling for use in other services
export { apiClient, setAuthToken, loadToken };
