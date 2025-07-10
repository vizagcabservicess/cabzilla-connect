import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, User } from '@/services/api/authAPI';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to rehydrate user from localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Restore token to authAPI instance
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
          authAPI.setToken(storedToken);
          console.log('DEBUG: Restored authAPI.token from localStorage:', storedToken);
        }
        if (authAPI.isAuthenticated()) {
          const userData = await authAPI.getCurrentUser();
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid token
        authAPI.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // DEV PATCH: Always set a valid JWT and user in localStorage for testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const devToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTIxNTAzNzAsImV4cCI6MTc1MjE1Mzk3MCwidXNlcl9pZCI6OSwiZW1haWwiOiJqb2VsbmFnaXJlZGR5QGdtYWlsLmNvbSIsInJvbGUiOiJzdXBlcl9hZG1pbiJ9.Ru5niRlUx_idt1ChI3l1wufFFMFFyu3yR6P8NGE_iTI';
      const devUser = {
        id: 9,
        name: "Super Admin",
        email: "joelnagireddy@gmail.com",
        phone: "+91 9876543210",
        role: "super_admin" as const,
        is_active: true
      };
      
      // Only set if not already authenticated
      if (!isAuthenticated) {
        localStorage.setItem('auth_token', devToken);
        localStorage.setItem('user', JSON.stringify(devUser));
        authAPI.setToken(devToken);
        setUser(devUser);
        console.log('DEBUG: Dev mode - Set token and user');
      }
    }
  }, [isAuthenticated]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      console.log('DEBUG: Login response', response);
      if (response.user) {
        setUser(response.user);
      }
      if (response.token) {
        authAPI.setToken(response.token);
      }
      // Debug: Check localStorage after login
      console.log('DEBUG: localStorage["auth_token"] after login:', localStorage.getItem('auth_token'));
      console.log('DEBUG: localStorage["user"] after login:', localStorage.getItem('user'));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isDriver: user?.role === 'driver',
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
