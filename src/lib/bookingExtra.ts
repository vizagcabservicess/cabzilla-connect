type BookingExtraFields = {
  totalAmount?: number | null;
  extraCollectedAmount?: number | null;
  extra_collected_amount?: number | null;
  extraCollectedCategory?: string | null;
  extra_collected_category?: string | null;
};

export function extraCollectedAmount(booking: BookingExtraFields): number {
  const raw = booking.extraCollectedAmount ?? booking.extra_collected_amount;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export const EXTRA_COLLECTED_CATEGORIES = [
  { value: 'extra_hours', label: 'Extra hours' },
  { value: 'extra_km', label: 'Extra km' },
  { value: 'tolls', label: 'Tolls' },
  { value: 'other', label: 'Others' },
] as const;

export function extraCollectedCategoryLabel(code: string | null | undefined): string {
  switch ((code || '').trim().toLowerCase()) {
    case 'extra_hours':
      return 'Extra hours';
    case 'extra_km':
      return 'Extra km';
    case 'tolls':
      return 'Tolls';
    case 'other':
      return 'Others';
    default:
      return '';
  }
}

export function bookingAmountWithExtra(booking: BookingExtraFields): number {
  return Number(booking.totalAmount ?? 0) + extraCollectedAmount(booking);
}
