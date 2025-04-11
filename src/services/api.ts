
// Import necessary types
import { TourFare } from '@/types/api';
import axios, { AxiosRequestConfig, AxiosHeaders } from 'axios';
import { apiBaseUrl, getApiUrl, defaultHeaders, forceRefreshHeaders } from '@/config/api';

// Create an axios instance with defaults
const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add a longer timeout for slower connections
  timeout: 15000,
});

// Add a request interceptor to include auth token in all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    // Enhanced token verification
    if (token && token !== 'null' && token !== 'undefined') {
      // Ensure config.headers is properly initialized as AxiosHeaders
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      
      // Set the Authorization header
      config.headers.set('Authorization', `Bearer ${token}`);
      
      // Log the headers for debugging
      console.log(`Request to ${config.url} with token: ${token.substring(0, 15)}...`);
    } else {
      console.warn(`No valid auth token found for request to ${config.url}.`);
      
      // Try to get a fresh token if available
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData && userData.token) {
            console.log('Using token from user object instead');
            if (!config.headers) {
              config.headers = new AxiosHeaders();
            }
            config.headers.set('Authorization', `Bearer ${userData.token}`);
          }
        } catch (e) {
          console.error('Error parsing user data from localStorage', e);
        }
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response error:', error);
    
    // Add detailed logging for debugging
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Tour fare API methods
export const fareAPI = {
  // Get all tour fares
  getTourFares: async (): Promise<TourFare[]> => {
    try {
      console.log('Fetching tour fares from the server...');
      
      // Try three different possible endpoints to find the right one
      let response;
      let endpointUsed;
      
      try {
        // First attempt - fares/tours.php
        endpointUsed = '/api/fares/tours.php';
        response = await apiClient.get(endpointUsed);
        console.log(`Successfully fetched tour fares from ${endpointUsed}`);
      } catch (e1) {
        console.log(`Failed to fetch from ${endpointUsed}, trying alternative endpoint...`);
        try {
          // Second attempt - admin/tours.php
          endpointUsed = '/api/admin/tours.php';
          response = await apiClient.get(endpointUsed);
          console.log(`Successfully fetched tour fares from ${endpointUsed}`);
        } catch (e2) {
          // Third attempt - tour_fares table directly
          endpointUsed = '/api/admin/tour-fares.php';
          response = await apiClient.get(endpointUsed);
          console.log(`Successfully fetched tour fares from ${endpointUsed}`);
        }
      }
      
      // Process the response data
      let tourFares: TourFare[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        tourFares = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        tourFares = response.data.data;
      } else if (response.data && response.data.fares && Array.isArray(response.data.fares)) {
        tourFares = response.data.fares;
      } else {
        // Fallback to direct query if we didn't get expected response format
        console.log('Using direct database query for tour fares...');
        
        // Make a direct query to the database via a special endpoint
        const directQueryEndpoint = '/api/admin/direct-query.php';
        const directResponse = await apiClient.post(directQueryEndpoint, {
          query: "SELECT * FROM tour_fares",
          token: localStorage.getItem('authToken')
        });
        
        if (directResponse.data && Array.isArray(directResponse.data)) {
          // Convert from database format to API format
          tourFares = directResponse.data.map(row => ({
            id: row.id,
            tourId: row.tour_id,
            tourName: row.tour_name,
            sedan: parseFloat(row.sedan) || 0,
            ertiga: parseFloat(row.ertiga) || 0,
            innova: parseFloat(row.innova) || 0,
            tempo: parseFloat(row.tempo) || 0,
            luxury: parseFloat(row.luxury) || 0
          }));
        }
      }
      
      console.log(`Received ${tourFares.length} tour fares from the server`);
      return tourFares;
    } catch (error) {
      console.error('Error fetching tour fares:', error);
      
      // Load fallback data from local storage or predefined values
      const fallbackFares = [
        {
          id: 1,
          tourId: 'araku',
          tourName: 'Araku Day Tour',
          sedan: 5000,
          ertiga: 6500,
          innova: 8000,
          tempo: 12000,
          luxury: 15000
        },
        {
          id: 2,
          tourId: 'vizag',
          tourName: 'Vizag City Tour',
          sedan: 3000,
          ertiga: 4000,
          innova: 5500,
          tempo: 8000,
          luxury: 10000
        }
      ];
      
      console.log('Using fallback tour fare data');
      return fallbackFares;
    }
  },

  // Update a tour fare
  updateTourFares: async (fareData: any): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      console.log('Sending tour fare update with auth token:', token.substring(0, 15) + '...');
      console.log('Fare data being sent:', fareData);
      
      // Add a test connection before the actual update
      try {
        const testResponse = await apiClient.get('/api/test.php');
        console.log('Test connection successful:', testResponse.data);
      } catch (testError) {
        console.error('Test connection failed:', testError);
      }
      
      // Use the correct endpoint for tour fare updates with explicit headers
      const response = await apiClient.post('/api/admin/fares-update.php', fareData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // Add a timeout to ensure we don't wait forever
        timeout: 20000,
      });
      
      console.log('Fare update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  // Add a new tour fare
  addTourFare: async (fareData: any): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      console.log('Sending new tour fare with auth token:', token.substring(0, 15) + '...');
      
      // Use the correct endpoint for adding tour fares with explicit headers
      const response = await apiClient.put('/api/admin/fares-update.php', fareData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  // Delete a tour fare
  deleteTourFare: async (tourId: string): Promise<any> => {
    try {
      // Get token directly from localStorage to ensure it's current
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      // Use the correct endpoint with query parameter and explicit headers
      const response = await apiClient.delete(`/api/admin/fares-update.php?tourId=${tourId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      // Improve error logging
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },
  
  // Get vehicle pricing - placeholder implementation for compatibility
  getVehiclePricing: async (): Promise<any[]> => {
    try {
      // This is a redirect to use the tour fares API for now
      return await fareAPI.getTourFares();
    } catch (error) {
      console.error('Error fetching vehicle pricing:', error);
      throw error;
    }
  },
  
  // Update vehicle pricing - placeholder implementation for compatibility
  updateVehiclePricing: async (pricingData: any): Promise<any> => {
    try {
      // Redirect to use the tour fares update API
      return await fareAPI.updateTourFares(pricingData);
    } catch (error) {
      console.error('Error updating vehicle pricing:', error);
      throw error;
    }
  }
};

// Fix the bookingAPI paths to match the actual backend endpoints
export const bookingAPI = {
  // Create booking API service
  createBooking: async (bookingData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/bookings/create.php', bookingData);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  getBookingById: async (bookingId: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/api/bookings/${bookingId}.php`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  // Updated path for user bookings - using the correct endpoint
  getUserBookings: async (): Promise<any[]> => {
    try {
      // Check if token exists
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('No valid token for getUserBookings');
        return [];
      }
      
      // Use the correct user bookings endpoint with correct timestamp to prevent caching
      const timestamp = Date.now();
      const response = await apiClient.get(`/api/user/bookings.php?_t=${timestamp}`, {
        headers: {
          ...forceRefreshHeaders,
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle both response formats
      if (response.data && response.data.bookings) {
        console.log('Received bookings data:', response.data.bookings);
        return response.data.bookings || [];
      }
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Received bookings array data:', response.data);
        return response.data;
      }
      
      console.log('Received other bookings format:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      // Return empty array instead of throwing to prevent UI error loops
      return [];
    }
  },
  
  getAllBookings: async (): Promise<any[]> => {
    try {
      // Use correct admin endpoint with timestamp
      const timestamp = Date.now();
      const response = await apiClient.get(`/api/admin/booking.php?_t=${timestamp}`, {
        headers: forceRefreshHeaders
      });
      
      // Handle both response formats
      if (response.data && response.data.bookings) {
        return response.data.bookings || [];
      }
      
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return [];
    }
  },
  
  updateBooking: async (bookingId: number, bookingData: any): Promise<any> => {
    try {
      const response = await apiClient.post(`/api/bookings/${bookingId}/update.php`, bookingData);
      return response.data;
    } catch (error) {
      console.error(`Error updating booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  updateBookingStatus: async (bookingId: number, status: string): Promise<any> => {
    try {
      const response = await apiClient.post(`/api/bookings/${bookingId}/status.php`, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating status for booking ${bookingId}:`, error);
      throw error;
    }
  },
  
  deleteBooking: async (bookingId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/api/bookings/${bookingId}/delete.php`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting booking with ID ${bookingId}:`, error);
      throw error;
    }
  },
  
  getAdminDashboardMetrics: async (period: string): Promise<any> => {
    try {
      // Get token directly for this admin endpoint
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        throw new Error('No valid authentication token found. Please log in again.');
      }
      
      // Use the correct admin metrics endpoint with timestamp to prevent caching
      const timestamp = Date.now();
      const response = await apiClient.get(`/api/admin/metrics.php?period=${period}&_t=${timestamp}`, {
        headers: {
          ...forceRefreshHeaders,
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Handle different response formats
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      if (response.data && response.data.status === 'success') {
        return response.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching admin dashboard metrics:', error);
      throw error;
    }
  }
};

// Improved auth API methods with better token handling
export const authAPI = {
  login: async (credentials: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/login.php', credentials);
      
      if (response.data && response.data.token) {
        // Validate token before saving
        if (typeof response.data.token === 'string' && response.data.token.length > 10) {
          localStorage.setItem('authToken', response.data.token);
          
          // Log token for debugging
          console.log('Login successful, token stored:', response.data.token.substring(0, 15) + '...');
          
          if (response.data.user) {
            // Make sure we also store the token in the user object
            const userData = { ...response.data.user, token: response.data.token };
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } else {
          console.error('Invalid token received:', response.data.token);
          throw new Error('Invalid authentication token received from server');
        }
      } else {
        console.error('No token in login response:', response.data);
        throw new Error('No authentication token received from server');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    console.log('User logged out, auth tokens cleared');
  },
  
  signup: async (userData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/api/signup.php', userData);
      
      if (response.data && response.data.token) {
        // Validate token before saving
        if (typeof response.data.token === 'string' && response.data.token.length > 10) {
          localStorage.setItem('authToken', response.data.token);
          
          if (response.data.user) {
            // Make sure we also store the token in the user object
            const userData = { ...response.data.user, token: response.data.token };
            localStorage.setItem('user', JSON.stringify(userData));
          }
        } else {
          console.error('Invalid token received from signup:', response.data.token);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  },
  
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken');
    return !!(token && token !== 'null' && token !== 'undefined');
  },
  
  isAdmin: (): boolean => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user.role === 'admin';
    } catch {
      return false;
    }
  },
  
  getCurrentUser: async (): Promise<any> => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      
      // Ensure token is also carried in the user object
      if (!user.token) {
        const token = localStorage.getItem('authToken');
        if (token && token !== 'null' && token !== 'undefined') {
          user.token = token;
          // Update the stored user object
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      
      return user;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
};

// Export the API client for direct use
export default apiClient;
