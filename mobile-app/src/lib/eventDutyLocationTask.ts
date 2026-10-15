import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { getResolvedApiOrigin } from '../config';
import { EVENT_DUTY_ALERT_CHANNEL_ID, ensureEventDutyAlertChannel } from '../services/pushNotificationService';

export const EVENT_DUTY_LOCATION_TASK = 'EVENT_DUTY_LOCATION_TASK';
const STORE_KEY = 'eventDutyTrack';
const SCREEN_KEY = 'eventDutyScreenOpen';
const SEEN_KEY = 'eventDutyNoticeSeen';

type TrackStore = {
  token: string;
  dutyIds: number[];
  apiOrigin: string;
};

async function readStore(): Promise<TrackStore | null> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TrackStore;
    if (!parsed?.token || !Array.isArray(parsed.dutyIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function pingDuty(store: TrackStore, loc: Location.LocationObject): Promise<number[]> {
  const remaining: number[] = [];
  for (const dutyId of store.dutyIds) {
    try {
      const res = await fetch(`${store.apiOrigin}/api/events/driver-public.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Driver-Token': store.token,
        },
        body: JSON.stringify({
          token: store.token,
          action: 'ping_gps',
          dutyId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          clientId: 'vth-app',
          claim: true,
        }),
      });
      const data = (await res.json()) as { success?: boolean; status?: string };
      if (data?.success || data?.status === 'success') {
        remaining.push(dutyId);
      }
    } catch {
      remaining.push(dutyId);
    }
  }
  return remaining;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(EVENT_DUTY_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations;
    const loc = locations?.[locations.length - 1];
    if (!loc) return;
    const store = await readStore();
    if (!store?.dutyIds.length) {
      await stopEventDutyTracking();
      return;
    }
    const remaining = await pingDuty(store, loc);
    await notifyDutyPrompts(store.token, store.apiOrigin);
    if (remaining.length === 0) {
      await stopEventDutyTracking();
      return;
    }
    if (remaining.length !== store.dutyIds.length) {
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ ...store, dutyIds: remaining }));
    }
  });
}

export async function startEventDutyTracking(token: string, dutyIds: number[]): Promise<void> {
  if (Platform.OS === 'web' || !token || dutyIds.length === 0) return;
  const apiOrigin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ token, dutyIds, apiOrigin }));
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return;
  await Location.requestBackgroundPermissionsAsync().catch(() => undefined);
  await Notifications.requestPermissionsAsync().catch(() => undefined);
  await ensureEventDutyAlertChannel().catch(() => undefined);
  const running = await Location.hasStartedLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK);
  if (running) {
    await Location.stopLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 15000,
    distanceInterval: 15,
    deferredUpdatesInterval: 15000,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'VTH event duty',
      notificationBody: 'Sharing location with VTH. You can lock the screen.',
      notificationColor: '#2563eb',
    },
  });
}

export async function stopEventDutyTracking(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
  if (Platform.OS === 'web') return;
  const running = await Location.hasStartedLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK);
  }
}

export async function syncEventDutyTracking(token: string, dutyIds: number[]): Promise<void> {
  if (dutyIds.length === 0) {
    await stopEventDutyTracking();
    return;
  }
  await startEventDutyTracking(token, dutyIds);
}

type DutyNotice = {
  id: number;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  endRequestNonce?: string | null;
  dutyPlace?: string | null;
  parkingPromptNonce?: string | null;
  openingAt?: string | null;
  closingAt?: string | null;
  status?: string;
};

export async function markEventDutyScreenOpen(open: boolean): Promise<void> {
  if (open) await AsyncStorage.setItem(SCREEN_KEY, '1');
  else await AsyncStorage.removeItem(SCREEN_KEY);
}

export async function deliverDutyAlerts(token: string, notices: DutyNotice[]): Promise<void> {
  if (Platform.OS === 'web' || !token || notices.length === 0) return;
  const current = await Notifications.getPermissionsAsync().catch(() => null);
  if (current && !current.granted) return;
  const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
  const seen = new Set<string>(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);
  let changed = false;
  for (const notice of notices) {
    const openDuty = notice.status === 'in_progress' && Boolean(notice.openingAt) && !notice.closingAt;
    if (openDuty && notice.parkingPromptNonce && notice.dutyPlace !== 'parking') {
      const key = `${notice.id}:park:${notice.parkingPromptNonce}`;
      if (!seen.has(key)) {
        try {
          await presentDutyAlert(token, 'You are on a trip', 'When you drop the guest, open the duty and tap In Parking.');
          seen.add(key);
          changed = true;
        } catch {
          /* try again on the next check, including after the screen locks */
        }
      }
    }
    if (notice.endRequestedAt && !notice.endRequestSeenAt && notice.endRequestNonce) {
      const key = `${notice.id}:end:${notice.endRequestNonce}`;
      if (!seen.has(key)) {
        try {
          await presentDutyAlert(token, 'Please end your duty', 'The event manager asked you to end this trip. Open the duty and tap End Duty.');
          seen.add(key);
          changed = true;
        } catch {
          /* try again on the next check, including after the screen locks */
        }
      }
    }
  }
  if (changed) {
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-40)));
  }
}

async function notifyDutyPrompts(token: string, apiOrigin: string): Promise<void> {
  let notices: DutyNotice[] = [];
  try {
    const res = await fetch(`${apiOrigin}/api/events/driver-public.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Event-Driver-Token': token },
      body: JSON.stringify({ token, action: 'end_notices' }),
    });
    const data = (await res.json()) as { notices?: DutyNotice[] };
    notices = data.notices ?? [];
  } catch {
    return;
  }
  await deliverDutyAlerts(token, notices);
}

async function presentDutyAlert(token: string, title: string, body: string): Promise<void> {
  await ensureEventDutyAlertChannel().catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      sticky: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
      interruptionLevel: 'timeSensitive',
      vibrate: [0, 500, 200, 500],
      data: { type: 'event_duty', token },
      ...(Platform.OS === 'android' ? { channelId: EVENT_DUTY_ALERT_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export async function resumeEventDutyTrackingIfNeeded(): Promise<void> {
  const store = await readStore();
  if (!store?.dutyIds.length) return;
  const running = Platform.OS === 'web'
    ? false
    : await Location.hasStartedLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK).catch(() => false);
  if (!running) {
    await startEventDutyTracking(store.token, store.dutyIds);
  }
}
