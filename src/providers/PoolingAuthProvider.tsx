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
    // Check for stored user
    const storedUser = localStorage.getItem('pooling_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string; role?: UserRole }): Promise<PoolingUser> => {
    setIsLoading(true);
    try {
      const response = await poolingAPI.auth.login(credentials);
      const userWithProviderId = response.user.provider_id ? { ...response.user, providerId: response.user.provider_id } : response.user;
      setUser(userWithProviderId);
      localStorage.setItem('pooling_user', JSON.stringify(userWithProviderId));
      return userWithProviderId;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; phone: string; password: string; role: UserRole }): Promise<PoolingUser> => {
    setIsLoading(true);
    try {
      const response = await poolingAPI.auth.register(userData);
      const userWithProviderId = response.user.provider_id ? { ...response.user, providerId: response.user.provider_id } : response.user;
      setUser(userWithProviderId);
      localStorage.setItem('pooling_user', JSON.stringify(userWithProviderId));
      return userWithProviderId;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pooling_user');
  };

  const canCreateRide = () => {
    return user?.role === 'provider' && (user?.walletBalance ?? 0) >= 500;
  };

  return (
    <PoolingAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      canCreateRide
    }}>
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
