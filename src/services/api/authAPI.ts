
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { LoginRequest, SignupRequest, User } from '@/types/api';

interface AuthResponse {
  user: User;
  token: string;
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    // Mock authentication logic
    console.log('Login attempt:', credentials);
    
    const user: User = {
      id: 1,
      name: 'Admin User',
      email: credentials.email,
      phone: '1234567890',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const token = 'mock-jwt-token-' + Date.now();
    
    // Store token in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    
    return { user, token };
  },

  signup: async (userData: SignupRequest): Promise<AuthResponse> => {
    // Mock signup logic
    console.log('Signup attempt:', userData);
    
    const user: User = {
      id: 2,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const token = 'mock-jwt-token-' + Date.now();
    
    // Store token in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
    
    return { user, token };
  },

  getUsers: async (): Promise<User[]> => {
    // Mock fetching users
    return [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1234567890',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Regular User',
        email: 'user@example.com',
        phone: '9876543210',
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];
  },
  
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    // Mock updating user
    console.log('Updating user:', id, userData);
    
    return {
      id: id,
      name: userData.name || 'Updated User',
      email: userData.email || 'updated@example.com',
      phone: userData.phone || '1122334455',
      role: userData.role || 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  },
  
  deleteUser: async (id: number): Promise<void> => {
    // Mock deleting user
    console.log('Deleting user:', id);
  },
  
  getCurrentUser: async (): Promise<User> => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    
    return {
      id: 1,
      name: 'Current User',
      email: 'user@example.com',
      phone: '1234567890',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },

  isAdmin: (): boolean => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role === 'admin';
    }
    return false;
  },

  logout: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
};
