import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getResolvedApiOrigin } from '../config';

export const EVENT_DUTY_LOCATION_TASK = 'EVENT_DUTY_LOCATION_TASK';
const STORE_KEY = 'eventDutyTrack';

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
  const running = await Location.hasStartedLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK);
  if (running) return;
  await Location.startLocationUpdatesAsync(EVENT_DUTY_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,
    distanceInterval: 40,
    deferredUpdatesInterval: 60000,
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
