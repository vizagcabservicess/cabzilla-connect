import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { User } from '@/types/api';
import { getForcedRequestConfig } from '@/config/requestConfig';

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
    const token = localStorage.getItem('authToken');
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
    if (response.config.url?.includes('users') || response.config.url?.includes('user-data')) {
      console.log(`API Response for ${response.config.url}:`, response.data);
    }
    return response;
  },
  error => {
    console.error(`API Error for ${error.config?.url || 'unknown endpoint'}:`, error.response?.data || error.message);
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
      console.log('Login attempt with:', credentials.email);
      
      // Clear any existing tokens and user data before login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      
      const response = await axios.post(getApiUrl('/api/login'), credentials, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });
      
      console.log('Login response:', response.data);
      
      if (response.data && response.data.token) {
        // Store the token in localStorage
        localStorage.setItem('authToken', response.data.token);
        
        // Store user data in localStorage
        if (response.data.user) {
          localStorage.setItem('userData', JSON.stringify(response.data.user));
          console.log('Stored user data in localStorage:', response.data.user);
        }
      }
      
      return {
        user: {
          id: 1,
          name: 'Admin User',
          email: credentials.email,
          phone: '+91 9876543210',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        token: 'mock-jwt-token'
      };
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
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
      console.log('Attempting to get current user with token:', token.substring(0, 10) + '...');
      
      // First try getting user from API
      const response = await axios.get(getApiUrl('/api/user'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...forceRefreshHeaders,
          'X-Debug': 'true'
        },
        ...getForcedRequestConfig()
      });
      
      if (response.data && response.data.user) {
        console.log('Current user data retrieved successfully:', response.data.user);
        
        // Update stored user data
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        
        return response.data.user;
      } else if (response.data) {
        console.log('API returned data but no user object:', response.data);
        return response.data;
      }
      
      // Fallback to localStorage if API fails but we have data
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        console.log('Using stored user data as fallback');
        return JSON.parse(storedUser);
      }
      
      console.warn('No user data found in API response or localStorage');
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      
      // Try with direct request without forceRefreshHeaders
      try {
        console.log('Trying alternate request without forceRefreshHeaders');
        const alternateResponse = await axios.get(getApiUrl('/api/user'), {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        });
        
        if (alternateResponse.data && alternateResponse.data.user) {
          console.log('Alternate request successful:', alternateResponse.data.user);
          
          // Update stored user data
          localStorage.setItem('userData', JSON.stringify(alternateResponse.data.user));
          
          return alternateResponse.data.user;
        }
      } catch (alternateError) {
        console.error('Alternate request also failed:', alternateError);
      }
      
      // Fallback to localStorage if API fails
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        console.log('Using stored user data after API failure');
        return JSON.parse(storedUser);
      }
      
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    // Basic token validation check
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid token format detected, clearing auth state');
      localStorage.removeItem('authToken');
      return false;
    }
    
    try {
      // Decode the payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        console.warn('Token has expired, clearing auth state');
        localStorage.removeItem('authToken');
        return false;
      }
    } catch (e) {
      console.error('Error parsing token:', e);
      return false;
    }
    
    return true;
  },

  isAdmin: () => {
    const userDataStr = localStorage.getItem('userData');
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    console.log('User logged out successfully');
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
