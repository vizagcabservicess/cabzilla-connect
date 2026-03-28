/**
 * Push: super_admin (new bookings), driver (trip assignments).
 * Production (EAS) builds require expo.extra.eas.projectId + FCM credentials in EAS for Android.
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
 * EAS project ID from app config (required for getExpoPushTokenAsync in release builds).
 */
export function getExpoPushProjectId(): string | undefined {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = Constants.easConfig?.projectId;
  const id = (fromExpoConfig ?? fromEasConfig)?.trim();
  return id || undefined;
}

let globalListenersInstalled = false;

/**
 * Console logging for received / tapped notifications (safe to call once at app start).
 */
export function installGlobalPushNotificationLogger(): void {
  if (Platform.OS === 'web' || globalListenersInstalled) return;
  globalListenersInstalled = true;

  Notifications.addNotificationReceivedListener((notification) => {
    console.log('[push] Notification received:', notification.request.identifier, notification.request.content);
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[push] Notification tapped:', response.notification.request.identifier, response.actionIdentifier);
  });
}

/**
 * Request notification permission (call on app start for early grant + diagnostics).
 * @returns Final permission status, or null on web / unsupported.
 */
export async function registerForPushNotificationsAsync(): Promise<Notifications.PermissionStatus | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return existing;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[push] Notification permission denied — status:', status);
  }
  return status;
}

/**
 * Request permissions and get Expo push token. Returns null on web, simulator, denied, or missing projectId.
 * Uses the same projectId resolution as production EAS builds.
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) {
    console.warn('[push] Not a physical device — Expo push token unavailable (simulator).');
    return null;
  }

  const permission = await registerForPushNotificationsAsync();
  if (permission !== 'granted') {
    console.warn('[push] Notification permission not granted — remote push disabled. Status:', permission);
    return null;
  }

  const projectId = getExpoPushProjectId();
  if (!projectId) {
    console.error(
      '[push] MISSING projectId — set expo.extra.eas.projectId in app.json and rebuild. ' +
        'Constants.expoConfig?.extra?.eas?.projectId is undefined in this build.'
    );
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData?.data ?? null;
    if (!token) {
      console.error(
        '[push] getExpoPushTokenAsync returned empty token — verify EAS FCM (Android) / APNs (iOS) credentials.'
      );
    } else {
      console.log('[push] Expo push token obtained (prefix):', token.slice(0, 24) + '…');
    }
    return token;
  } catch (e) {
    console.error('[push] getExpoPushTokenAsync failed:', e);
    return null;
  }
}

/**
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
  const subTap = onTap ? Notifications.addNotificationResponseReceivedListener(onTap) : null;

  return () => {
    subReceived?.remove();
    subTap?.remove();
  };
}
