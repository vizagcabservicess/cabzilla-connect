import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import { authAPI } from './authAPI';

const SHEET_TAB_KEY = 'ai_assistant_sheet_tab';

const getBase = () => {
  if (API_BASE_URL) return API_BASE_URL;
  if (Platform.OS === 'web') return '';
  return WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com';
};

export type AiParsedBooking = {
  pickup_date: string;
  return_date: string;
  pickup_time: string;
  pickup_location: string;
  drop_location: string;
  trip_type: string;
  cost: number;
  advance_received: number;
  customer_name: string;
  customer_mobile: string;
  manager_name: string;
  manager_mobile: string;
  driver_name: string;
  vehicle_type: string;
  seating_capacity: number;
  payment_mode: string;
  driver_collects_payment: boolean;
  hourly_package: string;
  additional_requirements: string;
  trip_terms?: {
    places?: string[];
    notes?: string[];
    exclusions?: string[];
    day_window?: string | null;
  };
};

export type AiCreateResult = {
  success: boolean;
  invoice_no?: number;
  message?: string;
  sheet_synced?: boolean;
  sheet_sync_error?: string | null;
  errors?: string[];
};

function apiMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { errors?: string[]; message?: string; error?: string } | undefined;
    if (data?.errors?.length) return data.errors.join(', ');
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
    if (error.response?.status === 401) return 'Session expired. Sign in again.';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function headers(): Promise<Record<string, string>> {
  const token = await authAPI.getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function defaultAiSheetTab(date = new Date()): string {
  return format(date, 'MMMM yyyy');
}

export async function readAiSheetTab(): Promise<string> {
  const stored = (await AsyncStorage.getItem(SHEET_TAB_KEY).catch(() => null))?.trim();
  return stored || defaultAiSheetTab();
}

export async function saveAiSheetTab(name: string): Promise<void> {
  await AsyncStorage.setItem(SHEET_TAB_KEY, name.trim()).catch(() => undefined);
}

export function aiBookingFieldErrors(booking: Partial<AiParsedBooking>): string[] {
  const errors: string[] = [];
  const phone = String(booking.customer_mobile ?? '').replace(/\D/g, '');
  if (phone.length < 10) errors.push('Customer mobile must be a valid phone number');
  if (!booking.customer_name?.trim()) errors.push('Customer name is required');
  if (!booking.pickup_location?.trim()) errors.push('Pickup location is required');
  if (!booking.drop_location?.trim()) errors.push('Drop location is required');
  if (!booking.pickup_date) errors.push('Pickup date is required');
  if (booking.driver_collects_payment !== false && !(Number(booking.cost) > 0)) {
    errors.push('Cost must be greater than 0');
  }
  return errors;
}

export const aiBookingAPI = {
  async parseBooking(text: string): Promise<{ bookings: AiParsedBooking[]; errors: string[] }> {
    const base = getBase();
    try {
      const { data, status } = await axios.post(
        `${base}/api/admin/parse-booking.php`,
        { text },
        { headers: await headers(), timeout: 20000, validateStatus: () => true },
      );
      if (data?.success && data.data) {
        const bookings = (Array.isArray(data.bookings) && data.bookings.length > 0
          ? data.bookings
          : [data.data]) as AiParsedBooking[];
        return { bookings, errors: Array.isArray(data.parse_errors) ? data.parse_errors : [] };
      }
      const message = Array.isArray(data?.errors) && data.errors.length
        ? data.errors.join(', ')
        : status === 401
          ? 'Sign in again as admin.'
          : 'Could not parse that booking.';
      throw new Error(message);
    } catch (error) {
      throw new Error(apiMessage(error, 'Could not parse that booking.'));
    }
  },

  async createBooking(booking: AiParsedBooking, rawInput: string, sheetTabName: string): Promise<AiCreateResult> {
    const base = getBase();
    try {
      const { data } = await axios.post(
        `${base}/api/admin/create-booking-ai.php`,
        { ...booking, raw_input: rawInput, sheet_tab_name: sheetTabName },
        { headers: await headers(), timeout: 30000 },
      );
      if (!data?.success) throw new Error(data?.errors?.join(', ') || 'Failed to create booking');
      return data as AiCreateResult;
    } catch (error) {
      throw new Error(apiMessage(error, 'Failed to create booking'));
    }
  },

  async testSheets(sheetTabName: string): Promise<{ success: boolean; detail: string }> {
    const base = getBase();
    const url = `${base}/api/admin/test-sheets-sync.php?tab_name=${encodeURIComponent(sheetTabName)}`;
    try {
      const { data } = await axios.get(url, { headers: await headers(), timeout: 20000 });
      if (data?.success) return { success: true, detail: `Google Sheets OK — tab "${data.tab_name || sheetTabName}" is reachable.` };
      const lines = [
        data?.credentials_readable === false ? `Credentials not found at: ${data.credentials_path}` : '',
        ...(Array.isArray(data?.checks) ? data.checks : []),
        data?.service_account_email ? `Share the spreadsheet with ${data.service_account_email}` : '',
      ].filter(Boolean);
      return { success: false, detail: lines.join('\n') || 'Google Sheets connection failed.' };
    } catch (error) {
      throw new Error(apiMessage(error, 'Sheets test failed'));
    }
  },

  async resync(invoiceNo: number, sheetTabName: string): Promise<AiCreateResult> {
    const base = getBase();
    try {
      const { data } = await axios.post(
        `${base}/api/admin/resync-sheet-booking.php`,
        { invoice_no: invoiceNo, sheet_tab_name: sheetTabName },
        { headers: await headers(), timeout: 30000 },
      );
      if (!data?.success) throw new Error(data?.errors?.join(', ') || data?.sheet_sync_error || 'Sheet resync failed');
      return data as AiCreateResult;
    } catch (error) {
      throw new Error(apiMessage(error, 'Sheet resync failed'));
    }
  },

  async executeCommand(command: string): Promise<{ message: string; rows: Record<string, unknown>[] | null }> {
    const base = getBase();
    try {
      const { data } = await axios.post(
        `${base}/api/admin/execute-command.php`,
        { command },
        { headers: await headers(), timeout: 30000 },
      );
      if (!data?.success) return { message: data?.message || 'Command failed', rows: null };
      const rows = Array.isArray(data.data) ? data.data as Record<string, unknown>[] : null;
      return { message: data.message || 'Done.', rows };
    } catch (error) {
      throw new Error(apiMessage(error, 'Command failed'));
    }
  },
};
