
import axios from 'axios';
import { getApiUrl } from '@/config/api';

const AUTH_API_URL = getApiUrl('/api/auth');

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
}

export interface AuthResponse {
  status: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    is_active: boolean;
  };
  token: string;
  message?: string;
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axios.post(`${AUTH_API_URL}/login.php`, credentials);
    return response.data;
  },

  register: async (userData: SignupRequest): Promise<{ status: string; message?: string; user_id?: number }> => {
    const response = await axios.post(`${AUTH_API_URL}/register.php`, userData);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axios.post(`${AUTH_API_URL}/logout.php`);
  },

  getCurrentUser: async (): Promise<any> => {
    const response = await axios.get(`${AUTH_API_URL}/me.php`);
    return response.data;
  }
};
