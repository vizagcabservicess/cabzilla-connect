/**
 * Hook to register push notifications when super_admin is logged in.
 * Call from AuthProvider or root layout.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { getPushToken, addNotificationListeners } from '../services/pushNotificationService';
import { authAPI } from '../services/authAPI';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export function useSuperAdminPushNotifications(navigation?: NativeStackNavigationProp<RootStackParamList>) {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (user?.role !== 'super_admin') {
      registeredRef.current = false;
      return;
    }

    let cancelled = false;

    const register = async () => {
      const token = await getPushToken();
      if (cancelled || !token) return;
      const ok = await authAPI.registerPushToken(token, Platform.OS);
      if (!cancelled && ok) registeredRef.current = true;
    };

    register();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const unsubscribe = addNotificationListeners(undefined, (response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'new_booking' && data?.bookingNumber && navigation) {
        navigation.navigate('AdminBookingsList');
      }
    });

    return unsubscribe;
  }, [navigation]);
}
