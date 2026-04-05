import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { getResolvedApiOrigin } from '../config';
import { authAPI } from './authAPI';
import type { DriverDashboardData, DriverDashboardFilters, DriverDashboardTrip, DriverFuelRecord } from '../types/driverDashboard';
import { deriveTripDurationHours } from '../utils/tripDurationFromStamps';

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toStringSafe(v: unknown, fallback = ''): string {
  if (typeof v === 'string') return v;
  if (v == null) return fallback;
  return String(v);
}

function normalizeFuelItem(raw: Record<string, unknown>): DriverFuelRecord {
  const amtVar = raw.amountVariance ?? raw.amount_variance;
  const pump = raw.pumpDisplayTotal ?? raw.pump_display_total;
  return {
    id: toNum(raw.id),
    dateTime: (raw.dateTime ?? raw.date_time ?? null) as string | null,
    fuelAmount: toNum(raw.fuelAmount ?? raw.fuel_amount ?? raw.total_cost),
    fuelQuantityLitres: toNum(raw.fuelQuantityLitres ?? raw.fuel_quantity_litres ?? raw.quantity),
    vehicleNumber: raw.vehicleNumber != null ? String(raw.vehicleNumber) : raw.vehicle_number != null ? String(raw.vehicle_number) : null,
    linkedTripId: (raw.linkedTripId ?? raw.linked_trip_id ?? raw.booking_id ?? null) as number | null,
    pumpDisplayTotal:
      pump != null && pump !== '' ? toNum(pump) : null,
    amountVariance: amtVar != null && amtVar !== '' ? toNum(amtVar) : null,
  };
}

const CACHE_PREFIX = 'driver_dashboard_cache_v2_u';

async function dashboardCacheKey(): Promise<string> {
  const user = await authAPI.getStoredUser();
  const id = user?.id != null ? String(user.id) : '0';
  return `${CACHE_PREFIX}${id}`;
}

function buildQuery(filters?: DriverDashboardFilters): string {
  const searchParams = new URLSearchParams();
  if (filters?.fromDate) searchParams.set('from_date', filters.fromDate);
  if (filters?.toDate) searchParams.set('to_date', filters.toDate);
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.paymentType) searchParams.set('payment_type', filters.paymentType);
  if (filters?.search) searchParams.set('search', filters.search);
  if (typeof filters?.driverId === 'number' && filters.driverId > 0) {
    searchParams.set('driver_id', String(filters.driverId));
  }
  if (typeof filters?.tripLimit === 'number') searchParams.set('trip_limit', String(filters.tripLimit));
  if (typeof filters?.tripOffset === 'number') searchParams.set('trip_offset', String(filters.tripOffset));
  if (typeof filters?.fuelLimit === 'number') searchParams.set('fuel_limit', String(filters.fuelLimit));
  if (typeof filters?.fuelOffset === 'number') searchParams.set('fuel_offset', String(filters.fuelOffset));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function mapDashboardTripItem(raw: Record<string, unknown>): DriverDashboardTrip {
  const t = raw as Record<string, unknown>;
  const startTime = (t.startTime ?? t.start_time ?? null) as string | null;
  const endTime = (t.endTime ?? t.end_time ?? null) as string | null;
  const completedAt = (t.completedAt ?? t.completed_at ?? null) as string | null;
  const serverH = toNum(t.totalDurationHours ?? t.total_duration_hours ?? t.duration_hours);
  const totalDurationHours = deriveTripDurationHours({
    startTime,
    endTime,
    completedAt,
    serverHours: serverH,
  });
  const dc = t.driverCollectedAmount ?? t.driver_collected_amount;
  let driverCollectedAmount: number | null = null;
  if (dc != null && dc !== '') {
    const n = toNum(dc);
    if (Number.isFinite(n)) driverCollectedAmount = n;
  }
  return {
    tripId: toNum(t.tripId ?? t.id),
    tripCode: toStringSafe(t.tripCode ?? t.booking_number ?? t.bookingNumber ?? `BK${toNum(t.tripId ?? t.id)}`),
    driverId: toNum(t.driverId ?? t.driver_id),
    driverName: toStringSafe(t.driverName ?? t.driver_name),
    vehicleNumber: toStringSafe(t.vehicleNumber ?? t.vehicle_number),
    passengerName: toStringSafe(t.passengerName ?? t.passenger_name),
    passengerPhone: toStringSafe(t.passengerPhone ?? t.passenger_phone),
    tripType: toStringSafe(t.tripType ?? t.trip_type),
    tripMode: toStringSafe(t.tripMode ?? t.trip_mode),
    cabType: toStringSafe(t.cabType ?? t.cab_type),
    fuelSpend: toNum(t.fuelSpend ?? t.fuel_spend),
    startTime,
    endTime,
    pickupLocation: toStringSafe(t.pickupLocation ?? t.pickup_location ?? t.pickup),
    dropLocation: toStringSafe(t.dropLocation ?? t.drop_location ?? t.drop),
    status: (t.status ?? 'assigned') as DriverDashboardTrip['status'],
    bookingStatusRaw: toStringSafe(t.bookingStatusRaw ?? t.booking_status_raw ?? t.status ?? ''),
    completedAt,
    storedDistanceKm: toNum(t.storedDistanceKm ?? t.stored_distance_km ?? t.distance_km),
    paymentType: (t.paymentType ?? t.payment_type ?? 'self_paid') as DriverDashboardTrip['paymentType'],
    driverCollectedAmount,
    startingOdometer: toNum(t.startingOdometer ?? t.starting_odometer ?? t.start_odometer),
    endingOdometer: toNum(t.endingOdometer ?? t.ending_odometer ?? t.end_odometer),
    totalKilometers: toNum(t.totalKilometers ?? t.total_kilometers ?? t.total_km ?? t.distance_km),
    totalDurationHours,
    tripAmount: toNum(t.tripAmount ?? t.trip_amount ?? t.total_amount),
  };
}

