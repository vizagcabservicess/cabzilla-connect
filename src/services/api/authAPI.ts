import axios from 'axios';
import { AUTH_API_BASE } from '@/lib/authLogic';

const API_BASE_URL = AUTH_API_BASE;

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
  role?: 'guest' | 'admin' | 'super_admin' | 'driver' | 'user' | 'customer' | 'provider';
}

export interface SocialLoginRequest {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
  redirect_to_signup?: boolean;
  email_verification_required?: boolean;
  verification_email_sent?: boolean;
  social_data?: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    picture?: string;
  };
}

class AuthAPI {
  public token: string | null = null;

  constructor() {
    this.initializeToken();
    this.setupInterceptors();
  }

  private setupInterceptors() {
    axios.interceptors.request.use((config) => {
      const url = config.url ?? '';
      const isAuthEndpoint = /\/api\/auth\/(login|register|social-login|social-signup)\.php/.test(url);
      if (this.token && url.includes('/api/') && !isAuthEndpoint) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
    axios.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401 && err?.config?.url?.includes('/api/')) {
          this.setToken(null);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('user');
          }
        }
        return Promise.reject(err);
      }
    );
  }

  private initializeToken() {
    try {
      this.token = localStorage.getItem('auth_token');
    } catch (e) {
      console.error("Could not access localStorage:", e);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/login.php`, credentials, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
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

  async socialLogin(socialData: SocialLoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/social-login.php`, socialData, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Social login error:', error);
      throw error;
    }
  }

  async socialSignup(socialData: SocialLoginRequest & { phone?: string }): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/social-signup.php`, socialData, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Social signup error:', error);
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
      this.setToken(null);
      localStorage.removeItem('user');
    }
  }

  async updateProfile(data: { name?: string; phone?: string }): Promise<AuthResponse> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/update-profile.php`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` })
        }
      });
      const resData = response.data;
      if (resData.success && resData.user) {
        localStorage.setItem('user', JSON.stringify(resData.user));
        return { success: true, user: resData.user };
      }
      return { success: false, error: resData.error || 'Update failed' };
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
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
      // DON'T logout on error in development mode - just return null
      if (process.env.NODE_ENV !== 'development') {
        this.logout();
      }
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
