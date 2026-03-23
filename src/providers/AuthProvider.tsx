import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, User, AuthResponse, RegisterRequest } from '@/services/api/authAPI';
import { socialAuthService } from '@/services/socialAuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (userData: RegisterRequest) => Promise<AuthResponse>;
  socialLogin: (provider: 'google' | 'facebook') => Promise<AuthResponse>;
  socialSignup: (provider: 'google' | 'facebook', phone?: string) => Promise<AuthResponse>;
  socialSignupWithData: (socialData: any) => Promise<AuthResponse>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
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
        
        // CRITICAL: Restore token to authAPI instance FIRST
        if (storedToken) {
          authAPI.setToken(storedToken);
        }
        
        // Always verify token validity with server (not just in production)
        if (authAPI.isAuthenticated()) {
          try {
            const userData = await authAPI.getCurrentUser();
            if (userData) {
              setUser(userData);
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(userData));
            } else {
              // Token is invalid, clear it
              authAPI.logout();
              setUser(null);
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            
            // Check if it's a network error - don't logout for network issues
            if (error instanceof Error && (
              error.message.includes('Network Error') ||
              error.message.includes('ERR_NETWORK') ||
              error.message.includes('Failed to fetch') ||
              error.message.includes('net::ERR_')
            )) {
              console.log('Network error during token validation - keeping user logged in');
              // Keep the user logged in with stored data
              if (storedUser) {
                setUser(JSON.parse(storedUser));
              }
            } else {
              // Only logout for actual authentication errors, not network errors
              console.log('Authentication error - logging out user');
              authAPI.logout();
              setUser(null);
            }
          }
        } else if (storedUser) {
          // If no token but stored user exists, clear the invalid state
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Only clear token for authentication errors, not network errors
        if (!(error instanceof Error && (
          error.message.includes('Network Error') ||
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('Failed to fetch')
        ))) {
          // Clear invalid token only for auth errors
          authAPI.logout();
        }
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

  // Removed development mode code that was interfering with social login

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      
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
      return response;
    } catch (error) {
      console.error('Login error:', error);
      
      // Only clear tokens for authentication errors, not network errors
      if (error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('ERR_NETWORK') ||
        error.message.includes('Failed to fetch')
      )) {
        console.log('Network error during login - not clearing tokens');
      } else {
        // Clear any invalid tokens for actual auth errors
        authAPI.logout();
        setUser(null);
      }
      throw error;
    }
  };

  const signup = async (userData: RegisterRequest) => {
    const response = await authAPI.signup(userData);
    if (response.success && response.token && response.user) {
      setUser(response.user);
      authAPI.setToken(response.token);
    }
    return response;
  };

  const socialLogin = async (provider: 'google' | 'facebook') => {
    try {
      let socialUser;
      
      if (provider === 'google') {
        socialUser = await socialAuthService.signInWithGoogle();
      } else if (provider === 'facebook') {
        socialUser = await socialAuthService.signInWithFacebook();
      } else {
        throw new Error('Unsupported provider');
      }

      // Authenticate with backend
      const response = await socialAuthService.authenticateWithBackend(socialUser);
      
      if (response.user) {
        setUser(response.user);
      }
      if (response.token) {
        authAPI.setToken(response.token);
      }
      
      console.log('DEBUG: Social login successful', { provider, user: response.user });
      
      // Return the response for the LoginForm to access user data
      return response;
    } catch (error) {
      console.error('Social login error:', error);
      
      // Only logout for authentication errors, not network errors
      if (!(error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('ERR_NETWORK') ||
        error.message.includes('Failed to fetch')
      ))) {
        authAPI.logout();
        setUser(null);
      }
      throw error;
    }
  };

  const socialSignup = async (provider: 'google' | 'facebook', phone?: string) => {
    try {
      let socialUser;
      
      if (provider === 'google') {
        socialUser = await socialAuthService.signInWithGoogle();
      } else if (provider === 'facebook') {
        socialUser = await socialAuthService.signInWithFacebook();
      } else {
        throw new Error('Unsupported provider');
      }

      // Map the fields correctly: 'id' should be 'providerId'
      const signupData = {
        provider: socialUser.provider,
        providerId: socialUser.id, // Map id to providerId
        email: socialUser.email,
        name: socialUser.name,
        picture: socialUser.picture,
        phone: phone || ''
      };

      // Sign up with backend
      const response = await authAPI.socialSignup(signupData);
      
      if (response.user) {
        setUser(response.user);
      }
      if (response.token) {
        authAPI.setToken(response.token);
      }
      
      // Return the response for the SignupForm to access user data
      return response;
    } catch (error) {
      console.error('Social signup error:', error);
      
      // Only logout for authentication errors, not network errors
      if (!(error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('ERR_NETWORK') ||
        error.message.includes('Failed to fetch')
      ))) {
        authAPI.logout();
        setUser(null);
      }
      throw error;
    }
  };

  // New method to handle social signup with pre-existing data
  const socialSignupWithData = async (socialData: any) => {
    try {
      // Map the fields correctly: 'id' should be 'providerId'
      const mappedData = {
        provider: socialData.provider,
        providerId: socialData.providerId || socialData.id, // Use providerId if available, fallback to id
        email: socialData.email,
        name: socialData.name,
        picture: socialData.picture,
        phone: socialData.phone || ''
      };
      
      // Sign up with backend using the mapped social data
      const response = await authAPI.socialSignup(mappedData);
      
      if (response.user) {
        setUser(response.user);
      }
      if (response.token) {
        authAPI.setToken(response.token);
      }
      
      // Return the response for the SignupForm to access user data
      return response;
    } catch (error) {
      console.error('Social signup with data error:', error);
      
      // Only logout for authentication errors, not network errors
      if (!(error instanceof Error && (
        error.message.includes('Network Error') ||
        error.message.includes('ERR_NETWORK') ||
        error.message.includes('Failed to fetch')
      ))) {
        authAPI.logout();
        setUser(null);
      }
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; phone?: string }) => {
    const response = await authAPI.updateProfile(data);
    if (response.success && response.user) {
      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
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
    isLoading: loading,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    login,
    signup,
    socialLogin,
    socialSignup,
    socialSignupWithData,
    updateProfile,
    logout,
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
