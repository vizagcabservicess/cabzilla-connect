import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { getResolvedApiOrigin } from '../config';
import { ensureBackgroundLocationAccess } from './backgroundLocationDisclosure';
import { authAPI } from '../services/authAPI';

export const DRIVER_TRIP_LOCATION_TASK = 'DRIVER_TRIP_LOCATION_TASK';
const STORE_KEY = 'driverTripTrack';

type TrackStore = {
  token: string;
  bookingId: number;
  apiOrigin: string;
  mode: 'background' | 'foreground';
  lastLat?: number;
  lastLng?: number;
  lastAccuracy?: number;
  lastAt?: number;
};

const GOOD_METERS = 40;
const MAX_METERS = 100;
const MAX_SPEED_MPS = 45;

function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function previousFix(store: TrackStore): { lat: number; lng: number; accuracy: number; at: number } | null {
  if (store.lastLat == null || store.lastLng == null || store.lastAt == null) return null;
  return {
    lat: store.lastLat,
    lng: store.lastLng,
    accuracy: store.lastAccuracy ?? 999,
    at: store.lastAt,
  };
}

/** Cell and Wi-Fi fixes often claim a spot several kilometres from the cab. Keep GPS-quality points only. */
function fixIsUsable(loc: Location.LocationObject, previous: ReturnType<typeof previousFix>): boolean {
  const accuracy = loc.coords.accuracy;
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > MAX_METERS) return false;
  if (loc.timestamp > 0) {
    const stamp = loc.timestamp < 1e12 ? loc.timestamp * 1000 : loc.timestamp;
    if (Date.now() - stamp > 25000) return false;
  }
  if (!previous) return true;
  if (previous.accuracy <= GOOD_METERS && accuracy > GOOD_METERS && Date.now() - previous.at < 120000) return false;
  const moved = metersBetween(previous.lat, previous.lng, loc.coords.latitude, loc.coords.longitude);
  const elapsed = Math.max(1, (Date.now() - previous.at) / 1000);
  if (moved > 400 && moved / elapsed > MAX_SPEED_MPS) {
    const replacingCoarseFix = previous.accuracy > GOOD_METERS && accuracy <= GOOD_METERS;
    if (!replacingCoarseFix) return false;
  }
  return true;
}

function rememberFix(store: TrackStore, loc: Location.LocationObject): void {
  store.lastLat = loc.coords.latitude;
  store.lastLng = loc.coords.longitude;
  store.lastAccuracy = loc.coords.accuracy ?? undefined;
  store.lastAt = Date.now();
  void AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

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
  if (res.status >= 200 && res.status < 300) rememberFix(store, loc);
  return res.status;
}

let foregroundWatch: Location.LocationSubscription | null = null;
let foregroundPoll: ReturnType<typeof setInterval> | null = null;

async function stopForegroundWatch(): Promise<void> {
  foregroundWatch?.remove();
  foregroundWatch = null;
  if (foregroundPoll) clearInterval(foregroundPoll);
  foregroundPoll = null;
}

async function publishFix(store: TrackStore, pos: Location.LocationObject): Promise<number | null> {
  const previous = previousFix(store);
  if (!fixIsUsable(pos, previous)) return null;
  const accuracy = pos.coords.accuracy ?? 999;
  if (previous && Date.now() - previous.at < 8000 && accuracy + 15 >= previous.accuracy) return null;
  return postLocation(store, pos);
}

function deliverFix(store: TrackStore, pos: Location.LocationObject): void {
  void publishFix(store, pos).then((status) => {
    if (status === 403 || status === 409) void stopDriverTripTracking();
  }).catch(() => undefined);
}

function seedFix(store: TrackStore): void {
  void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
    .then((pos) => deliverFix(store, pos))
    .catch(() => undefined);
}

async function watchForeground(store: TrackStore): Promise<void> {
  await stopForegroundWatch();
  const options = {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10000,
    distanceInterval: 0,
    mayShowUserSettingsDialog: false,
  };
  foregroundWatch = await Location.watchPositionAsync(options, (pos) => deliverFix(store, pos));
  foregroundPoll = setInterval(() => {
    seedFix(store);
  }, 15000);
  seedFix(store);
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
      const status = await publishFix(store, loc);
      if (status == null) return;
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

function carriedFix(existing: TrackStore | null, bookingId: number): Pick<TrackStore, 'lastLat' | 'lastLng' | 'lastAccuracy' | 'lastAt'> {
  if (!existing || existing.bookingId !== bookingId) return {};
  return {
    lastLat: existing.lastLat,
    lastLng: existing.lastLng,
    lastAccuracy: existing.lastAccuracy,
    lastAt: existing.lastAt,
  };
}

export async function startDriverTripTracking(bookingId: number): Promise<'background' | 'foreground'> {
  const token = await authAPI.getStoredToken();
  if (!token) throw new Error('Sign in again to share your location.');
  const apiOrigin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
  const kept = carriedFix(await readStore(), bookingId);
  const backgroundGranted = await ensureBackgroundLocationAccess();
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== 'granted') {
      throw new Error('Allow location so the office can see this trip.');
    }
  }

  if (!backgroundGranted || Platform.OS === 'web') {
    await stopBackgroundUpdates();
    const foregroundStore: TrackStore = { token, bookingId, apiOrigin, mode: 'foreground', ...kept };
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(foregroundStore));
    await watchForeground(foregroundStore);
    return 'foreground';
  }

  await stopForegroundWatch();

  const backgroundStore: TrackStore = { token, bookingId, apiOrigin, mode: 'background', ...kept };
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(backgroundStore));
  const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK);
  }
  await Location.startLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 10000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Trip live tracking',
      notificationBody: 'Vizag Taxi Hub is sharing your location with the office.',
      notificationColor: '#2563eb',
    },
  });
  seedFix(backgroundStore);
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
  await stopForegroundWatch();
  await AsyncStorage.removeItem(STORE_KEY);
  await stopBackgroundUpdates();
}

export async function resumeDriverTripTrackingIfNeeded(): Promise<void> {
  const store = await readStore();
  if (!store) return;
  if (store.mode === 'foreground') {
    if (!foregroundWatch) await startDriverTripTracking(store.bookingId);
    return;
  }
  const running = Platform.OS === 'web'
    ? false
    : await Location.hasStartedLocationUpdatesAsync(DRIVER_TRIP_LOCATION_TASK).catch(() => false);
  if (!running) {
    await startDriverTripTracking(store.bookingId);
  }
}
