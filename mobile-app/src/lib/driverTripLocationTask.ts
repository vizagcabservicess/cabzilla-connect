import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getResolvedApiOrigin } from '../config';
import { authAPI } from '../services/authAPI';

export const DRIVER_TRIP_LOCATION_TASK = 'DRIVER_TRIP_LOCATION_TASK';
const STORE_KEY = 'driverTripTrack';

type TrackStore = {
  token: string;
  bookingId: number;
  apiOrigin: string;
  mode: 'background' | 'foreground';
};

async function readStore(): Promise<TrackStore | null> {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TrackStore;
    if (!parsed?.token || !parsed.bookingId) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function postLocation(store: TrackStore, loc: Location.LocationObject): Promise<number> {
  const res = await fetch(`${store.apiOrigin}/api/driver/location-updates.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${store.token}`,
    },
    body: JSON.stringify({
      bookingId: store.bookingId,
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    }),
  });
  return res.status;
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask(DRIVER_TRIP_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data) return;
    const locations = (data as { locations?: Location.LocationObject[] }).locations;
    const loc = locations?.[locations.length - 1];
    if (!loc) return;
    const store = await readStore();
    if (!store || store.mode !== 'background') {
      await stopDriverTripTracking();
      return;
    }
    try {
      const status = await postLocation(store, loc);
      if (status === 403 || status === 409) {
        await stopDriverTripTracking();
      }
    } catch {
      /* try again on the next fix */
    }
  });
}

export async function readActiveDriverTripTracking(): Promise<TrackStore | null> {
  return readStore();
}

export async function startDriverTripTracking(bookingId: number): Promise<'background' | 'foreground'> {
  const token = await authAPI.getStoredToken();
  if (!token) throw new Error('Sign in again to share your location.');
  const apiOrigin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== 'granted') {
      throw new Error('Allow location so the office can see this trip.');
    }
  }

  const background = Platform.OS === 'web'
    ? { status: 'denied' as const }
    : await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));

  if (background.status !== 'granted' || Platform.OS === 'web') {
    await stopBackgroundUpdates();
    const foregroundStore: TrackStore = { token, bookingId, apiOrigin, mode: 'foreground' };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(foregroundStore));
    return 'foreground';
  }

  const backgroundStore: TrackStore = { token, bookingId, apiOrigin, mode: 'background' };
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(backgroundStore));
  const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 20000,
    distanceInterval: 20,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Trip live tracking',
      notificationBody: 'Vizag Taxi Hub is sharing your location with the office.',
      notificationColor: '#2563eb',
    },
  });
  return 'background';
}

async function stopBackgroundUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK);
  }
}

export async function stopDriverTripTracking(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
  await stopBackgroundUpdates();
}

export async function resumeDriverTripTrackingIfNeeded(): Promise<void> {
  const store = await readStore();
  if (!store || store.mode !== 'background') return;
  const running = Platform.OS === 'web'
    ? false
    : await Location.hasStartedLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK).catch(() => false);
  if (!running) {
    await startDriverTripTracking(store.bookingId);
  }
}
