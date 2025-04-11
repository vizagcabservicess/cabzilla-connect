
import axios, { AxiosRequestConfig } from 'axios';
import { TourFares } from '@/types/cab';
import { getAuthorizationHeader } from '@/config/api';
import { toast } from 'sonner';
// Import and re-export authAPI 
import { authAPI } from '@/services/api/authAPI';
export { authAPI };

// Import and export bookingAPI if it exists, or create a stub if needed
import { bookingAPI } from '@/services/api/bookingAPI';
export { bookingAPI };

// Create a base API instance with default configuration
const baseApi = axios.create({
  baseURL: '/',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }
});

// Add request interceptor to add authorization token to all requests
baseApi.interceptors.request.use(
  config => {
    // Add auth headers to every request
    const authHeaders = getAuthorizationHeader();
    if (authHeaders.Authorization) {
      config.headers.Authorization = authHeaders.Authorization;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Add response interceptor to handle error message display
baseApi.interceptors.response.use(
  response => response,
  error => {
    // Log detailed error information
    console.error('API request failed:', error.config?.url, error);
    
    // Display appropriate message to user based on error type
    if (error.response) {
      // Server returned an error response (4xx, 5xx)
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
      
      // Handle authentication errors
      if (error.response.status === 401 || error.response.status === 403) {
        const message = error.response.data?.message || 'Authentication failed. Please log in again.';
        toast.error(message);
        
        // Try to refresh token from user object
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            if (userData && userData.token) {
              localStorage.setItem('authToken', userData.token);
              console.log('Retrieved token from user object after auth error');
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('No response received:', error.request);
    } else {
      // Error in setting up the request
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Function to check and restore auth token if needed
const ensureAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token || token === 'null' || token === 'undefined') {
    console.log('No auth token in localStorage, checking user object');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (userData && userData.token) {
          localStorage.setItem('authToken', userData.token);
          console.log('Retrieved token from user object for API call');
          return userData.token;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return null;
  }
  return token;
};

// Sync the tour_fares table with vehicles
export const syncTourFaresTable = async (): Promise<boolean> => {
  try {
    // Ensure auth token is available
    const token = ensureAuthToken();
    if (!token) {
      console.warn('No auth token available for syncTourFaresTable');
      toast.error('Authentication required to sync tour fares');
      return false;
    }
    
    console.log('Syncing tour fares table with vehicles...');
    const response = await fetch('/api/admin/db_setup_tour_fares.php', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        ...getAuthorizationHeader()
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error syncing tour fares table:', errorText);
      
      // Try to parse error response
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      } catch (e) {
        // If parsing fails, use the raw text
      }
      
      throw new Error(`Failed to sync tour fares table: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Tour fares table sync result:', data);
    
    return data.status === 'success';
  } catch (error) {
    console.error('Error syncing tour fares table:', error);
    throw error;
  }
};

// API methods for handling tour fare operations
export const fareAPI = {
  // Get all tour fares
  getTourFares: async () => {
    try {
      // Ensure authentication token is set
      ensureAuthToken();
      
      // First sync tables to ensure all vehicles are represented
      try {
        await syncTourFaresTable();
      } catch (syncError) {
        console.warn('Table sync failed before getTourFares:', syncError);
      }
      
      const config: AxiosRequestConfig = {
        method: 'GET',
        url: '/api/admin/tour-fares.php',
        headers: {
          ...getAuthorizationHeader(),
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      };
      
      const response = await baseApi(config);
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        console.warn('Unexpected format from getTourFares API:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error getting tour fares:', error);
      throw error;
    }
  },
  
  // Update tour fare
  updateTourFares: async (fareData: any) => {
    try {
      // Ensure authentication token is set
      const token = ensureAuthToken();
      if (!token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }
      
      console.log('Updating tour fare with data:', fareData);
      
      // Make sure tour_fares table is in sync
      try {
        await syncTourFaresTable();
      } catch (syncError) {
        console.warn('Table sync failed before updateTourFares:', syncError);
      }
      
      const config: AxiosRequestConfig = {
        method: 'POST',
        url: '/api/admin/fares-update.php',
        headers: {
          ...getAuthorizationHeader(),
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: fareData
      };
      
      const response = await baseApi(config);
      return response.data;
    } catch (error) {
      console.error('Error updating tour fare:', error);
      throw error;
    }
  },
  
  // Add new tour fare
  addTourFare: async (fareData: any) => {
    try {
      // Ensure authentication token is set
      const token = ensureAuthToken();
      if (!token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }
      
      console.log('Adding new tour fare with data:', fareData);
      
      const config: AxiosRequestConfig = {
        method: 'PUT',
        url: '/api/admin/fares-update.php',
        headers: {
          ...getAuthorizationHeader(),
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: fareData
      };
      
      const response = await baseApi(config);
      return response.data;
    } catch (error) {
      console.error('Error adding tour fare:', error);
      throw error;
    }
  },
  
  // Delete tour fare
  deleteTourFare: async (tourId: string) => {
    try {
      // Ensure authentication token is set
      const token = ensureAuthToken();
      if (!token) {
        throw new Error('Authentication token is missing. Please log in again.');
      }
      
      console.log('Deleting tour fare with ID:', tourId);
      
      const config: AxiosRequestConfig = {
        method: 'DELETE',
        url: '/api/admin/fares-update.php',
        headers: {
          ...getAuthorizationHeader(),
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        data: { tourId }
      };
      
      const response = await baseApi(config);
      return response.data;
    } catch (error) {
      console.error('Error deleting tour fare:', error);
      throw error;
    }
  }
};
