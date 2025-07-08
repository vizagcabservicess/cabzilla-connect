import axios from 'axios';

const API_BASE_URL = '/api/auth'; // Using relative path for proxy

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin' | 'super_admin';
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
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
}

class AuthAPI {
  private token: string | null = null;

  constructor() {
    try {
      this.token = localStorage.getItem('auth_token');
    } catch (e) {
      console.error("Could not access localStorage:", e);
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, credentials, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data.success && response.data.token && response.data.user) {
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

  async signup(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/register.php`, userData, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(`${API_BASE_URL}/logout.php`, {}, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.token) return null;
      
      const response = await axios.get(`${API_BASE_URL}/me.php`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      this.logout();
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
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
