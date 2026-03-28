import axios from 'axios';
import { API_BASE_URL } from '@/config';
import type { DriverDashboardData, DriverDashboardFilters, DriverDashboardTrip } from '@/types/driverDashboard';
import { deriveTripDurationHours } from '@/utils/tripDurationFromStamps';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizeDashboardData(raw: any): DriverDashboardData {
  const tripItemsRaw = Array.isArray(raw?.trips?.items) ? raw.trips.items : [];
  const fuelItemsRaw = Array.isArray(raw?.fuelRecords?.items) ? raw.fuelRecords.items : [];
  const earningsRaw = raw?.summary?.earningsBreakdown ?? {};

  return {
    driverId: raw?.driverId != null ? toNumber(raw.driverId, 0) : null,
    trips: {
      items: tripItemsRaw.map((trip: any) => {
        const startTime = trip?.startTime ?? trip?.start_time ?? null;
        const endTime = trip?.endTime ?? trip?.end_time ?? null;
        const completedAt = trip?.completedAt ?? trip?.completed_at ?? null;
        const serverH = toNumber(trip?.totalDurationHours ?? trip?.total_duration_hours ?? trip?.duration_hours);
        return {
          tripId: toNumber(trip?.tripId ?? trip?.id),
          tripCode: toStringSafe(trip?.tripCode ?? trip?.booking_number ?? trip?.bookingNumber ?? `BK${toNumber(trip?.tripId ?? trip?.id)}`),
          driverId: toNumber(trip?.driverId ?? trip?.driver_id),
          driverName: toStringSafe(trip?.driverName ?? trip?.driver_name),
          vehicleNumber: toStringSafe(trip?.vehicleNumber ?? trip?.vehicle_number),
          passengerName: toStringSafe(trip?.passengerName ?? trip?.passenger_name),
          passengerPhone: toStringSafe(trip?.passengerPhone ?? trip?.passenger_phone),
          tripType: toStringSafe(trip?.tripType ?? trip?.trip_type),
          tripMode: toStringSafe(trip?.tripMode ?? trip?.trip_mode),
          cabType: toStringSafe(trip?.cabType ?? trip?.cab_type),
          startTime,
          endTime,
          pickupLocation: toStringSafe(trip?.pickupLocation ?? trip?.pickup_location ?? trip?.pickup),
          dropLocation: toStringSafe(trip?.dropLocation ?? trip?.drop_location ?? trip?.drop),
          status: (trip?.status ?? 'assigned') as 'assigned' | 'in_progress' | 'completed',
          bookingStatusRaw: toStringSafe(trip?.bookingStatusRaw ?? trip?.booking_status_raw ?? trip?.status ?? ''),
          completedAt,
          storedDistanceKm: toNumber(trip?.storedDistanceKm ?? trip?.stored_distance_km ?? trip?.distance_km ?? 0),
          paymentType: (trip?.paymentType ?? trip?.payment_type ?? 'self_paid') as DriverDashboardTrip['paymentType'],
          driverCollectedAmount: (() => {
            const dc = trip?.driverCollectedAmount ?? trip?.driver_collected_amount;
            if (dc === null || dc === undefined || dc === '') return null;
            const n = toNumber(dc);
            return Number.isFinite(n) ? n : null;
          })(),
          startingOdometer: toNumber(trip?.startingOdometer ?? trip?.starting_odometer ?? trip?.start_odometer),
          endingOdometer: toNumber(trip?.endingOdometer ?? trip?.ending_odometer ?? trip?.end_odometer),
          totalKilometers: toNumber(trip?.totalKilometers ?? trip?.total_kilometers ?? trip?.total_km ?? trip?.distance_km),
          totalDurationHours: deriveTripDurationHours({
            startTime,
            endTime,
            completedAt,
            serverHours: serverH,
          }),
          fuelSpend: toNumber(trip?.fuelSpend ?? trip?.fuel_spend),
          tripAmount: toNumber(trip?.tripAmount ?? trip?.trip_amount ?? trip?.total_amount),
        };
      }),
      total: toNumber(raw?.trips?.total),
      limit: toNumber(raw?.trips?.limit, 20),
      offset: toNumber(raw?.trips?.offset, 0),
    },
    fuelRecords: {
      items: fuelItemsRaw.map((fuel: any) => ({
        id: toNumber(fuel?.id),
        dateTime: fuel?.dateTime ?? fuel?.date_time ?? null,
        fuelAmount: toNumber(fuel?.fuelAmount ?? fuel?.fuel_amount ?? fuel?.total_cost),
        fuelQuantityLitres: toNumber(fuel?.fuelQuantityLitres ?? fuel?.fuel_quantity_litres ?? fuel?.quantity),
        vehicleNumber: (() => {
          const v = fuel?.vehicleNumber ?? fuel?.vehicle_number;
          if (v == null || v === '') return null;
          return toStringSafe(v);
        })(),
        linkedTripId: fuel?.linkedTripId ?? fuel?.linked_trip_id ?? fuel?.booking_id ?? null,
        pumpDisplayTotal: (() => {
          const p = fuel?.pumpDisplayTotal ?? fuel?.pump_display_total;
          if (p == null || p === '') return null;
          const n = toNumber(p);
          return n > 0 ? n : null;
        })(),
        amountVariance: (() => {
          const a = fuel?.amountVariance ?? fuel?.amount_variance;
          if (a == null || a === '') return null;
          return toNumber(a);
        })(),
      })),
      total: toNumber(raw?.fuelRecords?.total),
      limit: toNumber(raw?.fuelRecords?.limit, 20),
      offset: toNumber(raw?.fuelRecords?.offset, 0),
    },
    summary: {
      totalTripsCompleted: toNumber(raw?.summary?.totalTripsCompleted ?? raw?.summary?.total_trips_completed),
      totalKilometers: toNumber(raw?.summary?.totalKilometers ?? raw?.summary?.total_kilometers),
      totalHours: toNumber(raw?.summary?.totalHours ?? raw?.summary?.total_hours),
      totalTripAmount: toNumber(raw?.summary?.totalTripAmount ?? raw?.summary?.total_trip_amount),
      totalFuelSpend: toNumber(raw?.summary?.totalFuelSpend ?? raw?.summary?.total_fuel_spend),
      numberOfRefills: toNumber(raw?.summary?.numberOfRefills ?? raw?.summary?.number_of_refills),
      fuelEfficiencyKmPerLitre: toNumber(raw?.summary?.fuelEfficiencyKmPerLitre ?? raw?.summary?.fuel_efficiency_km_per_litre),
      netEarnings: toNumber(raw?.summary?.netEarnings ?? raw?.summary?.net_earnings),
      profitEstimation: toNumber(raw?.summary?.profitEstimation ?? raw?.summary?.profit_estimation),
      earningsBreakdown: {
        company_paid: toNumber(earningsRaw.company_paid),
        self_paid: toNumber(earningsRaw.self_paid),
        corporate_booking: toNumber(earningsRaw.corporate_booking),
        agent_booking: toNumber(earningsRaw.agent_booking),
      },
    },
  };
}

