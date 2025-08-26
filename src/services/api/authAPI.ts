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
  }

  private initializeToken() {
    try {
      this.token = localStorage.getItem('auth_token');
      console.log('DEBUG: AuthAPI initialized with token:', this.token ? 'present' : 'null');
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
    console.log('DEBUG: AuthAPI token set:', token ? 'present' : 'null');
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
      console.log('DEBUG: Attempting social login with data:', socialData);
      console.log('DEBUG: API_BASE_URL:', API_BASE_URL);
      console.log('DEBUG: Full URL will be:', `${API_BASE_URL}/social-login.php`);
      
      // Use the same API base URL as regular login
      const response = await axios.post(`${API_BASE_URL}/social-login.php`, socialData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('DEBUG: Social login response status:', response.status);
      console.log('DEBUG: Social login response headers:', response.headers);
      console.log('DEBUG: Social login response data:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('DEBUG: Social login successful, user stored:', response.data.user);
      } else {
        console.warn('DEBUG: Social login response missing required data:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Social login error:', error);
      if (axios.isAxiosError(error)) {
        console.error('DEBUG: Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      }
      throw error;
    }
  }

  async socialSignup(socialData: SocialLoginRequest & { phone?: string }): Promise<AuthResponse> {
    try {
      console.log('DEBUG: Attempting social signup with data:', socialData);
      console.log('DEBUG: API_BASE_URL:', API_BASE_URL);
      console.log('DEBUG: Full URL will be:', `${API_BASE_URL}/social-signup.php`);
      
      const response = await axios.post(`${API_BASE_URL}/social-signup.php`, socialData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('DEBUG: Social signup response status:', response.status);
      console.log('DEBUG: Social signup response data:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        this.setToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('DEBUG: Social signup successful, user stored:', response.data.user);
      } else {
        console.warn('DEBUG: Social signup response missing required data:', response.data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Social signup error:', error);
      if (axios.isAxiosError(error)) {
        console.error('DEBUG: Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        });
      }
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
