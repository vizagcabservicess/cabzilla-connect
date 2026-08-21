import type { Booking } from '@/types/api';

type BookingPaymentRecord = Booking & Record<string, unknown>;

/** Guest checkout default: 30% now, rest to the driver. */
export const GUEST_ADVANCE_RATE = 0.3;

function parseMoney(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  const n = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstPositiveAmount(record: BookingPaymentRecord, keys: string[]): number {
  for (const key of keys) {
    const amount = parseMoney(record[key]);
    if (amount > 0) return Math.round(amount);
  }
  return 0;
}

function firstNonEmptyString(record: BookingPaymentRecord, keys: string[]): string {
  for (const key of keys) {
    const raw = record[key];
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text && text.toLowerCase() !== 'n/a' && text.toLowerCase() !== 'na') {
      return text;
    }
  }
  return '';
}

function paymentStatusOf(booking: Booking): string {
  const record = booking as BookingPaymentRecord;
  return String(record.payment_status ?? record.paymentStatus ?? '')
    .trim()
    .toLowerCase();
}

/** Advance actually received (Razorpay 30%, admin partial, or invoice advance). */
export function resolveBookingAdvanceAmount(booking: Booking): number {
  const record = booking as BookingPaymentRecord;
  const recorded = firstPositiveAmount(record, [
    'advance_paid_amount',
    'advancePaidAmount',
    'partialPaymentAmount',
    'partial_payment_amount',
    'advance_amount',
    'advanceAmount',
    'paidAmount',
    'amountPaid',
  ]);
  if (recorded > 0) return recorded;

  const status = paymentStatusOf(booking);
  const fare = Number(record.fare ?? record.totalAmount ?? 0);
  if (
    (status === 'paid' || status === 'payment_received' || record.isPaid === true) &&
    Number.isFinite(fare) &&
    fare > 0
  ) {
    return Math.round(fare);
  }

  return 0;
}

export function resolveBookingPaymentMethod(booking: Booking): string {
  const record = booking as BookingPaymentRecord;
  const method = firstNonEmptyString(record, [
    'payment_method',
    'paymentMethod',
    'advance_payment_mode',
    'advancePaymentMode',
  ]);
  if (method) return method;

  const razorpayId = firstNonEmptyString(record, [
    'razorpay_payment_id',
    'razorpayPaymentId',
  ]);
  if (razorpayId) return 'razorpay';

  const status = paymentStatusOf(booking);
  if (status === 'paid' || status === 'payment_received' || record.isPaid === true) {
    return 'full';
  }

  return 'N/A';
}

export function resolveBookingPendingAmount(fareBase: number, advanceAmount: number): number {
  const fare = Number.isFinite(fareBase) ? fareBase : 0;
  const advance = Number.isFinite(advanceAmount) ? advanceAmount : 0;
  return Math.max(0, Math.round(fare) - Math.round(advance));
}

export function resolveExpectedGuestAdvance(fareBase: number): number {
  const fare = Number(fareBase);
  if (!Number.isFinite(fare) || fare <= 0) return 0;
  return Math.round(fare * GUEST_ADVANCE_RATE);
}

export function isGuestWebsiteBooking(booking: Booking): boolean {
  const createdBy = String(
    (booking as BookingPaymentRecord).createdBy ??
      (booking as BookingPaymentRecord).created_by ??
      '',
  )
    .trim()
    .toLowerCase();
  return createdBy === '' || createdBy === 'null' || createdBy === 'guest' || createdBy === 'customer';
}

export function formatWhatsAppAdvanceLine(
  booking: Booking,
  fareBase: number,
): { line: string; pendingAmount: number; pendingDue: string } {
  const received = resolveBookingAdvanceAmount(booking);
  const mode = resolveBookingPaymentMethod(booking);
  const pendingAmount = resolveBookingPendingAmount(fareBase, received);
  const pendingDue = pendingAmount > 0 ? 'Yes' : 'No';

  if (received > 0) {
    return {
      line: `💳 *Advance:* ₹${received} received, mode: ${mode}`,
      pendingAmount,
      pendingDue,
    };
  }

  const due = isGuestWebsiteBooking(booking) ? resolveExpectedGuestAdvance(fareBase) : 0;
  if (due > 0) {
    return {
      line: `💳 *Advance:* ₹${due} due (30% to reserve), mode: pending`,
      pendingAmount,
      pendingDue,
    };
  }

  return {
    line: `💳 *Advance:* ₹0, mode: ${mode}`,
    pendingAmount,
    pendingDue,
  };
}
