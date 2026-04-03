/**
 * User bookings API - fetches authenticated user's bookings
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { authAPI } from './authAPI';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

export interface UserBooking {
  id: number;
  pickup_location: string;
  drop_location?: string;
  pickup_date: string;
  pickup_time?: string;
  trip_type?: string;
  vehicle_type?: string;
  total_amount?: number;
  status?: string;
  createdBy?: string | null;
  created_by?: string | null;
  [key: string]: unknown;
}

/** Normalize API response - backend uses camelCase, app expects snake_case. Exported for adminAPI. */
export function normalizeBooking(raw: Record<string, unknown>): UserBooking {
  const loc = (v: unknown) =>
    typeof v === 'string' ? v : (v && typeof v === 'object' && 'name' in v ? String((v as { name?: string }).name) : '');
  const pickup = loc(raw.pickupLocation ?? raw.pickup_location) || '';
  const drop = loc(raw.dropLocation ?? raw.drop_location) || '';
  const dateRaw = raw.pickupDate ?? raw.pickup_date ?? raw.travel_date;
  let pickupDate = '';
  let pickupTime = '';
  if (dateRaw && typeof dateRaw === 'string') {
    if (dateRaw.includes('T')) {
      const [d, t] = dateRaw.split('T');
      pickupDate = d;
      pickupTime = t ? t.replace(/\.\d+Z?$/, '').slice(0, 5) : '';
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d/.test(dateRaw)) {
      const [d, t] = dateRaw.split(/\s+/);
      pickupDate = d;
      pickupTime = t ? t.slice(0, 5) : '';
    } else {
      pickupDate = dateRaw;
    }
  }
  const separateTime = (raw.pickupTime ?? raw.pickup_time) as string | undefined;
  const finalPickupTime = pickupTime || (separateTime && /^\d{1,2}:\d{2}/.test(separateTime) ? separateTime.slice(0, 5) : '');
  const amount = raw.totalAmount ?? raw.total_amount;
  const num = typeof amount === 'number' ? amount : typeof amount === 'string' ? parseFloat(amount) || 0 : 0;
  return {
    id: Number(raw.id) || 0,
    pickup_location: pickup,
    drop_location: drop || undefined,
    pickup_date: pickupDate,
    pickup_time: finalPickupTime || undefined,
    trip_type: (raw.tripType ?? raw.trip_type) as string | undefined,
    vehicle_type: (raw.cabType ?? raw.vehicle_type ?? raw.trip_type) as string | undefined,
    total_amount: num,
    status: (raw.status ?? raw.booking_status) as string | undefined,
    createdBy: (raw.createdBy ?? raw.created_by) as string | undefined,
    ...raw,
  };
}

export const userBookingsAPI = {
  /** Get current user's bookings */
  getUserBookings: async (): Promise<UserBooking[]> => {
    const token = await authAPI.getStoredToken();
    const user = await authAPI.getStoredUser();
    if (!token || !user?.id) {
      throw new Error('Not authenticated');
    }
    return userBookingsAPI.getUserBookingsForUser(user.id);
  },

  /** Get bookings for a specific user (supports admin impersonation via view_as_user_id) */
  getUserBookingsForUser: async (
    userId: number,
    options?: { viewAs?: boolean }
  ): Promise<UserBooking[]> => {
    const token = await authAPI.getStoredToken();
    const user = await authAPI.getStoredUser();
    if (!token) throw new Error('Not authenticated');
    const base = getBase();
    const viewAsParam = options?.viewAs ? `&view_as_user_id=${userId}` : '';
    const url = `${base}/api/user/bookings.php?user_id=${userId}${viewAsParam}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    const data = response.data;
    let raw: Record<string, unknown>[] = [];
    if (data?.bookings && Array.isArray(data.bookings)) raw = data.bookings;
    else if (Array.isArray(data)) raw = data;
    return raw.map((b) => normalizeBooking(typeof b === 'object' && b ? b : {}));
  },
};
