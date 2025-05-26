
import React, { createContext, useContext, useState, useEffect } from 'react';
import { poolingAuthAPI } from '@/services/api/poolingAuthAPI';
import { PoolingUser, PoolingAuthState } from '@/types/poolingAuth';

interface PoolingAuthContextType extends PoolingAuthState {
  login: (email: string, password: string, role: 'guest' | 'provider' | 'admin') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const PoolingAuthContext = createContext<PoolingAuthContextType | undefined>(undefined);

export function PoolingAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PoolingUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (poolingAuthAPI.isAuthenticated()) {
          const userData = await poolingAuthAPI.getCurrentUser();
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error initializing pooling auth:', error);
        poolingAuthAPI.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, role: 'guest' | 'provider' | 'admin') => {
    try {
      const response = await poolingAuthAPI.login({ email, password, role });
      if (response.user) {
        setUser(response.user);
      }
    } catch (error) {
      console.error('Pooling login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await poolingAuthAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Pooling logout error:', error);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await poolingAuthAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isGuest: user?.role === 'guest',
    isProvider: user?.role === 'provider',
    isAdmin: user?.role === 'admin',
    loading,
    login,
    logout,
    refreshUser
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
