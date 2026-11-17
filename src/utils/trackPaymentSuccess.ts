/**
 * Track a successful payment.
 *
 * Google Analytics 4 / Google Ads receive a single `purchase` event. `payment_success`
 * is not sent to gtag: both were key events, so each booking was counted twice.
 * `purchase.value` is the amount collected now (the advance on a partial payment).
 * `purchase.transaction_id` is the booking ID so Ads can drop duplicate bookings.
 *
 * Visitor Analytics still receives `vth:track` with `type: 'payment_success'`.
 */
export interface TrackPaymentSuccessPayload {
  /** Gateway payment id (Razorpay). Not used as the Ads transaction id when a booking id exists. */
  transactionId?: string | null;
  bookingId?: string | number | null;
  bookingNumber?: string | null;
  /** Amount collected on this payment. Sent as `purchase.value`. */
  amount: number;
  currency?: string;
  paymentMethod?: string;
  paymentMode?: string;
  tripType?: string;
  itemName?: string;
  itemCategory?: string;
  flow?: string;
}

const SESSION_TRACKED_KEY = 'vth_tracked_payment_ids';
const inMemoryTrackedIds = new Set<string>();

function buildDedupKey(payload: TrackPaymentSuccessPayload): string | null {
  const tx = String(payload.transactionId || '').trim();
  if (tx) return `tx:${tx}`;
  const bid = payload.bookingId != null ? String(payload.bookingId).trim() : '';
  const bn = String(payload.bookingNumber || '').trim();
  if (bid || bn) return `bk:${bid || bn}:${Math.round(Number(payload.amount) || 0)}`;
  return null;
}

function alreadyTracked(key: string | null): boolean {
  if (!key) return false;
  if (inMemoryTrackedIds.has(key)) return true;
  try {
    const raw = sessionStorage.getItem(SESSION_TRACKED_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(key);
  } catch {
    return false;
  }
}

function resolvePurchaseTransactionId(payload: TrackPaymentSuccessPayload): string {
  const bookingId = payload.bookingId != null ? String(payload.bookingId).trim() : '';
  if (bookingId) return bookingId;
  const bookingNumber = String(payload.bookingNumber || '').trim();
  if (bookingNumber) return bookingNumber;
  const gatewayId = String(payload.transactionId || '').trim();
  if (gatewayId) return gatewayId;
  return `pay_${Date.now()}`;
}

function markTracked(key: string | null): void {
  if (!key) return;
  inMemoryTrackedIds.add(key);
  try {
    const raw = sessionStorage.getItem(SESSION_TRACKED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? [...list.slice(-24), key] : [key];
    sessionStorage.setItem(SESSION_TRACKED_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}

export function trackPaymentSuccess(payload: TrackPaymentSuccessPayload): void {
  if (typeof window === 'undefined') return;

  const dedupKey = buildDedupKey(payload);
  if (alreadyTracked(dedupKey)) return;
  markTracked(dedupKey);

  const numericAmount = Number(payload.amount);
  const value = Number.isFinite(numericAmount) && numericAmount > 0 ? Math.round(numericAmount * 100) / 100 : 0;
  const currency = payload.currency || 'INR';
  const transactionId = resolvePurchaseTransactionId(payload);
  const gatewayPaymentId = String(payload.transactionId || '').trim();
  const paymentMethod = payload.paymentMethod || 'razorpay';
  const itemName = payload.itemName || 'Cab Booking';
  const itemCategory = payload.itemCategory || payload.tripType || payload.flow || 'booking';
  const pagePath = window.location.pathname;

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'purchase', {
        transaction_id: transactionId,
        value,
        currency,
        payment_type: paymentMethod,
        payment_id: gatewayPaymentId || undefined,
        booking_id: payload.bookingId != null ? String(payload.bookingId) : undefined,
        booking_number: payload.bookingNumber || undefined,
        items: [
          {
            item_id: String(payload.bookingId ?? payload.bookingNumber ?? transactionId),
            item_name: itemName,
            item_category: itemCategory,
            price: value,
            quantity: 1,
          },
        ],
        transport_type: 'beacon',
      });
    } catch {
      // Ignore analytics errors
    }
  }

  try {
    document.dispatchEvent(
      new CustomEvent('vth:track', {
        detail: {
          type: 'payment_success',
          name: payload.flow || 'payment_success',
          meta: {
            transactionId,
            bookingId: payload.bookingId,
            bookingNumber: payload.bookingNumber,
            amount: value,
            currency,
            paymentMethod,
            paymentMode: payload.paymentMode,
            tripType: payload.tripType,
            path: pagePath,
          },
        },
      }),
    );
  } catch {
    // Tracker may not be loaded yet — ignore
  }
}
