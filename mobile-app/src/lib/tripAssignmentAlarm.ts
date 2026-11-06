/**
 * Lock-screen alarm for a newly assigned trip.
 * The remote push plays trip_alarm.wav immediately. If the app process is still alive
 * while the phone is locked, this schedules more chimes until the driver opens the trip.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import {
  ensureTripAssignmentNotificationChannel,
  TRIP_ASSIGNMENT_CHANNEL_ID,
} from '../services/pushNotificationService';

export const TRIP_ASSIGNMENT_ALARM_TASK = 'TRIP_ASSIGNMENT_ALARM_TASK';
export const TRIP_ALARM_SOUND = 'trip_alarm.wav';
export const PENDING_LOCK_TRIP_KEY = 'pending_lock_screen_trip';

const PENDING_LOCK_TRIP_MS = 20 * 60 * 1000;

const CHIME_COUNT = 8;
const CHIME_GAP_SECONDS = 12;

type AlarmData = {
  type?: unknown;
  alarm?: unknown;
  bookingId?: unknown;
  bookingNumber?: unknown;
};

function alarmData(notification: Notifications.Notification | undefined): AlarmData | null {
  const raw = notification?.request?.content?.data;
  const merged: AlarmData =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as AlarmData) } : {};
  const trigger = notification?.request?.trigger as
    | { remoteMessage?: { data?: Record<string, unknown> }; payload?: Record<string, unknown> }
    | undefined;
  const remote = trigger?.remoteMessage?.data;
  if (remote && typeof remote === 'object') {
    Object.assign(merged, remote);
  }
  const payload = trigger?.payload;
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (merged[key as keyof AlarmData] === undefined) {
        merged[key as keyof AlarmData] = value;
      }
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

export async function stopTripAssignmentChimes(dismissPresented = true): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((item) => (item.content.data as AlarmData | undefined)?.alarm === 'chime')
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined))
  );
  if (!dismissPresented) return;
  const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
  await Promise.all(
    presented
      .filter((item) => {
        const data = item.request.content.data as AlarmData | undefined;
        return data?.type === 'trip_assigned' || data?.alarm === 'chime';
      })
      .map((item) => Notifications.dismissNotificationAsync(item.request.identifier).catch(() => undefined))
  );
}

export async function startTripAssignmentChimes(
  title: string,
  body: string,
  bookingId: string,
  bookingNumber: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureTripAssignmentNotificationChannel();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const already = scheduled.some((item) => {
    const data = item.content.data as AlarmData | undefined;
    return data?.alarm === 'chime' && String(data.bookingNumber ?? '') === bookingNumber;
  });
  if (already) return;

  for (let step = 0; step < CHIME_COUNT; step += 1) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: TRIP_ALARM_SOUND,
        data: {
          type: 'trip_chime',
          alarm: 'chime',
          bookingId,
          bookingNumber,
        },
        ...(Platform.OS === 'android'
          ? {
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 700, 250, 700, 250, 700],
            }
          : {}),
      },
      trigger: {
        type: SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: step === 0 ? 1 : CHIME_GAP_SECONDS * step,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: TRIP_ASSIGNMENT_CHANNEL_ID } : {}),
      },
    });
  }
}

export type PendingLockTrip = {
  bookingId: string;
  bookingNumber: string;
  title: string;
  body: string;
  at: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Headless FCM payload keeps custom fields in `data.dataString`, not on an Expo notification. */
