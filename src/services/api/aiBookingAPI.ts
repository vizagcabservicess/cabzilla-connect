import axios from 'axios';
import { format } from 'date-fns';
import { getApiUrl } from '@/config/api';
import { parseBookingText, normalizeVehicleName } from '@/utils/bookingParser';

export const AI_SHEET_TAB_STORAGE_KEY = 'ai_assistant_sheet_tab';

export function defaultAiSheetTabName(): string {
  return format(new Date(), 'MMM yyyy');
}

export function readStoredAiSheetTab(): string {
  try {
    const stored = localStorage.getItem(AI_SHEET_TAB_STORAGE_KEY)?.trim();
    return stored || defaultAiSheetTabName();
  } catch {
    return defaultAiSheetTabName();
  }
}

export const AI_VEHICLE_TYPES = [
  'Sedan',
  'Innova Crysta',
  'Innova',
  'Ertiga',
  'Tempo Traveller 12',
  'Tempo Traveller 17',
  'Tempo Traveller 18',
  'Force Urbania',
] as const;

export const AI_PAYMENT_MODES = ['Cash', 'PhonePe', 'Online', 'UPI'] as const;

export type ParsedBooking = {
  pickup_date: string;
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
};

export type ParseBookingResponse = {
  success: boolean;
  data?: ParsedBooking;
  parse_errors?: string[];
  errors?: string[];
};

export type CreateBookingResponse = {
  success: boolean;
  invoice_no?: number;
  message?: string;
  sheet_synced?: boolean;
  sheet_sync_error?: string | null;
  tab_name?: string;
  errors?: string[];
};

export type SheetsTestResponse = {
  success: boolean;
  spreadsheet_id?: string;
  tab_name?: string;
  credentials_path?: string;
  credentials_readable?: boolean;
  service_account_email?: string | null;
  checks?: string[];
  sample_cell?: string | null;
  errors?: string[];
};

export type ExecuteCommandResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>[] | null;
  action?: string;
};

function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data) {
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        return data.errors.join(', ');
      }
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
    }
    if (error.response?.status === 401) return 'Session expired — please log in again';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Use browser-only parse in dev when explicitly set (avoids network call). */
function preferLocalParseOnly(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_AI_BOOKING_LOCAL_PARSE === 'true';
}

function localParseResponse(
  text: string,
  reason: 'development' | 'api_unavailable',
  apiError?: string
) {
  const local = parseBookingText(text);
  return {
    success: true as const,
    data: local.data,
    parse_errors: local.parse_errors,
    parsed_locally: true as const,
    local_parse_reason: reason,
    api_error: apiError,
  };
}

export const aiBookingAPI = {
  async parseBooking(
    text: string
  ): Promise<
    ParseBookingResponse & {
      parsed_locally?: boolean;
      local_parse_reason?: 'development' | 'api_unavailable';
      api_error?: string;
    }
  > {
    if (preferLocalParseOnly()) {
      return localParseResponse(text, 'development');
    }

    let apiError: string | undefined;
    try {
      const { data, status } = await axios.post<ParseBookingResponse>(
        getApiUrl('/api/admin/parse-booking.php'),
        { text },
        { headers: adminHeaders(), timeout: 12000, validateStatus: () => true }
      );
      if (data?.success && data.data) {
        return data;
      }
      if (typeof data === 'object' && data && Array.isArray(data.errors) && data.errors.length > 0) {
        apiError = data.errors.join(', ');
      } else if (status === 401) {
        apiError = 'Unauthorized — log in again as admin';
      } else if (status === 404) {
        apiError = 'parse-booking.php not found on server';
      } else if (status >= 500) {
        apiError = apiError || `Server error (${status})`;
      } else {
        apiError = 'Unexpected API response';
      }
    } catch (error) {
      apiError = formatApiError(error, 'Network error reaching parse API');
    }

    return localParseResponse(text, 'api_unavailable', apiError);
  },

  async createBooking(
    booking: ParsedBooking,
    rawInput?: string,
    sheetTabName?: string
  ): Promise<CreateBookingResponse> {
    try {
      const tab = sheetTabName?.trim();
      const { data } = await axios.post<CreateBookingResponse>(
        getApiUrl('/api/admin/create-booking-ai.php'),
        { ...booking, raw_input: rawInput, sheet_tab_name: tab },
        { headers: adminHeaders() }
      );
      if (!data.success) {
        throw new Error(data.errors?.join(', ') || 'Failed to create booking');
      }
      return data;
    } catch (error) {
      if (error instanceof Error && !axios.isAxiosError(error)) throw error;
      throw new Error(formatApiError(error, 'Failed to create booking'));
    }
  },

  async executeCommand(command: string): Promise<ExecuteCommandResponse> {
    try {
      const { data } = await axios.post<ExecuteCommandResponse>(
        getApiUrl('/api/admin/execute-command.php'),
        { command },
        { headers: adminHeaders() }
      );
      return data;
    } catch (error) {
      throw new Error(formatApiError(error, 'Command failed'));
    }
  },

  async resyncSheetBooking(
    invoiceNo: number,
    sheetTabName?: string
  ): Promise<CreateBookingResponse> {
    try {
      const tab = sheetTabName?.trim();
      const { data } = await axios.post<CreateBookingResponse>(
        getApiUrl('/api/admin/resync-sheet-booking.php'),
        { invoice_no: invoiceNo, sheet_tab_name: tab },
        { headers: adminHeaders() }
      );
      if (!data.success) {
        throw new Error(data.errors?.join(', ') || data.sheet_sync_error || 'Sheet resync failed');
      }
      return data;
    } catch (error) {
      if (error instanceof Error && !axios.isAxiosError(error)) throw error;
      throw new Error(formatApiError(error, 'Sheet resync failed'));
    }
  },

  async testSheetsSync(sheetTabName?: string): Promise<SheetsTestResponse> {
    try {
      const tab = sheetTabName?.trim();
      const url = tab
        ? `${getApiUrl('/api/admin/test-sheets-sync.php')}?tab_name=${encodeURIComponent(tab)}`
        : getApiUrl('/api/admin/test-sheets-sync.php');
      const { data } = await axios.get<SheetsTestResponse>(url, {
        headers: adminHeaders(),
        timeout: 20000,
      });
      return data;
    } catch (error) {
      throw new Error(formatApiError(error, 'Sheets test failed'));
    }
  },
};

