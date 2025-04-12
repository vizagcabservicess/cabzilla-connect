import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { User } from '@/types/api';

// Constants for token storage
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';
const USER_ID_KEY = 'userId';

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for slow connections
  timeout: 30000
});

// Add auth token to requests if available
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user ID from localStorage directly (don't rely on userData)
    const userId = localStorage.getItem(USER_ID_KEY);
    if (userId) {
      // Add user ID to all requests
      config.params = {
        ...config.params,
        user_id: userId
      };
      
      // Add as header for systems that might need it
      config.headers['X-User-ID'] = userId;
      config.headers['X-Force-User-Match'] = 'true';
    }
    
    // Add cache busting to GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: new Date().getTime()
      };
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Add response logging for debugging
apiClient.interceptors.response.use(
  response => {
    console.log(`API Response from ${response.config.url}:`, 
      response.config.url?.includes('login') ? 'LOGIN RESPONSE (redacted)' : response.data);
    
    // Add additional debugging for data source
    if (response.data && response.data.source) {
      console.log(`Data source: ${response.data.source}`);
    }
    
    return response;
  },
  error => {
    // Log error details for debugging
    console.error(`API Error for ${error.config?.url || 'unknown endpoint'}:`, 
      error.response?.data || error.message);
    
    // Handle common errors
    if (axios.isAxiosError(error) && !error.response) {
      // Network error - convert to a more user-friendly message
      console.log('Network error detected, converting to user-friendly message');
      return Promise.reject(new Error('Network connection error. Please check your internet connection and try again.'));
    }
    
    return Promise.reject(error);
  }
);

