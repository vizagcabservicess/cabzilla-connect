
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
      
      // Try the direct endpoint first (most reliable)
      try {
        console.log('Trying direct PHP endpoint users.php...');
        const phpResponse = await axios.get(getApiUrl('/api/admin/users.php'), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            ...forceRefreshHeaders
          }
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
          headers: forceRefreshHeaders
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

      console.warn('All user API endpoints failed, returning empty array');
      return [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      // Try the direct PHP endpoint first
      try {
        console.log('Updating role via direct PHP endpoint');
        const fallbackResponse = await apiClient.put(getApiUrl('/api/admin/users.php'), {
          userId,
          role
        }, {
          headers: forceRefreshHeaders
        });
        
        if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
          return fallbackResponse.data;
        }
      } catch (directError) {
        console.error('Direct PHP role update failed:', directError);
      }
      
      // Try the RESTful endpoint if PHP direct method fails
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
