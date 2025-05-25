import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { LoginRequest, SignupRequest, User } from '@/types/api';

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<User> => {
    // Mock authentication logic
    console.log('Login attempt:', credentials);
    
    return {
      id: 1,
      name: 'Admin User',
      email: credentials.email,
      phone: '1234567890',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  },

  signup: async (userData: SignupRequest): Promise<User> => {
    // Mock signup logic
    console.log('Signup attempt:', userData);
    
    return {
      id: 2,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
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
  }
};
