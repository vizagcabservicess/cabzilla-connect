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
          console.log('DEBUG: Restored authAPI.token from localStorage:', storedToken.substring(0, 20) + '...');
        }
        
        // Always verify token validity with server (not just in production)
        if (authAPI.isAuthenticated()) {
          try {
            const userData = await authAPI.getCurrentUser();
            if (userData) {
              setUser(userData);
              // Update localStorage with fresh user data
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('DEBUG: Successfully validated token and updated user');
            } else {
              // Token is invalid, clear it
              authAPI.logout();
              setUser(null);
              console.log('DEBUG: Token validation failed - cleared invalid token');
            }
          } catch (error) {
            console.error('Token validation failed:', error);
            // Token is invalid, clear it
            authAPI.logout();
            setUser(null);
          }
        } else if (storedUser) {
          // If no token but stored user exists, clear the invalid state
          localStorage.removeItem('user');
          setUser(null);
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

  // Removed development mode code that was interfering with social login

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
      
      // Return the response for the LoginForm to access user data
      return response;
    } catch (error) {
      console.error('Login error:', error);
      // Clear any invalid tokens
      authAPI.logout();
      setUser(null);
      throw error;
    }
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
      authAPI.logout();
      setUser(null);
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
      authAPI.logout();
      setUser(null);
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
    isLoading: loading,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    login,
    signup: authAPI.signup, // Fixed method name
    socialLogin,
    socialSignup,
    socialSignupWithData,
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
