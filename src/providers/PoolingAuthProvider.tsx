import React, { createContext, useContext, useState, useEffect } from 'react';
import { PoolingUser, UserRole } from '@/types/pooling';
import { poolingAPI } from '@/services/api/poolingAPI';

interface PoolingAuthContextType {
  user: PoolingUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; role?: UserRole }) => Promise<PoolingUser>;
  register: (userData: { name: string; email: string; phone: string; password: string; role: UserRole }) => Promise<PoolingUser>;
  logout: () => void;
  canCreateRide: () => boolean;
}

const PoolingAuthContext = createContext<PoolingAuthContextType | undefined>(undefined);

export function PoolingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PoolingUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user and token
    const storedUser = localStorage.getItem('pooling_user');
    const token = localStorage.getItem('pooling_auth_token');
    
    console.log('PoolingAuthProvider initialization:', { storedUser: !!storedUser, token: !!token });
    
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Setting user from localStorage:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('pooling_user');
        localStorage.removeItem('pooling_auth_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string; role?: UserRole }): Promise<PoolingUser> => {
    setIsLoading(true);
    try {
      console.log('Login attempt in provider:', credentials);
      const response = await poolingAPI.auth.login(credentials);
      console.log('API login response:', response);
      
      const userData = response.data?.user || response.user;
      const token = response.data?.token || response.token;
      console.log('Setting user data:', userData);
      
      setUser(userData);
      localStorage.setItem('pooling_user', JSON.stringify(userData));
      localStorage.setItem('pooling_auth_token', token);
      
      return userData;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; phone: string; password: string; role: UserRole }): Promise<PoolingUser> => {
    setIsLoading(true);
    try {
      console.log('Register attempt in provider:', userData);
      const response = await poolingAPI.auth.register(userData);
      console.log('API register response:', response);
      
      const user = response.data?.user || response.user;
      const token = response.data?.token || response.token;
      console.log('Setting registered user data:', user);
      
      setUser(user);
      localStorage.setItem('pooling_user', JSON.stringify(user));
      localStorage.setItem('pooling_auth_token', token);
      
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    localStorage.removeItem('pooling_user');
    localStorage.removeItem('pooling_auth_token');
  };

  const canCreateRide = () => {
    return user?.role === 'provider' && (user?.walletBalance ?? 0) >= 500;
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    canCreateRide
  };

  console.log('PoolingAuthProvider current state:', value);

  return (
    <PoolingAuthContext.Provider value={value}>
      {children}
    </PoolingAuthContext.Provider>
  );
}

export function usePoolingAuth() {
  const context = useContext(PoolingAuthContext);
  if (context === undefined) {
    throw new Error('usePoolingAuth must be used within a PoolingAuthProvider');
  }
  return context;
}
