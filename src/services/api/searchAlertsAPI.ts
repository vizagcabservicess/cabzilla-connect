import axios from 'axios';
import { getApiUrl } from '@/config/api';

export type SearchAlertVehicleFare = {
  name: string;
  fareText: string;
};

export type SearchAlert = {
  id: number;
  guestPhone: string;
  pickup: string;
  drop: string;
  tripType: string;
  departure: string;
  distanceKmOneWay: number | null;
  durationMinutesOneWay: number | null;
  tripMode: string;
  resultsShown: string;
  vehicleFares: SearchAlertVehicleFare[] | null;
  whatsappMessage: string;
  searchedAt: string;
  createdAt: string;
};

export type SearchAlertsListResponse = {
  success: boolean;
  alerts: SearchAlert[];
  total: number;
  tableReady?: boolean;
  message?: string;
  error?: string;
};

export type SearchAlertsImportStats = {
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  parsed?: number;
  files?: Array<Record<string, unknown>>;
};

export type SearchAlertsImportResponse = {
  success: boolean;
  stats: SearchAlertsImportStats;
  error?: string;
};

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function formatSearchAlertsError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'object' && data && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
    if (typeof data === 'object' && data && 'php_error' in data && typeof data.php_error === 'string') {
      return data.php_error;
    }
    if (error.response?.status === 401) {
      return 'Session expired — please log in again';
    }
    if (error.response?.status === 404) {
      return 'Search alerts API not found — redeploy search-alerts.php with .php in the URL';
    }
    return error.message || 'Failed to load search alerts';
  }
  if (error instanceof Error) return error.message;
  return 'Failed to load search alerts';
}

const adminBase = () => getApiUrl('/api/admin/search-alerts.php');

export const searchAlertsAPI = {
  async list(params?: {
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<SearchAlertsListResponse> {
    try {
      const q = new URLSearchParams({ action: 'list' });
      if (params?.search?.trim()) q.set('search', params.search.trim());
      if (params?.from?.trim()) q.set('from', params.from.trim());
      if (params?.to?.trim()) q.set('to', params.to.trim());
      if (params?.limit) q.set('limit', String(params.limit));

      const { data } = await axios.get<SearchAlertsListResponse>(
        `${adminBase()}?${q.toString()}`,
        { headers: adminHeaders() }
      );
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load search alerts');
      }
      return data;
    } catch (error) {
      throw new Error(formatSearchAlertsError(error));
    }
  },

  async importFromLogs(): Promise<SearchAlertsImportResponse> {
    try {
      const { data } = await axios.post<SearchAlertsImportResponse>(
      `${adminBase()}?action=import-from-logs`,
      { action: 'import-from-logs' },
      { headers: adminHeaders() }
    );
    if (!data?.success) {
      throw new Error(data?.error || 'Import from logs failed');
    }
    return data;
    } catch (error) {
      throw new Error(formatSearchAlertsError(error));
    }
  },

  async importFromWhatsApp(text: string): Promise<SearchAlertsImportResponse> {
    try {
      const { data } = await axios.post<SearchAlertsImportResponse>(
      `${adminBase()}?action=import-from-whatsapp`,
      { action: 'import-from-whatsapp', text },
      { headers: adminHeaders() }
    );
    if (!data?.success) {
      throw new Error(data?.error || 'Import from WhatsApp failed');
    }
    return data;
    } catch (error) {
      throw new Error(formatSearchAlertsError(error));
    }
  },
};
