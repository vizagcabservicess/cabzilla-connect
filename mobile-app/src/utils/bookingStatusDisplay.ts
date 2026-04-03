import { colors } from '../theme/colors';

type EffectiveInput = {
  status?: string | null;
  createdBy?: string | null;
  created_by?: string | null;
};

/** Same rules as web: empty status + created_by admin ⇒ admin_created (handles narrow DB ENUM). */
export function getEffectiveBookingStatus(booking: EffectiveInput): string {
  const raw = String(booking.status ?? '').trim();
  if (raw) return raw;
  const created = String(booking.createdBy ?? booking.created_by ?? '')
    .trim()
    .toLowerCase();
  if (created === 'admin') return 'admin_created';
  return 'pending';
}

export function formatBookingStatus(status: string): string {
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
