/**
 * Push: super_admin (new bookings), driver (trip assignments).
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/** Android channel for assign-driver pushes — must match server Expo payload `android.channelId`. */
export const TRIP_ASSIGNMENT_CHANNEL_ID = 'trip_assignments';

export async function ensureTripAssignmentNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TRIP_ASSIGNMENT_CHANNEL_ID, {
    name: 'Trip assignments',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600],
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

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
  if (final !== 'granted') {
    console.warn('[push] Notification permission not granted — remote push disabled.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      '[push] Missing expo.extra.eas.projectId — cannot get Expo push token. ' +
        'Fix app.json extra.eas.projectId. Android store/dev builds also need FCM in EAS. See mobile-app/docs/PUSH_NOTIFICATIONS.md'
    );
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data ?? null;
    if (!token) {
      console.warn('[push] getExpoPushTokenAsync returned empty — check EAS FCM (Android) / APNs (iOS).');
    }
    return token;
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed:', e);
    return null;
  }
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