/** Clears cached dashboard payload (forces next GET to hit the server). */
export async function invalidateDriverDashboardCache(): Promise<void> {
  const cacheKey = await dashboardCacheKey();
  await AsyncStorage.removeItem(cacheKey);
}

export const driverDashboardAPI = {
  getDashboard: async (filters?: DriverDashboardFilters): Promise<DriverDashboardData> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getResolvedApiOrigin();
    const cacheKey = await dashboardCacheKey();
    if (process.env.EXPO_PUBLIC_SHOW_TRIP_ASSIGNMENT_DEBUG === '1') {
      console.warn('[driverDashboard] GET', `${base || '(relative)'}/api/driver/dashboard.php`);
    }

    try {
      const response = await axios.get(`${base}/api/driver/dashboard.php${buildQuery(filters)}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      });
      const data = response.data;
      if (data?.status !== 'success' || !data?.data) {
        throw new Error(data?.message || 'Failed to load dashboard');
      }
      const payload = data.data as DriverDashboardData & { fuelRecords?: { items?: Record<string, unknown>[] } };
      const tripRaw = Array.isArray(payload?.trips?.items) ? payload.trips.items : [];
      const tripItems = tripRaw.map((row) => mapDashboardTripItem(row as Record<string, unknown>));
      const items = Array.isArray(payload?.fuelRecords?.items) ? payload.fuelRecords.items.map((r) => normalizeFuelItem(r)) : [];
      const mapped: DriverDashboardData = {
        ...payload,
        trips: {
          ...payload.trips,
          items: tripItems,
          total: payload.trips?.total ?? tripItems.length,
          limit: payload.trips?.limit ?? 50,
          offset: payload.trips?.offset ?? 0,
        },
        fuelRecords: {
          ...payload.fuelRecords,
          items,
          total: payload.fuelRecords?.total ?? items.length,
          limit: payload.fuelRecords?.limit ?? 50,
          offset: payload.fuelRecords?.offset ?? 0,
        },
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(mapped));
      return mapped;
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DriverDashboardData;
      }
      throw error;
    }
  },
};
