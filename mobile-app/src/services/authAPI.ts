/**
 * Auth API - same endpoints as web app
 * POST /api/auth/login.php, register.php, social-login.php, social-signup.php
 */
import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

// On web, use relative URLs so requests go through the dev proxy (avoids CORS)
const getAuthBase = () => {
  if (API_BASE_URL) return `${API_BASE_URL}/api/auth`;
  if (Platform.OS === 'web') return '/api/auth';
  return `${WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com'}/api/auth`;
};
const AUTH_BASE = getAuthBase();

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

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
  role?: string;
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
  private token: string | null = null;

  async getStoredToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      const t = await SecureStore.getItemAsync(TOKEN_KEY);
      this.token = t;
      return t;
    } catch {
      return null;
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${AUTH_BASE}/login.php`, credentials, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    if (data.success && data.token && data.user) {
      this.setToken(data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  async signup(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post(`${AUTH_BASE}/register.php`, userData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async socialLogin(socialData: SocialLoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${AUTH_BASE}/social-login.php`, socialData, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    if (data.success && data.token && data.user) {
      this.setToken(data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  async socialSignup(socialData: SocialLoginRequest & { phone?: string }): Promise<AuthResponse> {
    const response = await axios.post(`${AUTH_BASE}/social-signup.php`, socialData, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    if (data.success && data.token && data.user) {
      this.setToken(data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (token) {
        await axios.post(
          `${AUTH_BASE}/logout.php`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch {
      // Ignore logout API errors
    } finally {
      this.setToken(null);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.getStoredToken();
    if (!token) return null;
    try {
      const response = await axios.get(`${AUTH_BASE}/me.php`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success && response.data?.user) {
        const user = response.data.user;
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  /** Register push token for super_admin users. Backend rejects non–super_admin. */
  async registerPushToken(pushToken: string, platform: string): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) return false;
    try {
      const base = getAuthBase();
      await axios.post(
        `${base}/register-push-token.php`,
        { pushToken, platform },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      return true;
    } catch {
      return false;
    }
  }
}

export const authAPI = new AuthAPI();
