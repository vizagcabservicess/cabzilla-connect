
import axios from 'axios';
import { getApiUrl } from '@/config/api';
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
      
      // Try the primary admin users endpoint first
      try {
        console.log('Trying primary admin users endpoint...');
        const response = await apiClient.get(getApiUrl('/api/admin/users'));
        
        if (response.data && Array.isArray(response.data)) {
          return response.data.map(user => ({
            ...user,
            role: user.role === 'admin' ? 'admin' : 'user' // Ensure role is valid
          }));
        }
        
        if (response.data && response.data.status === 'success' && response.data.data) {
          return response.data.data.map(user => ({
            ...user,
            role: user.role === 'admin' ? 'admin' : 'user' // Ensure role is valid
          }));
        }
      } catch (error) {
        console.error('Primary users endpoint failed:', error);
      }
      
      // Try the direct endpoint as fallback
      try {
        console.log('Trying direct admin users endpoint...');
        const response = await apiClient.get(getApiUrl('/api/admin/direct-user-data.php'), {
          headers: { 'X-Force-Refresh': 'true' }
        });
        
        if (response.data && response.data.users && Array.isArray(response.data.users)) {
          return response.data.users.map(user => ({
            id: Number(user.id),
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            role: user.role === 'admin' ? 'admin' : 'user', // Ensure role is typed correctly
            createdAt: user.createdAt || new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Direct endpoint failed:', error);
      }
      
      // Last resort - try PHP endpoint directly
      console.log('Trying PHP endpoint directly...');
      const phpResponse = await axios.get(getApiUrl('/api/admin/users.php'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (phpResponse.data && phpResponse.data.status === 'success' && phpResponse.data.data) {
        return phpResponse.data.data.map(user => ({
          id: Number(user.id),
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role === 'admin' ? 'admin' : 'user', // Ensure role is typed correctly
          createdAt: user.createdAt || user.created_at || new Date().toISOString()
        }));
      }
      
      throw new Error('Failed to fetch users data from all endpoints');
    } catch (error) {
      console.error('Error fetching all users:', error);
      
      // Return empty array instead of throwing
      return [];
    }
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user') => {
    try {
      // Try the RESTful endpoint first
      try {
        const response = await apiClient.put(getApiUrl(`/api/admin/users/${userId}/role`), { role });
        return response.data;
      } catch (error) {
        console.error('Primary role endpoint failed, trying fallback:', error);
      }
      
      // Try the PHP direct endpoint
      const fallbackResponse = await apiClient.put(getApiUrl('/api/admin/users.php'), {
        userId,
        role
      });
      
      return fallbackResponse.data;
    } catch (error) {
      console.error('All update role endpoints failed:', error);
      throw error;
    }
  }
};

export default authAPI;
