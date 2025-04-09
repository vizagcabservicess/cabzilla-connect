
import axios from 'axios';
import { getApiUrl } from '@/config/api';

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

  getAllUsers: async () => {
    try {
      // Try the primary endpoint
      const response = await apiClient.get(getApiUrl('/api/admin/users'));
      return response.data;
    } catch (error) {
      console.error('Primary users endpoint failed, trying fallback:', error);
      
      // Try the direct data endpoint
      const fallbackResponse = await apiClient.get(getApiUrl('/api/admin/direct-user-data.php'), {
        headers: { 'X-Force-Refresh': 'true' }
      });
      
      if (fallbackResponse.data && fallbackResponse.data.users) {
        return fallbackResponse.data.users;
      }
      
      throw error;
    }
  },

  updateUserRole: async (userId: number, role: string) => {
    try {
      // Try the RESTful endpoint first
      const response = await apiClient.put(getApiUrl(`/api/admin/users/${userId}/role`), { role });
      return response.data;
    } catch (error) {
      console.error('Primary role endpoint failed, trying fallback:', error);
      
      // Try the PHP direct endpoint
      const fallbackResponse = await apiClient.put(getApiUrl('/api/admin/users.php'), {
        userId,
        role
      });
      
      return fallbackResponse.data;
    }
  }
};

export default authAPI;
