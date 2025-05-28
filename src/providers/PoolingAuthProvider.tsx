
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PoolingUser, PoolingWallet } from '@/types/pooling';

interface PoolingAuthContextType {
  user: PoolingUser | null;
  wallet: PoolingWallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshWallet: () => Promise<void>;
  canCreateRide: () => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'guest' | 'provider';
}

const PoolingAuthContext = createContext<PoolingAuthContextType | undefined>(undefined);

export function PoolingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PoolingUser | null>(null);
  const [wallet, setWallet] = useState<PoolingWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('pooling_auth_token');
      if (token) {
        // Simulate API call to verify token and get user data
        const userData = localStorage.getItem('pooling_user');
        if (userData) {
          const user = JSON.parse(userData);
          setUser(user);
          await fetchWallet(user.id);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('pooling_auth_token');
      localStorage.removeItem('pooling_user');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWallet = async (userId: number) => {
    try {
      // Simulate wallet fetch - replace with actual API call
      const mockWallet: PoolingWallet = {
        id: 1,
        userId,
        balance: 750, // Example balance
        lockedAmount: 0,
        minimumBalance: 500,
        totalEarnings: 2500,
        totalSpent: 1750,
        canWithdraw: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setWallet(mockWallet);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Simulate login API call
      const mockUser: PoolingUser = {
        id: 1,
        name: 'John Doe',
        email,
        phone: '+91 9876543210',
        role: 'provider', // or 'guest', 'admin'
        isActive: true,
        rating: 4.5,
        totalRides: 25,
        walletBalance: 750,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const token = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('pooling_auth_token', token);
      localStorage.setItem('pooling_user', JSON.stringify(mockUser));
      
      setUser(mockUser);
      await fetchWallet(mockUser.id);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      // Simulate registration API call
      const newUser: PoolingUser = {
        id: Date.now(),
        ...userData,
        isActive: true,
        rating: 0,
        totalRides: 0,
        walletBalance: userData.role === 'provider' ? 500 : 0, // Providers start with minimum balance
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const token = 'mock_jwt_token_' + Date.now();
      localStorage.setItem('pooling_auth_token', token);
      localStorage.setItem('pooling_user', JSON.stringify(newUser));
      
      setUser(newUser);
      await fetchWallet(newUser.id);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('pooling_auth_token');
    localStorage.removeItem('pooling_user');
    setUser(null);
    setWallet(null);
  };

  const refreshWallet = async () => {
    if (user) {
      await fetchWallet(user.id);
    }
  };

  const canCreateRide = () => {
    return user?.role === 'provider' && wallet && wallet.balance >= wallet.minimumBalance;
  };

  const value = {
    user,
    wallet,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshWallet,
    canCreateRide
  };

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