export function readTripAssignmentTask(data: unknown): PendingLockTrip | null {
  const root = asRecord(data);
  if (!root) return null;
  const bags: Record<string, unknown>[] = [];
  const nested = asRecord(root.data);
  if (nested) {
    bags.push(nested);
    if (typeof nested.dataString === 'string') {
      try {
        const parsed = asRecord(JSON.parse(nested.dataString));
        if (parsed) bags.push(parsed);
      } catch {
        // Ignore a non-JSON data string.
      }
    }
  }
  const notification = root.notification;
  const fromExpo = alarmData(notification as Notifications.Notification | undefined);
  if (fromExpo) bags.push(fromExpo as Record<string, unknown>);
  const remote = asRecord(notification);
  const remoteData = asRecord(remote?.data);
  if (remoteData) bags.push(remoteData);

  const merged: Record<string, unknown> = {};
  for (const bag of bags) Object.assign(merged, bag);
  if (String(merged.type ?? '') !== 'trip_assigned' || String(merged.alarm ?? '') === 'chime') return null;

  const bookingId = String(merged.bookingId ?? '');
  const bookingNumber = String(merged.bookingNumber ?? '');
  if (bookingId === '' && bookingNumber === '') return null;
  const title = String(merged.title ?? 'New trip assigned');
  const body = String(merged.message ?? merged.body ?? 'Tap View trip');
  return { bookingId, bookingNumber, title, body, at: Date.now() };
}

export async function savePendingLockTrip(trip: PendingLockTrip): Promise<void> {
  await AsyncStorage.setItem(PENDING_LOCK_TRIP_KEY, JSON.stringify(trip));
}

export async function readPendingLockTrip(): Promise<PendingLockTrip | null> {
  const raw = await AsyncStorage.getItem(PENDING_LOCK_TRIP_KEY);
  if (!raw) return null;
  try {
    const parsed = asRecord(JSON.parse(raw));
    if (!parsed) return null;
    const at = Number(parsed.at ?? 0);
    if (!Number.isFinite(at) || Date.now() - at > PENDING_LOCK_TRIP_MS) {
      await AsyncStorage.removeItem(PENDING_LOCK_TRIP_KEY);
      return null;
    }
    const bookingId = String(parsed.bookingId ?? '');
    const bookingNumber = String(parsed.bookingNumber ?? '');
    if (bookingId === '' && bookingNumber === '') return null;
    return {
      bookingId,
      bookingNumber,
      title: String(parsed.title ?? 'New trip assigned'),
      body: String(parsed.body ?? 'Tap View trip'),
      at,
    };
  } catch {
    return null;
  }
}

export async function clearPendingLockTrip(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_LOCK_TRIP_KEY).catch(() => undefined);
}

/** Posted by the app so Android can open it over the lock screen. A system-drawn push cannot. */
export async function presentLockScreenTrip(trip: PendingLockTrip): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureTripAssignmentNotificationChannel();
  await savePendingLockTrip(trip);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: trip.title,
      body: trip.body,
      sound: TRIP_ALARM_SOUND,
      categoryIdentifier: 'trip_assigned',
      data: {
        type: 'trip_assigned',
        bookingId: trip.bookingId,
        bookingNumber: trip.bookingNumber,
      },
      ...(Platform.OS === 'android'
        ? { priority: Notifications.AndroidNotificationPriority.MAX }
        : {}),
    },
    trigger: { channelId: TRIP_ASSIGNMENT_CHANNEL_ID },
  });
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(TRIP_ASSIGNMENT_ALARM_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const trip = readTripAssignmentTask(data);
    if (!trip) return;
    const recent = await readPendingLockTrip();
    if (
      recent &&
      recent.bookingNumber === trip.bookingNumber &&
      Date.now() - recent.at < 15000
    ) {
      return;
    }
    await presentLockScreenTrip(trip);
    await startTripAssignmentChimes(trip.title, trip.body, trip.bookingId, trip.bookingNumber);
  });
}

export async function registerTripAssignmentAlarmTask(): Promise<void> {
  if (Platform.OS === 'web') return;
  const registered = await TaskManager.isTaskRegisteredAsync(TRIP_ASSIGNMENT_ALARM_TASK).catch(() => false);
  if (registered) return;
  await Notifications.registerTaskAsync(TRIP_ASSIGNMENT_ALARM_TASK);
}
