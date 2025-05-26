import axios from 'axios';
import { apiBaseUrl } from '@/config/api';

const AUTH_API_URL = `${apiBaseUrl}/api/auth`;

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin';
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message: string;
  token?: string;
  user?: User;
}

class AuthAPI {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${AUTH_API_URL}/login.php`, credentials);
      if (response.data.status === 'success') {
        this.token = response.data.token;
        localStorage.setItem('auth_token', this.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${AUTH_API_URL}/register.php`, userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axios.get(`${AUTH_API_URL}/me.php`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (response.data.status === 'success') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${AUTH_API_URL}/logout.php`, {}, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  isAdmin(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'admin';
  }

  isDriver(): boolean {
    const user = this.getStoredUser();
    return user?.role === 'driver';
  }

  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authAPI = new AuthAPI();
