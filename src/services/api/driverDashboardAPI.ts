import axios from 'axios';
import { API_BASE_URL } from '@/config';
import type { DriverDashboardData, DriverDashboardFilters, DriverDashboardTrip, OpsTripStatus, TripStatus } from '@/types/driverDashboard';
import { vendorTripAPI } from '@/services/api/vendorTripAPI';
import { deriveTripDurationHours } from '@/utils/tripDurationFromStamps';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstPositive(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function readTripTerms(raw: unknown): DriverDashboardTrip['tripTerms'] {
  let value = raw;
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  return value as DriverDashboardTrip['tripTerms'];
}

function parseTripStatus(value: unknown): TripStatus {
  if (value === 'completed' || value === 'in_progress' || value === 'assigned') return value;
  return 'assigned';
}

function parseOpsStatus(value: unknown, coarse: TripStatus): OpsTripStatus {
  switch (value) {
    case 'assigned':
    case 'receipt_accepted':
    case 'in_progress':
    case 'day_closed':
    case 'completed':
    case 'cancelled':
      return value;
    default:
      if (coarse === 'completed') return 'completed';
      if (coarse === 'in_progress') return 'in_progress';
      return 'assigned';
  }
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
          driverPhone: toStringSafe(trip?.driverPhone ?? trip?.driver_phone),
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
          status: parseTripStatus(trip?.status),
          opsStatus: parseOpsStatus(trip?.opsStatus ?? trip?.ops_status, parseTripStatus(trip?.status)),
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
          startingOdometer: firstPositive(trip?.startingOdometer, trip?.starting_odometer, trip?.startOdometer, trip?.start_odometer, trip?.openingOdometer, trip?.openingKm, trip?.startKm),
          endingOdometer: firstPositive(trip?.endingOdometer, trip?.ending_odometer, trip?.endOdometer, trip?.end_odometer, trip?.closingOdometer, trip?.closingKm, trip?.endKm),
          startedAt: firstText(trip?.startedAt, trip?.tripStartedAt, trip?.trip_started_at, trip?.startOdometerAt, trip?.start_odometer_at) || null,
          endedAt: firstText(trip?.endedAt, trip?.endOdometerAt, trip?.end_odometer_at) || null,
          dutyDayScoped: trip?.dutyDayScoped === true || trip?.duty_day_scoped === true || trip?.duty_day_scoped === 1,
          totalKilometers: toNumber(trip?.totalKilometers ?? trip?.total_kilometers ?? trip?.total_km ?? trip?.distance_km),
          totalDurationHours: (trip?.dutyDayScoped === true || trip?.duty_day_scoped === true || trip?.duty_day_scoped === 1)
            ? (serverH > 0 && serverH <= 24 ? Math.round(serverH * 100) / 100 : 0)
            : deriveTripDurationHours({
              startTime,
              endTime,
              completedAt,
              serverHours: serverH,
            }),
          fuelSpend: toNumber(trip?.fuelSpend ?? trip?.fuel_spend),
          fuelLitres: toNumber(trip?.fuelLitres ?? trip?.fuel_litres ?? trip?.fuel_quantity),
          fuelTiming: (() => {
            const raw = trip?.fuelTiming ?? trip?.fuel_timing;
            if (raw === 'before' || raw === 'after' || raw === 'mixed') return raw;
            return null;
          })(),
          tripAmount: toNumber(trip?.tripAmount ?? trip?.trip_amount ?? trip?.total_amount),
          advancePaidAmount: toNumber(trip?.advancePaidAmount ?? trip?.advance_paid_amount ?? trip?.advance_received),
          extraCollectedAmount: (() => {
            const raw = trip?.extraCollectedAmount ?? trip?.extra_collected_amount;
            if (raw === null || raw === undefined || raw === '') return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          })(),
          extraCollectedCategory: toStringSafe(trip?.extraCollectedCategory ?? trip?.extra_collected_category) || null,
          liveLat: (() => {
            const raw = trip?.liveLat ?? trip?.live_lat;
            if (raw === null || raw === undefined || raw === '') return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          })(),
          liveLng: (() => {
            const raw = trip?.liveLng ?? trip?.live_lng;
            if (raw === null || raw === undefined || raw === '') return null;
            const n = Number(raw);
            return Number.isFinite(n) ? n : null;
          })(),
          liveTrackedAt: toStringSafe(trip?.liveTrackedAt ?? trip?.live_tracked_at) || null,
          driverCollectsPayment: trip?.driverCollectsPayment !== false && trip?.driver_collects_payment !== 0 && trip?.driver_collects_payment !== false && trip?.driver_collects_payment !== '0',
          additionalRequirements: (trip?.additionalRequirements ?? trip?.additional_requirements ?? null) as string | null,
          tripTerms: readTripTerms(trip?.tripTerms ?? trip?.trip_terms),
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
        loggedAfterTripEnd: (() => {
          const raw = fuel?.loggedAfterTripEnd ?? fuel?.logged_after_trip_end;
          if (raw === true || raw === 1 || raw === '1') return true;
          if (raw === false || raw === 0 || raw === '0') return false;
          return null;
        })(),
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
  if (filters?.vehicleNumber) searchParams.set('vehicle', filters.vehicleNumber);
  if (typeof filters?.tripLimit === 'number') searchParams.set('trip_limit', String(filters.tripLimit));
  if (typeof filters?.tripOffset === 'number') searchParams.set('trip_offset', String(filters.tripOffset));
  if (typeof filters?.fuelLimit === 'number') searchParams.set('fuel_limit', String(filters.fuelLimit));
  if (typeof filters?.fuelOffset === 'number') searchParams.set('fuel_offset', String(filters.fuelOffset));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function attachOdometerReadings(data: DriverDashboardData): Promise<DriverDashboardData> {
  const ids = data.trips.items.map((trip) => trip.tripId).filter((id) => id > 0);
  if (ids.length === 0) return data;
  try {
    const chunks: number[][] = [];
    for (let index = 0; index < ids.length; index += 100) {
      chunks.push(ids.slice(index, index + 100));
    }
    const readings = (await Promise.all(chunks.map((chunk) => vendorTripAPI.officeReadings(chunk)))).flat();
    const byId = new Map(readings.map((row) => [row.bookingId, row]));
    return {
      ...data,
      trips: {
        ...data.trips,
        items: data.trips.items.map((trip) => {
          const row = byId.get(trip.tripId);
          if (!row || trip.dutyDayScoped) return trip;
          const startingOdometer = row.startCleared
            ? 0
            : (row.startKm != null && row.startKm > 0 ? row.startKm : trip.startingOdometer);
          const endingOdometer = row.endCleared
            ? 0
            : (row.endKm != null && row.endKm > 0 ? row.endKm : trip.endingOdometer);
          const totalKilometers = startingOdometer > 0 && endingOdometer > startingOdometer
            ? endingOdometer - startingOdometer
            : (row.startCleared || row.endCleared ? 0 : trip.totalKilometers);
          return {
            ...trip,
            startingOdometer,
            endingOdometer,
            totalKilometers,
            startedAt: row.startCleared ? null : (row.startedAt || trip.startedAt || null),
            endedAt: row.endCleared ? null : (row.endedAt || trip.endedAt || null),
          };
        }),
      },
    };
  } catch {
    return data;
  }
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

    const parseResponse = async (response: { data: any }) => {
      if (response.data?.status !== 'success' || !response.data?.data) {
        throw new Error(response.data?.message || 'Failed to load driver dashboard');
      }
      return attachOdometerReadings(normalizeDashboardData(response.data.data));
    };

    // Try relative first (works in local proxy and same-origin deployments).
    try {
      const response = await axios.get(relativeUrl, { headers, timeout: 20000 });
      return await parseResponse(response);
    } catch (relativeError) {
      // Fallback to configured absolute URL.
      const response = await axios.get(absoluteUrl, { headers, timeout: 20000 });
      return await parseResponse(response);
    }
  },

  downloadDutySlip: async (bookingId: number, tripCode: string): Promise<void> => {
    const token = localStorage.getItem('auth_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const path = `/api/driver/duty-slip-pdf.php?bookingId=${bookingId}`;
    const absoluteUrl = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

    const read = async (url: string) =>
      axios.get(url, { headers, responseType: 'blob', timeout: 60000, validateStatus: () => true });

    // Same-origin first. localhost must use the dev proxy; a direct call to the live site is blocked.
    let response;
    try {
      response = await read(path);
    } catch {
      response = await read(absoluteUrl);
    }
    if (response.status === 404) {
      response = await read(absoluteUrl);
    }

    const blob = response.data as Blob;
    const type = String(blob.type || response.headers?.['content-type'] || '');
    if (response.status !== 200) {
      let message = `Duty slip failed (${response.status})`;
      try {
        const parsed = JSON.parse(await blob.text()) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        /* keep status message */
      }
      throw new Error(message);
    }

    const safe = tripCode.replace(/[^\w.-]+/g, '-') || `booking-${bookingId}`;
    const href = URL.createObjectURL(blob);
    if (type.includes('text/html')) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    const link = document.createElement('a');
    link.href = href;
    link.download = `${safe}-duty-slip.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  },
};
