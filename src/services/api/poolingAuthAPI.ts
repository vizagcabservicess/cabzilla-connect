import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { 
  PoolingUser, 
  PoolingLoginRequest, 
  PoolingRegisterRequest, 
  PoolingAuthResponse 
} from '@/types/poolingAuth';

const POOLING_AUTH_API_URL = getApiUrl('/api/pooling');

class PoolingAuthAPI {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('pooling_auth_token');
  }

  async login(credentials: PoolingLoginRequest): Promise<PoolingAuthResponse> {
    try {
      const response = await axios.post(`${POOLING_AUTH_API_URL}/login.php`, credentials);
      
      if (response.data.status === 'success' || response.data.success) {
        this.token = response.data.token;
        localStorage.setItem('pooling_auth_token', this.token);
        localStorage.setItem('pooling_user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('Pooling login error:', error);
      throw error;
    }
  }

  async register(userData: PoolingRegisterRequest): Promise<PoolingAuthResponse> {
    try {
      const response = await axios.post(`${POOLING_AUTH_API_URL}/register.php`, userData);
      return response.data;
    } catch (error) {
      console.error('Pooling registration error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(`${POOLING_AUTH_API_URL}/logout.php`, {}, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
      }
    } catch (error) {
      console.error('Pooling logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('pooling_auth_token');
      localStorage.removeItem('pooling_user');
    }
  }

  async getCurrentUser(): Promise<PoolingUser | null> {
    try {
      if (!this.token) return null;
      
      const response = await axios.get(`${POOLING_AUTH_API_URL}/me.php`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (response.data.success) {
        localStorage.setItem('pooling_user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Get current pooling user error:', error);
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  isGuest(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'guest';
  }

  isProvider(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'provider';
  }

  isAdmin(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'admin';
  }

  getStoredUser(): PoolingUser | null {
    try {
      const userData = localStorage.getItem('pooling_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

export const poolingAuthAPI = new PoolingAuthAPI();
