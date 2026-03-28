/**
 * Driver Trips API - assigned trips for driver role
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { authAPI } from './authAPI';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { compressImageForUpload } from '../utils/compressImageForUpload';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

function messageFromFuelEntryErrorBody(data: unknown): string | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const rec = data as Record<string, unknown>;
  const msg = rec.message;
  if (typeof msg !== 'string' || msg.trim() === '') return null;
  const dbg = rec.debug;
  let extra = '';
  if (dbg !== null && typeof dbg === 'object' && !Array.isArray(dbg)) {
    const dbErr = (dbg as Record<string, unknown>).dbError;
    if (typeof dbErr === 'string' && dbErr.trim() !== '') {
      extra = ` (${dbErr.trim()})`;
    }
  }
  return msg + extra;
}

/** PHP sometimes prefixes warnings/HTML before JSON; axios then gives a string body. */
function coerceFuelEntryJsonObject(data: unknown): Record<string, unknown> | null {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  if (typeof data !== 'string') return null;
  const t = data.replace(/^\uFEFF/, '').trim();
  const start = t.indexOf('{');
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(t.slice(start)) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const uploadImage = async (
  uri: string,
  name = 'odometer.jpg',
  category?: 'odometer' | 'general'
): Promise<string> => {
  const base = getBase();
  const compressedUri = await compressImageForUpload(uri);
  const formData = new FormData();
  // Text fields first — some stacks omit trailing parts if file is first.
  if (category === 'odometer') {
    formData.append('category', 'odometer');
  }
  formData.append('image', {
    uri: compressedUri,
    name: name.toLowerCase().endsWith('.png') ? name.replace(/\.png$/i, '.jpg') : name,
    type: 'image/jpeg',
  } as unknown as Blob);
  const qs = category === 'odometer' ? '?category=odometer' : '';
  const response = await axios.post(`${base}/api/upload-image.php${qs}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  const url = response.data?.url;
  if (!url) throw new Error(response.data?.error || 'Upload failed');
  return url;
};

export interface DriverTrip {
  id: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  pickupTime: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  vehicleNumber: string;
  /** Fleet vehicle id when booking has an assigned vehicle */
  fleetVehicleId?: number | null;
  /** Vehicle class (e.g. Sedan, SUV) — shown as primary trip detail, not service category */
  vehicleType: string;
  /** Service category from booking (outstation, local, tour, etc.) */
  tripCategory?: string;
  /** e.g. one-way, round-trip, hourly package key */
  tripMode?: string;
  /** @deprecated Prefer vehicleType; kept for older screens */
  tripType: string;
  totalAmount: number;
  advancePaidAmount?: number;
  status: 'assigned' | 'in_progress' | 'completed';
  additionalRequirements: string | null;
  driverName: string | null;
  driverPhone: string | null;
}

/** Normalize trip payload from `trips.php` (snake/camel, legacy rows). */
export function mapApiTripToDriverTrip(raw: Record<string, unknown>): DriverTrip {
  const cab = String(raw.cabType ?? raw.cab_type ?? '').trim();
  const svc =
    String(raw.tripCategory ?? '').trim() ||
    String(raw.trip_type ?? '').trim() ||
    (cab ? '' : String(raw.tripType ?? '').trim());
  const vehicleType = String(raw.vehicleType ?? '').trim() || (cab || '—');
  const tripMode = String(raw.tripMode ?? raw.trip_mode ?? '').trim();
  return {
    id: Number(raw.id),
    bookingNumber: String(raw.bookingNumber ?? ''),
    pickupLocation: String(raw.pickupLocation ?? ''),
    dropLocation: String(raw.dropLocation ?? ''),
    pickupDate: String(raw.pickupDate ?? ''),
    pickupTime: String(raw.pickupTime ?? ''),
    passengerName: String(raw.passengerName ?? ''),
    passengerPhone: String(raw.passengerPhone ?? ''),
    passengerEmail: String(raw.passengerEmail ?? ''),
    vehicleNumber: String(raw.vehicleNumber ?? ''),
    fleetVehicleId:
      raw.fleetVehicleId != null && raw.fleetVehicleId !== ''
        ? Number(raw.fleetVehicleId)
        : raw.fleet_vehicle_id != null && raw.fleet_vehicle_id !== ''
          ? Number(raw.fleet_vehicle_id)
          : null,
    vehicleType,
    tripCategory: svc || undefined,
    tripMode: tripMode || undefined,
    tripType: vehicleType,
    totalAmount: Number(raw.totalAmount ?? 0),
    advancePaidAmount: Number(raw.advancePaidAmount ?? raw.advance_paid_amount ?? 0),
    status: (raw.status as DriverTrip['status']) ?? 'assigned',
    additionalRequirements: (raw.additionalRequirements as string | null) ?? null,
    driverName: (raw.driverName as string | null) ?? null,
    driverPhone: (raw.driverPhone as string | null) ?? null,
  };
}

export const driverTripsAPI = {
  updateTripStatus: async (
    bookingId: number,
    status: 'in_progress' | 'completed',
    payment?: { collectedAmount: number; paymentType: string }
  ): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const payload: Record<string, unknown> = { bookingId, status };
    if (status === 'completed' && payment) {
      payload.collectedAmount = payment.collectedAmount;
      payload.paymentType = payment.paymentType;
    }
    const response = await axios.request({
      method: 'PATCH',
      url: `${base}/api/driver/trip-status.php`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: payload,
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status !== 'success') {
      throw new Error(data?.message || 'Failed to update status');
    }
  },

  submitLocation: async (bookingId: number, lat: number, lng: number): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const response = await axios.post(`${base}/api/driver/location-updates.php`, { bookingId, lat, lng }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    const data = response.data;
    if (data?.status !== 'success') {
      throw new Error(data?.message || 'Failed to submit location');
    }
  },

  submitOdometer: async (params: {
    bookingId: number;
    readingType: 'start' | 'end';
    odometerValue: number;
    imageUrl: string;
    capturedAt: string;
  }): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const isDev = __DEV__;
    try {
      const response = await axios.post(`${base}/api/driver/odometer-readings.php`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(isDev ? { 'X-Debug': '1' } : {}),
        },
        timeout: 15000,
        validateStatus: () => true,
      });
      const data = response.data;
      if (data?.status !== 'success') {
        const msg = data?.message || 'Failed to save odometer reading';
        const debug = data?.debug as { dbError?: string } | undefined;
        if (isDev && debug?.dbError) {
          console.warn('Odometer API debug:', debug.dbError);
        }
        throw new Error(msg);
      }
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } })?.response?.data;
      const msg = res?.message;
      if (msg) throw new Error(msg);
      throw e;
    }
  },

  getVehicles: async (): Promise<{ id: number; vehicleNumber: string; name: string; model: string; make: string }[]> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const response = await axios.get(`${base}/api/driver/vehicles.php`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    const data = response.data;
    if (data?.status !== 'success') throw new Error(data?.message || 'Failed to load vehicles');
    return (data.vehicles ?? []) as { id: number; vehicleNumber: string; name: string; model: string; make: string }[];
  },

  submitFuelEntry: async (params: {
    vehicleId: number;
    bookingId?: number;
    quantity: number;
    pricePerUnit: number;
    /** Paid total from receipt (card/UPI slip); should match totalCost. */
    totalCost: number;
    /** Explicit receipt total for auditing (defaults server-side to totalCost). */
    receiptTotalAmount?: number;
    /** Pump LCD total for receipt vs pump variance. */
    pumpDisplayTotal?: number | null;
    odometer: number;
    fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
    fuelStation?: string;
    paymentMethod: 'card' | 'upi' | 'customer_advance' | 'company_paid';
    cardLastFour?: string;
    receiptImageUrl?: string;
    pumpImageUrl?: string;
    odometerImageUrl?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAccuracy?: number | null;
    captureTimestamp?: string;
    flags?: string[];
  }): Promise<void> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const url = `${base}/api/driver/fuel-entry.php`;
    try {
      const response = await axios.post(url, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
        validateStatus: (s) => s >= 200 && s < 600,
      });
      const { data: rawData, status } = response;
      const data = coerceFuelEntryJsonObject(rawData);
      const fromBody = messageFromFuelEntryErrorBody(data ?? rawData);

      if (data === null) {
        const rawStr =
          typeof rawData === 'string'
            ? rawData
            : rawData === undefined || rawData === null
              ? ''
              : JSON.stringify(rawData);
        const trimmed = rawStr.replace(/\s+/g, ' ').trim();
        const snippet = trimmed.slice(0, 280);
        if (!trimmed) {
          throw new Error(
            `Server returned an empty body (HTTP ${status}). Deploy the latest api/driver/fuel-entry.php from this repo to ${url} (PHP 7.4+), or check server/PHP error logs for fatals before JSON output.`
          );
        }
        throw new Error(
          `Server returned non-JSON (HTTP ${status}). ${snippet}${trimmed.length > 280 ? '…' : ''}`
        );
      }

      const rec = data;
      if (rec.status === 'success') return;

      if (fromBody) throw new Error(fromBody);
      throw new Error(`Failed to save fuel entry (HTTP ${status})`);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const st = e.response?.status;
        const parsed = messageFromFuelEntryErrorBody(e.response?.data);
        if (parsed) throw new Error(parsed);
        if (e.code === 'ECONNABORTED') throw new Error('Request timed out. Check your connection.');
        if (!e.response) {
          throw new Error(
            `Network error: ${e.message}. Check connection and API base URL (currently: ${base || '(empty)'}).`
          );
        }
        const raw = e.response.data;
        if (typeof raw === 'string' && raw.trim()) {
          throw new Error(
            `Server error${st != null ? ` (${st})` : ''}: ${raw.replace(/\s+/g, ' ').trim().slice(0, 200)}`
          );
        }
      }
      throw e;
    }
  },

  uploadFuelOdometer: async (params: {
    imageUri: string;
    type: 'fuel' | 'fuel_receipt' | 'fuel_pump' | 'fuel_odometer' | 'odometer' | 'odometer_reading' | 'driver_docs';
    bookingId?: number;
    vehicleId?: number;
    /** Used to build the required `fuel-records/{...}/{vehicleNumber}/...` GCS path */
    vehicleNumber?: string;
    /** ISO timestamp from the photo capture step */
    captureTimestamp?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationAccuracy?: number | null;
    fileName?: string;
    /** Receipt OCR total (₹) for pump upload: server checks pump display vs receipt within ±₹2. */
    receiptTotalOcr?: number | null;
    /** Raw Vision text from receipt capture — paired into server `fuelOcrDebug` on pump upload. */
    pairedReceiptOcrText?: string | null;
    /** Set '1' with pairedReceiptOcrText to receive explainability JSON from server. */
    includeFuelOcrDebug?: '1' | '0' | null;
  }): Promise<{
    id: number;
    imageUrl: string;
    type: string;
    extracted: Record<string, unknown>;
    rawText?: string;
    fraudFlags?: string[];
    fuelOcrDebug?: Record<string, unknown> | null;
  }> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const compressedUri = await compressImageForUpload(params.imageUri);
    const formData = new FormData();
    formData.append('image', {
      uri: compressedUri,
      name: params.fileName?.toLowerCase().endsWith('.png')
        ? params.fileName.replace(/\.png$/i, '.jpg')
        : params.fileName || 'upload.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('type', params.type);
    if (params.bookingId) formData.append('bookingId', String(params.bookingId));
    if (params.vehicleId) formData.append('vehicleId', String(params.vehicleId));
    if (params.vehicleNumber) formData.append('vehicleNumber', params.vehicleNumber);
    if (params.captureTimestamp) formData.append('captureTimestamp', params.captureTimestamp);
    if (params.latitude != null) formData.append('latitude', String(params.latitude));
    if (params.longitude != null) formData.append('longitude', String(params.longitude));
    if (params.locationAccuracy != null) formData.append('locationAccuracy', String(params.locationAccuracy));
    if (params.type === 'fuel_pump' && params.receiptTotalOcr != null && params.receiptTotalOcr > 0) {
      formData.append('receiptTotalOcr', String(params.receiptTotalOcr));
    }
    if (
      params.type === 'fuel_pump' &&
      typeof params.pairedReceiptOcrText === 'string' &&
      params.pairedReceiptOcrText.trim() !== ''
    ) {
      formData.append('pairedReceiptOcrText', params.pairedReceiptOcrText);
    }
    if (
      params.includeFuelOcrDebug === '1' &&
      (params.type === 'fuel_pump' || params.type === 'fuel_receipt')
    ) {
      formData.append('includeFuelOcrDebug', '1');
    }
    const response = await axios.post(`${base}/api/driver/upload-fuel-odometer.php`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    const data = response.data;
    if (data?.status !== 'success') throw new Error(data?.message || 'Upload failed');
    return data.data;
  },

  getFuelOdometerHistory: async (params?: {
    type?: 'fuel' | 'odometer' | 'driver_docs';
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ records: unknown[]; count: number }> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.fromDate) searchParams.set('from_date', params.fromDate);
    if (params?.toDate) searchParams.set('to_date', params.toDate);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    const response = await axios.get(
      `${base}/api/driver/fuel-odometer-history.php${qs ? `?${qs}` : ''}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }
    );
    const data = response.data;
    if (data?.status !== 'success') throw new Error(data?.message || 'Failed to load history');
    return { records: data.records ?? [], count: data.count ?? 0 };
  },

  getTrips: async (params?: { status?: 'assigned' | 'in_progress' }): Promise<DriverTrip[]> => {
    const token = await authAPI.getStoredToken();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const qs = params?.status ? `?status=${params.status}` : '';
    try {
      const response = await axios.get(`${base}/api/driver/trips.php${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      const data = response.data;
      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to load trips');
      }
      return (data.trips ?? []).map((t: Record<string, unknown>) => mapApiTripToDriverTrip(t));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg) throw new Error(msg);
      throw e;
    }
  },
};
