/**
 * Push notification service for super_admin users.
 * Registers device token with backend and handles incoming notifications.
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permissions and get push token. Returns null on web, simulator, or denied.
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  return tokenData?.data ?? null;
}

/**
 *
 * Set up notification listeners (e.g. when user taps notification).
 * Returns unsubscribe function.
 */
export function addNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onTap?: (response: Notifications.NotificationResponse) => void
): () => void {
  const subReceived = onReceived
    ? Notifications.addNotificationReceivedListener(onReceived)
    : null;
  const subTap = onTap
    ? Notifications.addNotificationResponseReceivedListener(onTap)
    : null;

  return () => {
    subReceived?.remove();
    subTap?.remove();
  };
}
