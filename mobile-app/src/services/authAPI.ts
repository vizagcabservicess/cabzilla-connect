/**
 * Auth API - same endpoints as web app
 * POST /api/auth/login.php, register.php, social-login.php, social-signup.php
 */
import axios, { isAxiosError } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

// On web, use relative URLs so requests go through the dev proxy (avoids CORS)
const getAuthBase = () => {
  if (API_BASE_URL) return `${API_BASE_URL}/api/auth`;
  if (Platform.OS === 'web') return '/api/auth';
  return `${WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com'}/api/auth`;
};

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin' | 'super_admin' | 'guest';
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
  /** Google ID token — backend verifies with Google when present */
  id_token?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  /** Present when backend uses social-login unified flow */
  is_new_user?: boolean;
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

  async setToken(token: string | null): Promise<void> {
    this.token = token;
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // SecureStore can fail on some devices; in-memory token still allows the session
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${getAuthBase()}/login.php`, credentials, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    if (data.success && data.token && data.user) {
      await this.setToken(data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  async signup(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await axios.post(`${getAuthBase()}/register.php`, userData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async socialLogin(socialData: SocialLoginRequest): Promise<AuthResponse> {
    const response = await axios.post(`${getAuthBase()}/social-login.php`, socialData, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.data;
    if (data.success && data.token && data.user) {
      await this.setToken(data.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    }
    return data;
  }

  /** Google signup - uses same social-login.php as login (backend auto-creates user on first login) */
  async socialSignup(socialData: SocialLoginRequest & { phone?: string }): Promise<AuthResponse> {
    return this.socialLogin(socialData);
  }

  async updateProfile(data: { name?: string; phone?: string }): Promise<AuthResponse> {
    const token = await this.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const response = await axios.patch(`${getAuthBase()}/update-profile.php`, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const resData = response.data;
    if (resData.success && resData.user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(resData.user));
      return { success: true, user: resData.user };
    }
    return { success: false, error: resData.error || 'Update failed' };
  }

  async forgotPassword(email: string): Promise<{ status: string; message?: string }> {
    const response = await axios.post(`${getAuthBase()}/forgot-password.php`, { email }, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  }

  async logout(): Promise<void> {
    this.token = null;
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        await axios.post(
          `${getAuthBase()}/logout.php`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch {
      // Ignore logout API errors
    } finally {
      this.token = null;
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  }

  /** Drop token + cached user when the server rejects the session (deleted account, inactive, invalid JWT). */
  private async clearStoredSession(): Promise<void> {
    this.token = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // ignore
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.getStoredToken();
    if (!token) return null;
    try {
      const response = await axios.get(`${getAuthBase()}/me.php`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success && response.data?.user) {
        const user = response.data.user;
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch (e) {
      if (isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 401 || status === 403) {
          await this.clearStoredSession();
        }
      }
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

  /** Register Expo push token for super_admin (new bookings) or driver (trip assignments). */
  async registerPushToken(pushToken: string, platform: string): Promise<boolean> {
    const token = await this.getStoredToken();
    if (!token) return false;
    try {
      const base = getAuthBase();
      const res = await axios.post<{ status?: string; message?: string }>(
        `${base}/register-push-token.php`,
        { pushToken, platform },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (res.data?.status !== 'success') {
        console.warn('[push] register-push-token unexpected body:', res.data);
        return false;
      }
      return true;
    } catch (e) {
      if (isAxiosError(e)) {
        console.warn(
          '[push] register-push-token failed:',
          e.response?.status,
          e.response?.data ?? e.message
        );
      } else {
        console.warn('[push] register-push-token failed:', e);
      }
      return false;
    }
  }
}

export const authAPI = new AuthAPI();
