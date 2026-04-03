/**
 * Push: super_admin (new bookings), driver (trip assignments).
 *
 * Production (EAS) Android:
 * - app.json: expo.extra.eas.projectId, android.googleServicesFile → google-services.json
 * - EAS: Project credentials → FCM (upload server key or use EAS linked Firebase)
 * - Physical device only; register-push-token must hit your API (EXPO_PUBLIC_API_BASE_URL in EAS secrets)
 *
 * Foreground: Notifications.setNotificationHandler (loaded from index via pushNotificationInit).
 * Background / killed: FCM delivers; tap opens app — use getLastNotificationResponseAsync (admin: AuthProvider; driver: DriverTripAssignmentOverlay).
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

/**
 * Android channel for assign-driver pushes — must match server Expo Push `channelId` (top-level).
 * Bumped from `trip_assignments` so existing installs pick up alarm / DND-bypass settings (channels are mostly immutable after creation).
 */
export const TRIP_ASSIGNMENT_CHANNEL_ID = 'trip_assignments_v2';

/** Admin/fuel/booking pushes use Expo top-level `channelId: 'default'` when no Android block is sent. */
export const DEFAULT_PUSH_CHANNEL_ID = 'default';

export async function ensureDefaultPushChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_PUSH_CHANNEL_ID, {
    name: 'General',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureTripAssignmentNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TRIP_ASSIGNMENT_CHANNEL_ID, {
    name: 'Trip assignments (urgent)',
    description:
      'New trip alerts. For sound on lock screen / when Do Not Disturb is on: allow this channel and disable battery restrictions for the app in system settings.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600, 200, 600],
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    /** May play / vibrate through DND when user grants “Alarms”-class behavior for this channel (OEM-dependent). */
    bypassDnd: true,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      flags: {
        enforceAudibility: true,
        requestHardwareAudioVideoSynchronization: false,
      },
    },
  });
}

// Foreground presentation (SDK 54+: do not use deprecated shouldShowAlert)
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    ...(Platform.OS === 'android'
      ? { priority: Notifications.AndroidNotificationPriority.MAX }
      : {}),
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
