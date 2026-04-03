/**
 * Auth context - mirrors web app AuthProvider
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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
  ensureDefaultPushChannel,
} from '../services/pushNotificationService';
import { navigationRef } from '../navigation/navigationRef';

function navigateAdminFromNotificationData(data: Record<string, unknown> | undefined): void {
  const t = data?.type;
  if (t !== 'driver_fuel_refill' && t !== 'new_booking') return;

  let tries = 0;
  const go = () => {
    if (!navigationRef.isReady()) {
      if (tries++ < 60) setTimeout(go, 100);
      return;
    }
    if (t === 'driver_fuel_refill') {
      navigationRef.navigate('AdminFuel' as never);
    } else if (t === 'new_booking') {
      navigationRef.navigate('AdminBookingsList' as never);
    }
  };
  go();
}

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
    const token = await authAPI.getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    const u = await authAPI.getCurrentUser();
    if (u) {
      setUser(u);
      return;
    }
    const stillToken = await authAPI.getStoredToken();
    if (!stillToken) {
      setUser(null);
      return;
    }
    setUser(await authAPI.getStoredUser());
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

  // Register push: super_admin + admin (bookings + driver fuel uploads), driver (trip assignments)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (user?.role !== 'super_admin' && user?.role !== 'admin' && user?.role !== 'driver') return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    if (user?.role === 'super_admin' || user?.role === 'admin') {
      unsubscribe = addNotificationListeners(undefined, (response) => {
        const data = response.notification.request.content.data as Record<string, unknown> | undefined;
        navigateAdminFromNotificationData(data);
      });
    }

    const registerWithRetries = async () => {
      if (user?.role === 'driver') {
        await ensureTripAssignmentNotificationChannel();
      }
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        await ensureDefaultPushChannel();
      }

      const scheduleMs = [0, 2000, 8000, 20000];
      let registered = false;
      for (let i = 0; i < scheduleMs.length; i++) {
        if (cancelled) return;
        const wait = scheduleMs[i]! - (i > 0 ? scheduleMs[i - 1]! : 0);
        if (wait > 0) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, wait);
          });
        }
        if (cancelled) return;
        const pushToken = await getPushToken();
        if (!pushToken) continue;
        const ok = await authAPI.registerPushToken(pushToken, Platform.OS);
        if (ok) {
          registered = true;
          break;
        }
      }
      if (!cancelled && !registered) {
        console.warn(
          '[push] Token registration did not succeed. Needs: physical device, notification permission, EAS FCM credentials, ' +
            'EXPO_PUBLIC_API_BASE_URL, deployed register-push-token.php, and push_tokens table on the server. ' +
            'Remote push does not work in Expo Go (SDK 53+).'
        );
      }
    };

    void registerWithRetries();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user?.id, user?.role]);

  // Cold start / killed state: user tapped a notification, then Android/iOS launched the app.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (user?.role !== 'super_admin' && user?.role !== 'admin') return;

    let cancelled = false;
    void Notifications.getLastNotificationResponseAsync().then((res) => {
      if (cancelled || !res?.notification) return;
      const data = res.notification.request.content.data as Record<string, unknown> | undefined;
      navigateAdminFromNotificationData(data);
    });

    return () => {
      cancelled = true;
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
