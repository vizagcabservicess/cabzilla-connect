
import React, { createContext, useContext, useState, useEffect } from 'react';
import { PoolingUser, UserRole } from '@/types/pooling';

interface PoolingAuthContextType {
  user: PoolingUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string; role?: UserRole }) => Promise<PoolingUser>;
  register: (userData: { name: string; email: string; phone: string; password: string; role: UserRole }) => Promise<PoolingUser>;
  logout: () => void;
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
      // Mock login - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: PoolingUser = {
        id: 1,
        name: 'Test User',
        email: credentials.email,
        phone: '+91 9999999999',
        role: credentials.role || 'guest',
        isActive: true,
        rating: 4.5,
        totalRides: 10,
        walletBalance: 1000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUser(mockUser);
      localStorage.setItem('pooling_user', JSON.stringify(mockUser));
      return mockUser;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; phone: string; password: string; role: UserRole }): Promise<PoolingUser> => {
    setIsLoading(true);
    try {
      // Mock registration - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: PoolingUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        isActive: true,
        rating: 0,
        totalRides: 0,
        walletBalance: userData.role === 'provider' ? 500 : 0, // Initial balance for providers
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setUser(newUser);
      localStorage.setItem('pooling_user', JSON.stringify(newUser));
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pooling_user');
  };

  return (
    <PoolingAuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout
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
