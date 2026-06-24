import { colors } from '../theme/colors';

type EffectiveInput = {
  status?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
  booking_source?: string | null;
  bookingSource?: string | null;
};

function normalizeStatusToken(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, '_');
}

/** Same rules as web: empty status + created_by admin ⇒ admin_created (handles narrow DB ENUM). */
export function getEffectiveBookingStatus(booking: EffectiveInput): string {
  const raw = String(booking.status ?? '').trim();
  if (raw) {
    const normalized = normalizeStatusToken(raw);
    if (normalized === 'pending_offline_booking') return 'pending_offline_booking';
    const source = normalizeStatusToken(
      String(booking.bookingSource ?? booking.booking_source ?? '')
    );
    if (normalized === 'pending' && source === 'ai') return 'pending_offline_booking';
    return raw;
  }
  const created = String(booking.createdBy ?? booking.created_by ?? '')
    .trim()
    .toLowerCase();
  if (created === 'admin') return 'admin_created';
  return 'pending';
}

export function formatBookingStatus(status: string): string {
  if (normalizeStatusToken(status) === 'pending_offline_booking') {
    return 'Pending - Offline Booking';
  }
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Background for trip-status chips (lists / dashboard). */
export function tripStatusBadgeBackground(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'admin_created':
      return '#ede9fe';
    case 'pending_offline_booking':
      return '#e0f2fe';
    case 'pending':
      return '#fef3c7';
    case 'confirmed':
    case 'assigned':
      return '#d1fae5';
    case 'completed':
      return '#dbeafe';
    case 'cancelled':
      return '#fee2e2';
    default:
      return colors.gray200;
  }
}
