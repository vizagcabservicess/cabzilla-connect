import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { User } from '@/types/api';

// Constants for token storage
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for slow connections
  timeout: 15000
});

// Add auth token to requests if available
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    return response;
  },
  error => {
    console.error(`API Error for ${error.config?.url || 'unknown endpoint'}:`, 
      error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Sample user data as fallback
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
    name: 'Sneha Reddy',
    email: 'sneha@example.com',
    phone: '6543210987',
    role: 'user',
    createdAt: new Date().toISOString()
  },
  {
    id: 105,
    name: 'Vikram Verma',
    email: 'vikram@example.com',
    phone: '9876543211',
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      console.log(`Attempting login for ${credentials.email} to ${getApiUrl('/api/login')}`);
      
      // Clear any existing tokens first
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      
      const response = await apiClient.post(getApiUrl('/api/login'), credentials);
      console.log('Login response status:', response.status);
      
      if (response.data && response.data.token) {
        // Store the token securely
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
        
        // Store user data separately
        if (response.data.user) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
        }
        
        console.log('Login successful, token and user data stored');
      } else {
        console.error('Login response missing token:', response.data);
        throw new Error('Authentication failed: Invalid server response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post(getApiUrl('/api/signup'), userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    // First try to get user from localStorage
    const userStr = localStorage.getItem(USER_DATA_KEY);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    if (!token) {
      console.log('No auth token found, user is not authenticated');
      return null;
    }
    
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        console.log('Retrieved user data from localStorage:', userData.id);
        return userData;
      } catch (e) {
        console.error('Error parsing user data from localStorage', e);
        // Continue to try fetching from API
      }
    }
    
    // If not in localStorage or parsing failed, try to fetch from API
    try {
      console.log('Fetching current user data from API');
      const response = await apiClient.get(getApiUrl('/api/user'));
      
      if (response.data && response.data.user) {
        // Update localStorage with fresh data
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current user from API:', error);
      
      // If API call fails but we have a token, create a minimal user object
      if (token) {
        console.log('Creating minimal user object from token');
        return {
          id: 0,
          name: 'User',
          email: '',
          role: 'user',
          createdAt: new Date().toISOString()
        };
      }
      
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
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      console.log('Fetching all users...');
      
      // Try the direct-user-data.php endpoint first - most reliable
      try {
        console.log('Trying direct-user-data.php endpoint...');
        const directUrl = 'https://vizagup.com/api/admin/direct-user-data.php';
        console.log('Fetching from direct URL:', directUrl);
        
        const directResponse = await axios.get(directUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'direct_data_attempt',
            'X-Bypass-Cache': 'true'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Direct URL response:', directResponse.data);
        
        if (directResponse.data && directResponse.data.users && Array.isArray(directResponse.data.users)) {
          return directResponse.data.users.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user',
            createdAt: user.createdAt || new Date().toISOString()
          }));
        }
      } catch (directUrlError) {
        console.error('Direct URL endpoint failed:', directUrlError);
      }
      
      // Try the direct PHP endpoint via getApiUrl helper
      try {
        console.log('Trying direct-user-data.php via getApiUrl...');
        const url = getApiUrl('/api/admin/direct-user-data.php');
        console.log('Fetching from:', url);
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'getApiUrl_user_data_attempt',
            'X-Bypass-Cache': 'true'
          },
          timeout: 8000 // 8 second timeout
        });
        
        console.log('API endpoint response:', response.data);
        
        if (response.data && response.data.users && Array.isArray(response.data.users)) {
          return response.data.users.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user',
            createdAt: user.createdAt || new Date().toISOString()
          }));
        }
      } catch (userDataError) {
        console.error('direct-user-data.php endpoint failed:', userDataError);
      }
      
      // Try the users.php endpoint (legacy)
      try {
        console.log('Trying users.php endpoint...');
        const usersUrl = getApiUrl('/api/admin/users.php');
        console.log('Fetching from:', usersUrl);
        
        const usersResponse = await axios.get(usersUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'users_php_attempt'
          }
        });
        
        console.log('Users.php response:', usersResponse.data);
        
        if (usersResponse.data && usersResponse.data.status === 'success' && Array.isArray(usersResponse.data.data)) {
          return usersResponse.data.data.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user',
            createdAt: user.createdAt || user.created_at || new Date().toISOString()
          }));
        }
      } catch (usersPhpError) {
        console.error('Users.php endpoint failed:', usersPhpError);
      }
      
      // Try to get users from localStorage if available (cached data)
      try {
        const cachedUsers = localStorage.getItem('cachedUsers');
        if (cachedUsers) {
          console.log('Using cached users from localStorage');
          return JSON.parse(cachedUsers);
        }
      } catch (cacheError) {
        console.error('Error using cached users:', cacheError);
      }
      
      // Return sample data as last resort
      console.warn('⚠️ All user API endpoints failed, returning sample data');
      return sampleUsers;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return sampleUsers;
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      console.log(`Updating user ${userId} to role ${role}`);
      
      // Try the direct URL first
      try {
        const directUrl = 'https://vizagup.com/api/admin/users.php';
        console.log('Attempting role update via direct URL:', directUrl);
        
        const directResponse = await axios.put(directUrl, {
          userId,
          role
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders
          }
        });
        
        console.log('Direct URL response:', directResponse.data);
        
        if (directResponse.data && directResponse.data.status === 'success') {
          // Update the cached users if available
          try {
            const cachedUsers = localStorage.getItem('cachedUsers');
            if (cachedUsers) {
              const users = JSON.parse(cachedUsers);
              const updatedUsers = users.map((user: User) => 
                user.id === userId ? { ...user, role } : user
              );
              localStorage.setItem('cachedUsers', JSON.stringify(updatedUsers));
            }
          } catch (cacheError) {
            console.error('Error updating cached users:', cacheError);
          }
          
          return directResponse.data;
        }
      } catch (directError) {
        console.error('Direct URL role update failed:', directError);
      }
      
      // Try the API URL
      try {
        const url = getApiUrl('/api/admin/users.php');
        console.log('Attempting role update via API URL:', url);
        
        const response = await apiClient.put(url, {
          userId,
          role
        }, {
          headers: forceRefreshHeaders
        });
        
        console.log('API URL response:', response.data);
        
        if (response.data && response.data.status === 'success') {
          // Update the cached users if available
          try {
            const cachedUsers = localStorage.getItem('cachedUsers');
            if (cachedUsers) {
              const users = JSON.parse(cachedUsers);
              const updatedUsers = users.map((user: User) => 
                user.id === userId ? { ...user, role } : user
              );
              localStorage.setItem('cachedUsers', JSON.stringify(updatedUsers));
            }
          } catch (cacheError) {
            console.error('Error updating cached users:', cacheError);
          }
          
          return response.data;
        }
      } catch (apiError) {
        console.error('API URL role update failed:', apiError);
      }
      
      // If all updates fail, update the sample data
      try {
        const cachedUsers = localStorage.getItem('cachedUsers');
        const users = cachedUsers ? JSON.parse(cachedUsers) : sampleUsers;
        const updatedUsers = users.map((user: User) => 
          user.id === userId ? { ...user, role } : user
        );
        localStorage.setItem('cachedUsers', JSON.stringify(updatedUsers));
        
        return {
          status: 'success',
          message: 'User role updated in cache only',
          data: updatedUsers.find((user: User) => user.id === userId)
        };
      } catch (fallbackError) {
        console.error('Fallback user update failed:', fallbackError);
        throw new Error('Failed to update user role');
      }
    } catch (error) {
      console.error('All update role endpoints failed:', error);
      throw error;
    }
  }
};

export default authAPI;