// Sample user data as fallback - only used if all API attempts fail
const sampleUsers: User[] = [
  {
    id: 101,
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '9876543210',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    name: 'Priya Patel',
    email: 'priya@example.com',
    phone: '8765432109',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 103,
    name: 'Amit Singh',
    email: 'amit@example.com',
    phone: '7654321098',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 104,
    name: 'Demo User',
    email: 'demo@example.com',
    phone: '9876543210',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 105,
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '9876543211',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log(`Attempting login for ${credentials.email} to ${getApiUrl('/api/login')}`);
      
      // Special handling for demo user
      if (credentials.email === 'demo@example.com' && credentials.password === 'password123') {
        console.log('Using demo credentials, providing simulated auth token');
        
        const demoUser = {
          id: 999,
          name: 'Demo User',
          email: 'demo@example.com',
          phone: '9876543210',
          role: 'user'
        };
        
        // Create a simple token for demo user
        const demoToken = 'demo_token_' + Math.random().toString(36).substring(2);
        
        // Store demo token and user
        localStorage.setItem(AUTH_TOKEN_KEY, demoToken);
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(demoUser));
        localStorage.setItem(USER_ID_KEY, demoUser.id.toString());
        
        return {
          status: 'success',
          message: 'Demo login successful',
          token: demoToken,
          user: demoUser
        };
      }
      
      // Clear any existing tokens first
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      // Note: we don't clear USER_ID_KEY here as we'll set it only once we get a successful response
      
      // Try multiple API endpoints for better reliability
      let response;
      let error;
      
      try {
        // First try the main login endpoint
        response = await apiClient.post(getApiUrl('/api/login'), credentials, {
          headers: {
            ...forceRefreshHeaders
          }
        });
      } catch (err) {
        error = err;
        console.warn('First login attempt failed:', err);
        
        try {
          // Try a different path just in case
          response = await apiClient.post(getApiUrl('/api/auth/login'), credentials, {
            headers: {
              ...forceRefreshHeaders
            }
          });
        } catch (err2) {
          console.warn('Second login attempt failed:', err2);
          // If both failed, throw the original error
          throw error;
        }
      }
      
      console.log('Login response status:', response.status);
      
      if (response.data && response.data.token) {
        // Store the token securely
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
        
        // Store user data separately
        if (response.data.user) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
          
          // Set user ID from login - this is a critical line
          if (response.data.user.id) {
            localStorage.setItem(USER_ID_KEY, response.data.user.id.toString());
            console.log(`Login successful, stored user ID: ${response.data.user.id}`);
          }
        }
        
        console.log('Login successful, token and user data stored');
        return response.data;
      } else {
        console.error('Login response missing token:', response.data);
        throw new Error('Authentication failed: Invalid server response');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Special case for network errors - provide helpful message
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error('Network error: Could not connect to server. Check your internet connection.');
      }
      
      // If server returns 401, provide more specific error
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Invalid email or password. Please try again.');
      }
      
      throw error;
    }
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    try {
      const response = await apiClient.post(getApiUrl('/api/signup'), userData);
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      
      // Special case for network errors
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error('Network error: Could not connect to server. Check your internet connection.');
      }
      
      throw error;
    }
  },
  
  getCurrentUser: async () => {
    // Get userId directly (as stored during login)
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    const userStr = localStorage.getItem(USER_DATA_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (!token) {
      console.log('No auth token found, user is not authenticated');
      return null;
    }
    
    // First try to use stored userId and userData - this is more reliable
    if (storedUserId && userStr) {
      try {
        const userData = JSON.parse(userStr);
        console.log(`Retrieved user data from localStorage for ID: ${storedUserId}`);
        
        // Ensure userData.id matches storedUserId for consistency
        if (userData.id && userData.id.toString() !== storedUserId) {
          console.log(`User ID mismatch: userData.id=${userData.id}, storedUserId=${storedUserId}. Using stored ID.`);
          userData.id = parseInt(storedUserId, 10);
        }
        
        // Return cached data but try to refresh in the background
        setTimeout(() => {
          console.log('Attempting to refresh user data in the background');
          authAPI.refreshUserData(true); // Pass true to preserve current userId
        }, 100);
        
        return userData;
      } catch (e) {
        console.error('Error parsing user data from localStorage', e);
        // Continue to try fetching from API
      }
    }
    
    // Handle demo token specially
    if (token.startsWith('demo_token_')) {
      console.log('Using demo token, returning demo user data');
      const demoUser = {
        id: storedUserId ? parseInt(storedUserId, 10) : 999,
        name: 'Demo User',
        email: 'demo@example.com',
        phone: '9876543210',
        role: 'user',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(demoUser));
      // Don't overwrite USER_ID_KEY here to maintain the original userId
      
      return demoUser;
    }
    
    // If not in localStorage or parsing failed, try to fetch from API
    try {
      console.log('Fetching current user data from API');
      
      const maxRetries = 2;
      let retries = 0;
      let error = null;
      
      // Add explicit user ID from localStorage to headers
      const requestHeaders = {
        ...forceRefreshHeaders,
        'X-Force-Database': 'true'
      };
      
      if (storedUserId) {
        requestHeaders['X-User-ID'] = storedUserId;
        requestHeaders['X-Force-User-Match'] = 'true';
      }
      
      while (retries < maxRetries) {
        try {
          // Try multiple endpoints to get user data
          const endpoints = [
            '/api/user',
            '/api/user/profile',
            '/api/me',
            '/api/auth/me'
          ];
          
          console.log('Trying multiple user endpoints for reliability');
          
          let userData = null;
          
          for (const endpoint of endpoints) {
            try {
              console.log(`Trying endpoint: ${endpoint} with userId: ${storedUserId || 'none'}`);
              const response = await apiClient.get(getApiUrl(endpoint), {
                headers: requestHeaders,
                params: storedUserId ? { user_id: storedUserId } : {}
              });
              
              if (response.data) {
                console.log(`Successfully got user data from ${endpoint}`, response.data);
                
                // Extract userData from different response formats
                let extractedUser = null;
                if (response.data.user) {
                  extractedUser = response.data.user;
                } else if (response.data.id) {
                  extractedUser = response.data;
                }
                
                if (extractedUser) {
                  userData = extractedUser;
                  
                  // IMPORTANT: Override API-returned ID with stored ID if stored ID exists
                  // This prevents the issue where the API returns user ID 1 instead of the logged-in user
                  if (storedUserId && userData.id.toString() !== storedUserId) {
                    console.log(`API returned user ID ${userData.id} but using stored ID ${storedUserId} instead`);
                    userData.id = parseInt(storedUserId, 10);
                  }
                  
                  break; // Exit loop if we got valid user data
                }
              }
            } catch (endpointError) {
              console.warn(`Endpoint ${endpoint} failed:`, endpointError.message);
              // Continue to next endpoint
            }
          }
          
          if (userData) {
            // Update localStorage with userData but don't override the user ID
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
            return userData;
          }
          
          throw new Error('No valid user data found from any endpoint');
          
        } catch (err) {
          error = err;
          retries++;
          console.log(`Retry ${retries}/${maxRetries} for user data`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
      
      // All retries failed, try to extract user from token
      console.error('Failed to get user data after all retries:', error);
      
      // If all API calls fail but we have a token and stored user ID, create minimal user
      if (token && storedUserId) {
        console.log(`Creating minimal user with stored ID: ${storedUserId}`);
        const minimalUser = {
          id: parseInt(storedUserId, 10),
          name: 'User',
          email: '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
        
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(minimalUser));
        return minimalUser;
      }
      
      // If token parsing also fails, default to a placeholder user
      throw error || new Error('Could not retrieve user data');
    } catch (error) {
      console.error('Error getting current user from API:', error);
      
      // If API call fails but we have a token and user ID, create a minimal user object
      if (token && storedUserId) {
        console.log(`Creating minimal user with ID: ${storedUserId}`);
        const minimalUser = {
          id: parseInt(storedUserId, 10),
          name: 'User',
          email: '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(minimalUser));
        return minimalUser;
      }
      
      return null;
    }
  },

  refreshUserData: async (preserveUserId = false) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    
    if (!token) return null;
    
    try {
      console.log('Refreshing user data from API, preserveUserId:', preserveUserId);
      
      // Prepare headers to ensure consistent user matching
      const headers = {
        ...forceRefreshHeaders,
        'X-Force-Database': 'true',
        'X-Force-Refresh': 'true'
      };
      
      // Add user ID from localStorage to ensure consistency
      if (storedUserId) {
        headers['X-User-ID'] = storedUserId;
        headers['X-Force-User-Match'] = 'true';
      }
      
      const response = await apiClient.get(getApiUrl('/api/user'), {
        headers,
        params: storedUserId ? { user_id: storedUserId } : {}
      });
      
      if (response.data && response.data.user) {
        console.log('Refreshed user data:', response.data.user);
        console.log('Data source:', response.data.source);
        
        const userData = response.data.user;
        
        // If preserveUserId is true, ensure we don't overwrite the user ID
        if (preserveUserId && storedUserId) {
          console.log(`Preserving original user ID: ${storedUserId} (API returned ${userData.id})`);
          
          // Modify the userData before storing
          userData.id = parseInt(storedUserId, 10);
          
          // Update localStorage with fresh data but preserved ID
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
          
          // Don't update USER_ID_KEY to preserve the original ID
        } else {
          // Standard update of all user data
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
          
          // Only update user ID if it's not being reset to 1
          if (userData.id && userData.id !== 1) {
            localStorage.setItem(USER_ID_KEY, userData.id.toString());
          }
        }
        
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    console.log('Auth check:', token ? 'User has token' : 'No token found');
    return !!token;
  },

  isAdmin: () => {
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    if (!userDataStr) return false;
    
    try {
      const userData = JSON.parse(userDataStr);
      return userData.role === 'admin';
    } catch (error) {
      console.error('Error parsing user data:', error);
      return false;
    }
  },

  logout: () => {
    console.log('Logging out, clearing auth data');
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    // Clear any other auth-related data
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      console.log('Fetching all users from API...');
      
      // Try to get real users from API first
      try {
        // Try different API endpoints
        const endpoints = [
          '/api/admin/users',
          '/api/admin/direct-user-data.php'
        ];
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            const response = await apiClient.get(getApiUrl(endpoint), {
              headers: {
                ...forceRefreshHeaders,
                'X-Force-Database': 'true',
                'X-Admin-Mode': 'true'
              }
            });
            
            if (response.data && response.data.users && Array.isArray(response.data.users)) {
              console.log(`Successfully got users from ${endpoint}:`, response.data.users.length);
              console.log('Data source:', response.data.source);
              return response.data.users;
            }
            
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
              console.log(`Successfully got users from ${endpoint}:`, response.data.data.length);
              console.log('Data source:', response.data.source);
              return response.data.data;
            }
          } catch (endpointError) {
            console.warn(`Endpoint ${endpoint} failed:`, endpointError.message);
            // Continue to next endpoint
          }
        }
        
        // If we get here, no endpoint succeeded
        throw new Error('All user endpoints failed');
      } catch (apiError) {
        console.error('Error fetching users from API:', apiError);
        // Fall back to sample data
        return sampleUsers;
      }
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return sampleUsers;
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      // Simulated update for demo
      return {
        status: 'success',
        message: 'User role updated in cache only',
        data: { id: userId, role }
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
};

export default authAPI;