function buildQuery(filters?: DriverDashboardFilters): string {
  const searchParams = new URLSearchParams();
  if (filters?.fromDate) searchParams.set('from_date', filters.fromDate);
  if (filters?.toDate) searchParams.set('to_date', filters.toDate);
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.paymentType) searchParams.set('payment_type', filters.paymentType);
  if (filters?.search) searchParams.set('search', filters.search);
  if (typeof filters?.driverId === 'number') searchParams.set('driver_id', String(filters.driverId));
  if (typeof filters?.tripLimit === 'number') searchParams.set('trip_limit', String(filters.tripLimit));
  if (typeof filters?.tripOffset === 'number') searchParams.set('trip_offset', String(filters.tripOffset));
  if (typeof filters?.fuelLimit === 'number') searchParams.set('fuel_limit', String(filters.fuelLimit));
  if (typeof filters?.fuelOffset === 'number') searchParams.set('fuel_offset', String(filters.fuelOffset));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const driverDashboardAPI = {
  async getDashboard(filters?: DriverDashboardFilters): Promise<DriverDashboardData> {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const query = buildQuery(filters);
    const relativeUrl = `/api/driver/dashboard.php${query}`;
    const absoluteUrl = `${API_BASE_URL}/api/driver/dashboard.php${query}`;

    const parseResponse = (response: { data: any }) => {
      if (response.data?.status !== 'success' || !response.data?.data) {
        throw new Error(response.data?.message || 'Failed to load driver dashboard');
      }
      return normalizeDashboardData(response.data.data);
    };

    // Try relative first (works in local proxy and same-origin deployments).
    try {
      const response = await axios.get(relativeUrl, { headers, timeout: 20000 });
      return parseResponse(response);
    } catch (relativeError) {
      // Fallback to configured absolute URL.
      const response = await axios.get(absoluteUrl, { headers, timeout: 20000 });
      return parseResponse(response);
    }
  },
};
