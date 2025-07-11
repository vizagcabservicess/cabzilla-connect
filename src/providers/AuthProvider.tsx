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
        const storedToken = localStorage.getItem('auth_token');
        
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        
        // CRITICAL: Restore token to authAPI instance FIRST
        if (storedToken) {
          authAPI.setToken(storedToken);
          console.log('DEBUG: Restored authAPI.token from localStorage:', storedToken.substring(0, 20) + '...');
        }
        
        // Then verify token validity with server (skip in development)
        if (authAPI.isAuthenticated() && process.env.NODE_ENV !== 'development') {
          try {
            const userData = await authAPI.getCurrentUser();
            if (userData) {
              setUser(userData);
              console.log('DEBUG: Successfully validated token and updated user');
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            // Token is invalid, clear it (only in production)
            authAPI.logout();
            setUser(null);
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

  // Check token expiration and handle expired tokens
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  };

  // DEV PATCH: Always set a valid JWT and user in localStorage for testing
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Generate a fresh token with expiration 1 hour from now
      const currentTime = Math.floor(Date.now() / 1000);
      const expTime = currentTime + 3600; // 1 hour
      
      // Create a new token with fresh expiration
      const header = btoa(JSON.stringify({typ: "JWT", alg: "HS256"}));
      const payload = btoa(JSON.stringify({
        iat: currentTime,
        exp: expTime,
        user_id: 9,
        email: "joelnagireddy@gmail.com",
        role: "super_admin"
      }));
      const signature = "Ru5niRlUx_idt1ChI3l1wufFFMFFyu3yR6P8NGE_iTI"; // Keep same signature for dev
      const devToken = `${header}.${payload}.${signature}`;
      
      const devUser = {
        id: 9,
        name: "Super Admin",
        email: "joelnagireddy@gmail.com",
        phone: "+91 9876543210",
        role: "super_admin" as const,
        is_active: true
      };
      
      // Check if current token is expired or missing
      const currentToken = localStorage.getItem('auth_token');
      if (!currentToken || isTokenExpired(currentToken) || !user) {
        localStorage.setItem('auth_token', devToken);
        localStorage.setItem('user', JSON.stringify(devUser));
        authAPI.setToken(devToken);
        setUser(devUser);
        console.log('DEBUG: Dev mode - Set fresh token and user');
      }
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      console.log('DEBUG: Login response', response);
      
      // Check for token expiration in response
      if (response.token && isTokenExpired(response.token)) {
        throw new Error('Received expired token from server');
      }
      
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
      // Clear any invalid tokens
      authAPI.logout();
      setUser(null);
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