/** Display DD-MM-YYYY from YYYY-MM-DD */
export function formatPickupDateDisplay(ymd: string): string {
  if (!ymd) return '—';
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return ymd;
}

export function formatRupee(amount: number | string): string {
  const n = typeof amount === 'string' ? parseInt(amount, 10) : amount;
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

export const REQUIRED_BOOKING_FIELDS = [
  'customer_name',
  'customer_mobile',
  'pickup_location',
  'drop_location',
  'pickup_date',
  'cost',
  'vehicle_type',
] as const;

export function validateBookingClient(data: Partial<ParsedBooking>): string[] {
  const errors: string[] = [];
  const mobile = (data.customer_mobile ?? '').replace(/\D/g, '');
  if (mobile.length !== 10) errors.push('Customer mobile must be 10 digits');
  if (!data.pickup_location?.trim()) errors.push('Pickup location is required');
  if (!data.drop_location?.trim()) errors.push('Drop location is required');
  if (!data.customer_name?.trim()) errors.push('Customer name is required');
  if (!data.pickup_date) errors.push('Pickup date is required');
  else {
    const d = new Date(data.pickup_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) errors.push('Pickup date cannot be in the past');
  }
  if (!data.cost || data.cost <= 0) errors.push('Cost must be greater than 0');
  const vehicle = normalizeVehicleName(data.vehicle_type ?? '', data.seating_capacity ?? 0);
  if (!vehicle || !AI_VEHICLE_TYPES.includes(vehicle as typeof AI_VEHICLE_TYPES[number])) {
    errors.push('Select a valid vehicle type');
  }
  return errors;
}

/** Parse search alert departure e.g. "16 Jun, 3:15 pm" → { date, time } */
export function parseSearchAlertDeparture(departure: string): { date: string; time: string } {
  const trimmed = departure.trim();
  if (!trimmed) return { date: '', time: '' };

  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+),?\s*(.*)$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = match[2];
    const rest = match[3].trim();
    const year = new Date().getFullYear();
    const parsed = new Date(`${day} ${monthStr} ${year}`);
    if (!Number.isNaN(parsed.getTime())) {
      const ymd = parsed.toISOString().slice(0, 10);
      return { date: ymd, time: rest };
    }
  }

  const ts = Date.parse(trimmed);
  if (!Number.isNaN(ts)) {
    return { date: new Date(ts).toISOString().slice(0, 10), time: '' };
  }

  return { date: '', time: trimmed };
}

/** Map search alert trip type to booking trip type */
export function mapSearchAlertTripType(tripType: string): string {
  const t = tripType.toLowerCase();
  if (t.includes('round')) return 'Round Trip';
  if (t.includes('local')) return 'Local';
  return 'One Way';
}

/** Strip +91 from guest phone */
export function normalizeGuestPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? digits : phone.replace(/\s/g, '');
}
