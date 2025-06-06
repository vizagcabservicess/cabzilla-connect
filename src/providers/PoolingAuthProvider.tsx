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
  wallet: {
    getTransactions: (userId: number) => Promise<any>;
    deposit: (userId: number, amount: number) => Promise<any>;
    withdraw: (userId: number, amount: number) => Promise<any>;
  };
  walletData: any;
  setWalletData: (wallet: any) => void;
}

const PoolingAuthContext = createContext<PoolingAuthContextType | undefined>(undefined);

export function PoolingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PoolingUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [walletData, setWalletData] = useState<any>(null);

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

  useEffect(() => {
    if (user) {
      poolingAPI.wallet.getBalance(user.id).then(setWalletData);
    }
  }, [user]);

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
    return user?.role === 'provider' && (Number(walletData?.balance) || 0) >= 500;
  };

  const wallet = {
    getTransactions: (userId: number) => poolingAPI.wallet.getTransactions(userId),
    deposit: (userId: number, amount: number) => poolingAPI.wallet.deposit(userId, amount),
    withdraw: (userId: number, amount: number) => poolingAPI.wallet.withdraw(userId, amount),
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    canCreateRide,
    wallet,
    walletData,
    setWalletData,
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
