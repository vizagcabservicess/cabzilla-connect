import axios from 'axios';
import { API_BASE_URL } from '@/config';

export type VendorTripPhase = 'start' | 'end' | 'closed' | 'cancelled';

export interface VendorTripView {
  code: string;
  when: string;
  from: string;
  to: string;
  guestName: string;
  guestPhone: string;
  guestCountryCode: string;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  cabType: string;
  endWhen: string;
  startAt: string;
  endAt: string;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
  tripType: string;
  tripMode: string;
  collects: boolean;
  amount: number | null;
  advance: number | null;
  flight: string;
  mapUrl: string;
  notes: string[];
  places: string[];
  phase: VendorTripPhase;
  reupload: '' | 'start' | 'end';
  startKm: number | null;
  endKm: number | null;
  kilometers: number | null;
}

export interface VendorTripLink {
  url: string;
  phone: string;
  message: string;
  driverName: string;
  vehicleNumber: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string') {
    const message = (data as { message: string }).message.trim();
    if (message) return message;
  }
  return fallback;
}

async function send(url: string, init: { method: 'GET' | 'POST'; body?: BodyInit; headers?: Record<string, string> }): Promise<Record<string, unknown>> {
  const response = await axios.request({
    method: init.method,
    url,
    data: init.body,
    headers: init.headers,
    timeout: 30000,
    validateStatus: () => true,
  });
  const data = response.data;
  if (!data || typeof data !== 'object' || (data as { status?: string }).status !== 'success') {
    throw new Error(errorMessage(data, 'Request failed'));
  }
  return data as Record<string, unknown>;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readFirst(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = readText(row[key]);
    if (value) return value;
  }
  return '';
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readCoord(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = readNumber(row[key]);
    if (value != null) return value;
  }
  return null;
}

function readLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim());
}

function readTrip(data: Record<string, unknown>): VendorTripView {
  const trip = data.trip;
  if (!trip || typeof trip !== 'object') {
    throw new Error('Trip details were not returned');
  }
  const row = trip as Record<string, unknown>;
  const phase = row.phase;
  const known: VendorTripPhase[] = ['start', 'end', 'closed', 'cancelled'];
  return {
    code: readText(row.code),
    when: readText(row.when),
    from: readText(row.from),
    to: readText(row.to),
    guestName: readText(row.guestName),
    guestPhone: readText(row.guestPhone),
    guestCountryCode: readText(row.guestCountryCode),
    driverName: readText(row.driverName),
    driverPhone: readFirst(row, ['driverPhone', 'driverMobile', 'driver_phone', 'driver_mobile', 'vendorPhone', 'vendorMobile']),
    vehicleNumber: readText(row.vehicleNumber),
    endWhen: readFirst(row, ['endWhen', 'endTime', 'returnWhen', 'returnDate', 'toWhen', 'dropTime']),
    startAt: readFirst(row, ['startAt', 'startedAt', 'openingAt']),
    endAt: readFirst(row, ['endAt', 'endedAt', 'closingAt']),
    startLat: readCoord(row, ['startLat', 'openingLat', 'startLatitude']),
    startLng: readCoord(row, ['startLng', 'openingLng', 'startLongitude']),
    endLat: readCoord(row, ['endLat', 'closingLat', 'endLatitude']),
    endLng: readCoord(row, ['endLng', 'closingLng', 'endLongitude']),
    cabType: readText(row.cabType),
    tripType: readText(row.tripType),
    tripMode: readText(row.tripMode),
    collects: row.collects !== false,
    amount: readNumber(row.amount),
    advance: readNumber(row.advance),
    flight: readText(row.flight),
    mapUrl: readText(row.mapUrl),
    notes: readLines(row.notes),
    places: readLines(row.places),
    phase: known.includes(phase as VendorTripPhase) ? (phase as VendorTripPhase) : 'start',
    reupload: row.reupload === 'start' || row.reupload === 'end' ? row.reupload : '',
    startKm: readNumber(row.startKm),
    endKm: readNumber(row.endKm),
    kilometers: readNumber(row.kilometers),
  };
}

async function publicRequest(path: string, init: { method: 'GET' | 'POST'; body?: BodyInit }): Promise<Record<string, unknown>> {
  const relative = `/api/vendor/${path}`;
  const absolute = `${API_BASE_URL}/api/vendor/${path}`;
  try {
    return await send(relative, init);
  } catch (error) {
    if (error instanceof Error && /invalid or has expired|already|photograph|reading|picture|phone|name/i.test(error.message)) {
      throw error;
    }
    return send(absolute, init);
  }
}

