import axios from 'axios';
import { API_BASE_URL } from '@/config';

export interface OfficeDutyView {
  needsReceipt: boolean;
  canStart: boolean;
  canEnd: boolean;
  isLastOpenDay: boolean;
}

export interface OfficeFleetVehicle {
  id: number;
  vehicleNumber: string;
  name: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
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

async function request(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<Record<string, unknown>> {
  const headers = authHeaders();
  const relativeUrl = `/api/driver/${path}`;
  const absoluteUrl = `${API_BASE_URL}/api/driver/${path}`;
  const send = (url: string) => axios.request({
    method,
    url,
    headers,
    data: body,
    timeout: 20000,
    validateStatus: () => true,
  });

  let response: Awaited<ReturnType<typeof send>> | null = null;
  try {
    response = await send(relativeUrl);
  } catch {
    response = null;
  }
  const relativeOk = response !== null
    && response.status < 400
    && response.data
    && typeof response.data === 'object'
    && response.data.status === 'success';
  if (!relativeOk) {
    try {
      response = await send(absoluteUrl);
    } catch {
      throw new Error('Could not reach the server');
    }
  }

  if (!response) {
    throw new Error('Could not reach the server');
  }
  const data = response.data;
  if (!data || typeof data !== 'object' || data.status !== 'success') {
    throw new Error(errorMessage(data, 'Request failed'));
  }
  return data as Record<string, unknown>;
}

function readDuty(data: Record<string, unknown>): OfficeDutyView {
  return {
    needsReceipt: data.needsReceipt === true,
    canStart: data.canStart === true,
    canEnd: data.canEnd === true,
    isLastOpenDay: data.isLastOpenDay !== false,
  };
}

export const driverOfficeTripAPI = {
  async getDuty(bookingId: number): Promise<OfficeDutyView> {
    const data = await request('GET', `duty-days.php?bookingId=${bookingId}`);
    return readDuty(data);
  },

  async confirmReceipt(bookingId: number): Promise<OfficeDutyView> {
    const data = await request('POST', 'duty-segment.php', { bookingId, action: 'confirm' });
    return readDuty(data);
  },

  async saveOdometer(bookingId: number, readingType: 'start' | 'end', odometerValue: number): Promise<void> {
    await request('POST', 'odometer-readings.php', {
      bookingId,
      readingType,
      odometerValue,
      imageUrl: '',
      capturedAt: new Date().toISOString(),
    });
  },

  async setStatus(
    bookingId: number,
    status: 'in_progress' | 'completed',
    payment?: {
      collectedAmount: number;
      paymentType: string;
      extraCollectedAmount?: number;
      extraCollectedCategory?: string | null;
    },
  ): Promise<{ tripCompleted: boolean }> {
    const payload: Record<string, unknown> = { bookingId, status };
    if (status === 'completed' && payment) {
      payload.collectedAmount = payment.collectedAmount;
      payload.paymentType = payment.paymentType;
      if (payment.extraCollectedAmount != null && Number.isFinite(payment.extraCollectedAmount)) {
        payload.extraCollectedAmount = payment.extraCollectedAmount;
        payload.extraCollectedCategory = payment.extraCollectedCategory ?? '';
      }
    }
    const data = await request('PATCH', 'trip-status.php', payload);
    const nested = data.data;
    const tripCompleted = nested && typeof nested === 'object' && 'tripCompleted' in nested
      ? (nested as { tripCompleted?: unknown }).tripCompleted !== false
      : status === 'completed';
    return { tripCompleted: status === 'completed' && tripCompleted };
  },

  async endDutyDay(bookingId: number): Promise<{ tripCompleted: boolean }> {
    const data = await request('POST', 'duty-segment.php', { bookingId, action: 'end' });
    return { tripCompleted: data.tripCompleted === true };
  },

  async getVehicles(): Promise<OfficeFleetVehicle[]> {
    const data = await request('GET', 'vehicles.php');
    const rows = Array.isArray(data.vehicles) ? data.vehicles : [];
    return rows.map((row) => {
      const item = row as { id?: unknown; vehicleNumber?: unknown; name?: unknown };
      return {
        id: Number(item.id) || 0,
        vehicleNumber: typeof item.vehicleNumber === 'string' ? item.vehicleNumber : '',
        name: typeof item.name === 'string' ? item.name : '',
      };
    }).filter((vehicle) => vehicle.id > 0);
  },

  async saveFuel(params: {
    vehicleId: number;
    bookingId: number;
    quantity: number;
    pricePerUnit: number;
    totalCost: number;
    odometer: number;
    fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
    paymentMethod: 'card' | 'upi' | 'customer_advance' | 'company_paid';
    fuelStation?: string;
    cardLastFour?: string;
  }): Promise<void> {
    await request('POST', 'fuel-entry.php', params);
  },
};
