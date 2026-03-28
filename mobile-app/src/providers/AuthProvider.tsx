/**
 * Auth context - mirrors web app AuthProvider
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  authAPI,
  User,
  AuthResponse,
  RegisterRequest,
  SocialLoginRequest,
} from '../services/authAPI';
import {
  getPushToken,
  addNotificationListeners,
  ensureTripAssignmentNotificationChannel,
} from '../services/pushNotificationService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (userData: RegisterRequest) => Promise<AuthResponse>;
  socialLogin: (socialData: SocialLoginRequest) => Promise<AuthResponse>;
  socialSignup: (socialData: SocialLoginRequest & { phone?: string }) => Promise<AuthResponse>;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await authAPI.getStoredUser();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const authenticated = await authAPI.isAuthenticated();
        if (!cancelled && authenticated) {
          const u = await authAPI.getCurrentUser();
          if (!cancelled) setUser(u || (await authAPI.getStoredUser()));
        } else if (!cancelled) {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Register push: super_admin (new bookings), driver (trip assignments)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (user?.role !== 'super_admin' && user?.role !== 'driver') return;

    let unsubscribe: (() => void) | null = null;
    const setup = async () => {
      const pushToken = await getPushToken();
      if (!pushToken) return;

      if (user?.role === 'driver') {
        await ensureTripAssignmentNotificationChannel();
      }

      await authAPI.registerPushToken(pushToken, Platform.OS);

      if (user?.role === 'super_admin') {
        unsubscribe = addNotificationListeners(undefined, () => {
          // Tapped; navigation handled elsewhere if needed
        });
      }
    };
    setup();
    return () => {
      unsubscribe?.();
    };
  }, [user?.id, user?.role]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  }, []);

  const signup = useCallback(async (userData: RegisterRequest) => {
    return authAPI.signup(userData);
  }, []);

  const socialLogin = useCallback(async (socialData: SocialLoginRequest) => {
    const response = await authAPI.socialLogin(socialData);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  }, []);

  const socialSignup = useCallback(
    async (socialData: SocialLoginRequest & { phone?: string }) => {
      const response = await authAPI.socialSignup(socialData);
      if (response.success && response.user) {
        setUser(response.user);
      }
      return response;
    },
    []
  );

  const updateProfile = useCallback(async (data: { name?: string; phone?: string }) => {
    const response = await authAPI.updateProfile(data);
    if (response.success && response.user) {
      setUser(response.user);
    }
    return response;
  }, []);

  const logout = useCallback(async () => {
    await authAPI.logout();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    socialLogin,
    socialSignup,
    updateProfile,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
