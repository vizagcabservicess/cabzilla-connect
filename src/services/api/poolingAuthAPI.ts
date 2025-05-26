import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { PoolingUser, PoolingLoginRequest, PoolingRegisterRequest, PoolingAuthResponse } from '@/types/poolingAuth';

const POOLING_AUTH_API_URL = getApiUrl('/api/pooling');
const TOKEN_KEY = 'pooling_auth_token';
const USER_KEY = 'pooling_user';

export const poolingAuthAPI = {
  // Login
  login: async (loginData: PoolingLoginRequest): Promise<PoolingAuthResponse> => {
    try {
      const response = await axios.post(`${POOLING_AUTH_API_URL}/login.php`, loginData);
      if ((response.data.status === 'success' || response.data.success) && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      return response.data;
    } catch (error) {
      console.error('Pooling login error:', error);
      throw error;
    }
  },

  // Register
  register: async (registerData: PoolingRegisterRequest): Promise<PoolingAuthResponse> => {
    try {
      const response = await axios.post(`${POOLING_AUTH_API_URL}/register.php`, registerData);
      if ((response.data.status === 'success' || response.data.success) && response.data.token) {
        localStorage.setItem(TOKEN_KEY, response.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      return response.data;
    } catch (error) {
      console.error('Pooling register error:', error);
      throw error;
    }
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await axios.post(`${POOLING_AUTH_API_URL}/logout.php`);
      }
    } catch (error) {
      console.error('Pooling logout error:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<PoolingUser | null> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;
      const response = await axios.get(`${POOLING_AUTH_API_URL}/me.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      poolingAuthAPI.logout();
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_KEY);
    return !!(token && user);
  },

  // Get stored user
  getStoredUser: (): PoolingUser | null => {
    try {
      const userData = localStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  },

  // Initialize auth headers
  initializeAuth: (): void => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }
};

// Initialize auth headers on module load
poolingAuthAPI.initializeAuth();
