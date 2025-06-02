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
    if (token) {
      // Always fetch user profile from backend if token exists
      poolingAPI.auth.getProfile().then(profile => {
        setUser(profile);
        localStorage.setItem('pooling_user', JSON.stringify(profile));
        setIsLoading(false);
      }).catch(() => {
        setUser(null);
        localStorage.removeItem('pooling_user');
        setIsLoading(false);
      });
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Listen for token changes in localStorage (e.g., after login)
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('pooling_auth_token');
      if (token) {
        poolingAPI.auth.getProfile().then(profile => {
          setUser(profile);
          localStorage.setItem('pooling_user', JSON.stringify(profile));
        }).catch(() => {
          setUser(null);
          localStorage.removeItem('pooling_user');
        });
      } else {
        setUser(null);
        localStorage.removeItem('pooling_user');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
