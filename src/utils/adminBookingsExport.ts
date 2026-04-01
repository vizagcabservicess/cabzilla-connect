import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns';
import type { Booking } from '@/types/api';

export function bookingPickupInDateRange(
  pickupDateStr: string | undefined,
  fromStr: string,
  toStr: string
): boolean {
  const hasFrom = fromStr.trim() !== '';
  const hasTo = toStr.trim() !== '';
  if (!hasFrom && !hasTo) return true;
  if (!pickupDateStr) return false;
  const pickup = new Date(pickupDateStr);
  if (!isValid(pickup)) return true;
  if (hasFrom) {
    const from = startOfDay(parseISO(fromStr));
    if (pickup < from) return false;
  }
  if (hasTo) {
    const to = endOfDay(parseISO(toStr));
    if (pickup > to) return false;
  }
  return true;
}

function escapeCsvCell(value: string): string {
  const s = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function bookingsToCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h] ?? '')).join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n');
}

export function buildBookingExportRows(
  bookings: Booking[],
  formatDateTime: (d: string) => string,
  formatPassengerPhone: (phone?: string, code?: string | null) => string,
  formatPickup: (loc: string) => string,
  formatDrop: (loc: string) => string,
  formatMoney: (n: number) => string
): Record<string, string>[] {
  return bookings.map((b) => ({
    'Booking #': b.bookingNumber ?? String(b.id ?? ''),
    Passenger: b.passengerName ?? '',
    Phone: formatPassengerPhone(b.passengerPhone, b.passengerCountryCode),
    Pickup: formatPickup(b.pickupLocation ?? ''),
    Drop: formatDrop(b.dropLocation ?? ''),
    'Pickup date': formatDateTime(b.pickupDate ?? ''),
    Vehicle: b.cabType ?? '',
    Amount: formatMoney(Number(b.totalAmount ?? 0)),
    Status: b.status ?? '',
    'Payment status': (b as Booking & { payment_status?: string }).payment_status ?? '—',
  }));
}
