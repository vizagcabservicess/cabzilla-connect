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
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { whenBackgroundLocationDisclosureSettled } from '../lib/backgroundLocationDisclosure';
import { isSuperAdminPushMuted } from '../lib/superAdminPushMute';

/**
 * Android channel for assign-driver pushes — must match server Expo Push `channelId`.
 * v4 is a new channel. Android keeps the sound of a channel forever after it is created,
 * so a silent v3 channel cannot be fixed in place.
 */
export const TRIP_ASSIGNMENT_CHANNEL_ID = 'trip_assignments_v4';
export const TRIP_ALARM_SOUND = 'trip_alarm.wav';

/** Admin/fuel/booking pushes use Expo top-level `channelId: 'default'` when no Android block is sent. */
export const DEFAULT_PUSH_CHANNEL_ID = 'default';

/** Lock-screen alerts when a manager asks the driver to end duty or tap In Parking. */
export const EVENT_DUTY_ALERT_CHANNEL_ID = 'event_duty_alerts_v1';

/** Event manager alerts when a duty starts, parks, or ends. */
export const EVENT_MANAGER_ALERT_CHANNEL_ID = 'event_manager_alerts_v1';

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

export async function ensureEventManagerAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(EVENT_MANAGER_ALERT_CHANNEL_ID, {
    name: 'Event updates',
    description: 'Trip started, in parking, and trip ended.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureEventDutyAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(EVENT_DUTY_ALERT_CHANNEL_ID, {
    name: 'Event duty alerts',
    description: 'End-duty and In Parking alerts. These stay on the lock screen while a duty is running.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 200, 500],
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
    enableLights: true,
    lightColor: '#f59e0b',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

const TRIP_LOCK_SCREEN_ALLOWED_KEY = 'trip_lock_screen_allowed_v3';
const TRIP_LOCK_SCREEN_PROMPT_AT_KEY = 'trip_lock_screen_prompt_at_v3';
const TRIP_LOCK_SCREEN_PROMPT_GAP_MS = 24 * 60 * 60 * 1000;

/** Android 14+ blocks lock-screen popups until the driver allows full-screen intents. */
export async function promptTripLockScreenAccess(): Promise<void> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 34) return;
  const allowed = await AsyncStorage.getItem(TRIP_LOCK_SCREEN_ALLOWED_KEY);
  if (allowed === '1') return;
  const lastPromptAt = Number((await AsyncStorage.getItem(TRIP_LOCK_SCREEN_PROMPT_AT_KEY)) ?? 0);
  if (Number.isFinite(lastPromptAt) && Date.now() - lastPromptAt < TRIP_LOCK_SCREEN_PROMPT_GAP_MS) {
    return;
  }
  await AsyncStorage.setItem(TRIP_LOCK_SCREEN_PROMPT_AT_KEY, String(Date.now()));
  Alert.alert(
    'Show new trips on the lock screen',
    'Android blocks the Accept / Decline popup while the phone is locked until you allow full-screen notifications for Vizag Taxi Hub.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Allow',
        onPress: () => {
          void AsyncStorage.setItem(TRIP_LOCK_SCREEN_ALLOWED_KEY, '1');
          void Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT', [
            { key: 'android.provider.extra.APP_PACKAGE', value: 'com.vizagtaxihub.app' },
          ]).catch(() => {
            void Linking.openSettings().catch(() => undefined);
          });
        },
      },
    ]
  );
}

export async function ensureTripAssignmentNotificationChannel(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('trip_assigned', [
    {
      identifier: 'accept_trip',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline_trip',
      buttonTitle: 'Decline',
      options: { opensAppToForeground: true },
    },
  ]);
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(TRIP_ASSIGNMENT_CHANNEL_ID, {
    name: 'Trip assignments (urgent)',
    description:
      'New trip alerts. For sound on lock screen / when Do Not Disturb is on: allow this channel and disable battery restrictions for the app in system settings.',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 600, 200, 600, 200, 600],
    sound: TRIP_ALARM_SOUND,
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
function isOfficePush(notification: Notifications.Notification): boolean {
  const data = notification.request.content.data as Record<string, unknown> | undefined;
  const type = typeof data?.type === 'string' ? data.type : '';
  return type === 'duty_update' || type === 'new_booking' || type === 'driver_fuel_refill' || type === 'event_duty_update' || type === 'vendor_trip_update';
}

Notifications.setNotificationHandler({
  handleNotification: async (notification): Promise<Notifications.NotificationBehavior> => {
    const quiet = isOfficePush(notification) && isSuperAdminPushMuted();
    return {
      shouldPlaySound: !quiet,
      shouldSetBadge: !quiet,
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      ...(Platform.OS === 'android'
        ? {
            priority: quiet
              ? Notifications.AndroidNotificationPriority.MIN
              : Notifications.AndroidNotificationPriority.MAX,
          }
        : {}),
    };
  },
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

  await whenBackgroundLocationDisclosureSettled();
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
  if (Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient') {
    return null;
  }
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
