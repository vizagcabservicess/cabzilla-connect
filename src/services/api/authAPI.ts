
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { User } from '@/types/api';

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  }
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
    if (response.config.url?.includes('users.php') || response.config.url?.includes('users')) {
      console.log(`API Response for ${response.config.url}:`, response.data);
    }
    return response;
  },
  error => {
    console.error(`API Error for ${error.config?.url || 'unknown endpoint'}:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiClient.post(getApiUrl('/api/login'), credentials);
    return response.data;
  },
  
  signup: async (userData: { name: string; email: string; password: string; phone?: string }) => {
    const response = await apiClient.post(getApiUrl('/api/signup'), userData);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
      const response = await apiClient.get(getApiUrl('/api/user'));
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
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
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      console.log('Fetching all users...');
      
      // Try the direct users.php endpoint with explicit URL first (most reliable)
      try {
        console.log('Trying direct users.php with explicit URL...');
        
        // First attempt - use the explicit URL directly
        const directUrl = 'https://vizagup.com/api/admin/users.php';
        console.log('Attempting fetch from:', directUrl);
        
        const phpResponse = await axios.get(directUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'direct_url_attempt',
            'Access-Control-Allow-Origin': '*'
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Direct URL response:', phpResponse.data);
        
        if (phpResponse.data && phpResponse.data.status === 'success' && phpResponse.data.data) {
          return phpResponse.data.data.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user', // Ensure role is typed correctly
            createdAt: user.createdAt || user.created_at || new Date().toISOString()
          }));
        }
      } catch (directUrlError) {
        console.error('Direct URL users.php endpoint failed:', directUrlError);
      }
      
      // Try the direct PHP endpoint via getApiUrl helper
      try {
        console.log('Trying PHP endpoint users.php via getApiUrl...');
        const url = getApiUrl('/api/admin/users.php');
        console.log('Fetching from:', url);
        
        const phpResponse = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'getApiUrl_attempt'
          },
          timeout: 8000 // 8 second timeout
        });
        
        console.log('PHP endpoint response:', phpResponse.data);
        
        if (phpResponse.data && phpResponse.data.status === 'success' && phpResponse.data.data) {
          return phpResponse.data.data.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user', // Ensure role is typed correctly
            createdAt: user.createdAt || user.created_at || new Date().toISOString()
          }));
        }
      } catch (phpError) {
        console.error('PHP users.php endpoint failed:', phpError);
      }
      
      // Try the direct user data endpoint as fallback
      try {
        console.log('Trying direct-user-data.php endpoint...');
        const response = await apiClient.get(getApiUrl('/api/admin/direct-user-data.php'), {
          headers: {
            ...forceRefreshHeaders,
            'X-Debug-Attempt': 'direct_user_data_attempt'
          }
        });
        
        console.log('Direct user data response:', response.data);
        
        if (response.data && response.data.users && Array.isArray(response.data.users)) {
          return response.data.users.map((user: any) => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user', // Ensure role is typed correctly
            createdAt: user.createdAt || new Date().toISOString()
          }));
        }
      } catch (directError) {
        console.error('Direct-user-data endpoint failed:', directError);
      }
      
      // Try the RESTful API endpoint as a last resort
      try {
        console.log('Trying RESTful API endpoint...');
        const response = await apiClient.get(getApiUrl('/api/admin/users'));
        
        console.log('RESTful API response:', response.data);
        
        if (response.data && Array.isArray(response.data)) {
          return response.data.map((user: any) => ({
            ...user,
            role: user.role === 'admin' ? 'admin' : 'user' // Ensure role is valid
          }));
        }
        
        if (response.data && response.data.status === 'success' && response.data.data) {
          return response.data.data.map((user: any) => ({
            ...user,
            role: user.role === 'admin' ? 'admin' : 'user' // Ensure role is valid
          }));
        }
      } catch (restError) {
        console.error('RESTful users endpoint failed:', restError);
      }

      // No data returned from any endpoint, create a warning in console
      console.warn('⚠️ All user API endpoints failed, returning empty array');
      return [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      // Try the direct PHP endpoint first with fallback
      try {
        console.log('Updating role via direct PHP endpoint');
        const directUrl = 'https://vizagup.com/api/admin/users.php';
        
        const fallbackResponse = await axios.put(directUrl, {
          userId,
          role
        }, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders
          }
        });
        
        if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
          return fallbackResponse.data;
        }
      } catch (directError) {
        console.error('Direct PHP role update failed:', directError);
      }
      
      // Try the getApiUrl method if direct URL fails
      try {
        const url = getApiUrl('/api/admin/users.php');
        console.log('Trying getApiUrl role update endpoint:', url);
        
        const response = await apiClient.put(url, {
          userId,
          role
        }, {
          headers: forceRefreshHeaders
        });
        
        if (response.data && response.data.status === 'success') {
          return response.data;
        }
      } catch (apiUrlError) {
        console.error('getApiUrl role update failed:', apiUrlError);
      }
      
      // Try the RESTful endpoint if all else fails
      console.log('Trying RESTful role update endpoint');
      const response = await apiClient.put(getApiUrl(`/api/admin/users/${userId}/role`), { role });
      return response.data;
    } catch (error) {
      console.error('All update role endpoints failed:', error);
      throw error;
    }
  }
};

export default authAPI;