export const vendorTripAPI = {
  async getTrip(token: string): Promise<VendorTripView> {
    const data = await publicRequest(`trip-link.php?token=${encodeURIComponent(token)}`, { method: 'GET' });
    return readTrip(data);
  },

  async readReading(token: string, photo: File): Promise<number | null> {
    const body = new FormData();
    body.set('token', token);
    body.set('action', 'read');
    body.set('photo', photo);
    const data = await publicRequest('trip-link.php', { method: 'POST', body });
    const reading = data.reading;
    return typeof reading === 'number' && Number.isFinite(reading) && reading > 0 ? Math.round(reading) : null;
  },

  async submitReading(
    token: string,
    action: 'start' | 'end',
    km: number,
    photo: File,
    gps: { lat: number; lng: number; accuracy: number; at: string },
  ): Promise<VendorTripView> {
    const body = new FormData();
    body.set('token', token);
    body.set('action', action);
    body.set('km', String(km));
    body.set('photo', photo);
    body.set('lat', String(gps.lat));
    body.set('lng', String(gps.lng));
    body.set('accuracy', String(Math.round(gps.accuracy)));
    body.set('recordedAt', gps.at);
    const data = await publicRequest('trip-link.php', { method: 'POST', body });
    return readTrip(data);
  },

  async placeName(lat: number, lng: number): Promise<string> {
    try {
      const data = await publicRequest(`place.php?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, { method: 'GET' });
      return typeof data.place === 'string' ? data.place.trim() : '';
    } catch {
      return '';
    }
  },

  async notifyOffice(
    token: string,
    action: 'start' | 'end',
    details: { lat: number; lng: number; phone: string; place: string },
  ): Promise<void> {
    const payload = JSON.stringify({ token, action, ...details });
    const init = {
      method: 'POST' as const,
      body: payload,
      headers: { 'Content-Type': 'application/json' },
    };
    try {
      await send('/api/vendor/trip-alert.php', init);
    } catch (error) {
      if (error instanceof Error && /invalid or has expired|already/i.test(error.message)) return;
      await send(`${API_BASE_URL}/api/vendor/trip-alert.php`, init);
    }
  },

  async officeReadings(bookingIds: number[]): Promise<Array<{ bookingId: number; startKm: number | null; endKm: number | null; startedAt: string; endedAt: string; startCleared: boolean; endCleared: boolean }>> {
    if (bookingIds.length === 0) return [];
    const init = {
      method: 'POST' as const,
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'office', bookingIds }),
    };
    let data: Record<string, unknown>;
    try {
      data = await send('/api/vendor/trip-link.php', init);
    } catch (error) {
      if (error instanceof Error && /unauthorized|privileges/i.test(error.message)) throw error;
      data = await send(`${API_BASE_URL}/api/vendor/trip-link.php`, init);
    }
    const rows = Array.isArray(data.readings) ? data.readings : [];
    return rows.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const bookingId = readNumber(row.bookingId);
      if (bookingId == null) return [];
      return [{
        bookingId,
        startKm: row.startCleared === true ? null : readNumber(row.startKm),
        endKm: row.endCleared === true ? null : readNumber(row.endKm),
        startedAt: row.startCleared === true ? '' : (typeof row.startedAt === 'string' ? row.startedAt : ''),
        endedAt: row.endCleared === true ? '' : (typeof row.endedAt === 'string' ? row.endedAt : ''),
        startCleared: row.startCleared === true,
        endCleared: row.endCleared === true,
      }];
    });
  },

  async syncOdometer(bookingId: number): Promise<boolean> {
    const data = await send(`${API_BASE_URL}/api/vendor/trip-link.php`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', bookingId }),
    });
    return data.changed === true;
  },

  async clearReading(bookingId: number, side: 'start' | 'end'): Promise<{ phone: string; message: string }> {
    const data = await send(`${API_BASE_URL}/api/vendor/trip-link.php`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear', bookingId, side }),
    });
    return {
      phone: typeof data.phone === 'string' ? data.phone : '',
      message: typeof data.message === 'string' ? data.message : '',
    };
  },

  async revokeLink(bookingId: number): Promise<void> {
    const data = await send(`${API_BASE_URL}/api/vendor/trip-link.php`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke', bookingId }),
    });
    if (data.revoked !== true) {
      throw new Error('The trip link could not be revoked.');
    }
  },

  async createLink(
    bookingId: number,
    fields: {
      driverName: string;
      driverPhone: string;
      vehicleNumber: string;
      collectFromGuest: boolean;
      collectAmount: number | null;
    },
  ): Promise<VendorTripLink> {
    const data = await send(`${API_BASE_URL}/api/vendor/trip-link.php`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', bookingId, ...fields }),
    });
    return {
      url: typeof data.url === 'string' ? data.url : '',
      phone: typeof data.phone === 'string' ? data.phone : '',
      message: typeof data.message === 'string' ? data.message : '',
      driverName: typeof data.driverName === 'string' ? data.driverName : '',
      vehicleNumber: typeof data.vehicleNumber === 'string' ? data.vehicleNumber : '',
    };
  },
};
