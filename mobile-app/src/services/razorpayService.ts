/**
 * Razorpay API service for mobile app.
 * Handles create order and verify payment; checkout UI is platform-specific (web vs native).
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

const BASE = API_BASE_URL || 'https://www.vizagtaxihub.com';

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export const RAZORPAY_KEY = 'rzp_live_R6nt1S648RxpNC';

/**
 * Create a Razorpay order. Amount in rupees.
 */
export async function createRazorpayOrder(
  amount: number,
  bookingId?: number | string
): Promise<RazorpayOrderResponse | null> {
  try {
    const body: Record<string, unknown> = { amount: Math.round(amount) };
    if (bookingId != null) body.booking_id = String(bookingId);

    const { data } = await axios.post(`${BASE}/api/create-razorpay-order.php`, body, {
      headers: { 'Content-Type': 'application/json' },
    });

    return data?.order ?? null;
  } catch (error) {
    console.error('createRazorpayOrder error:', error);
    return null;
  }
}

/**
 * Verify Razorpay payment on server.
 */
export async function verifyRazorpayPayment(
  paymentId: string,
  orderId: string,
  signature: string,
  bookingId?: number | string
): Promise<boolean> {
  try {
    const { data } = await axios.post(`${BASE}/api/verify-razorpay-payment.php`, {
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      razorpay_signature: signature,
      booking_id: bookingId != null ? String(bookingId) : undefined,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return data?.success === true;
  } catch (error) {
    console.error('verifyRazorpayPayment error:', error);
    return false;
  }
}

/** Load Razorpay checkout.js for web. */
export function initRazorpayWeb(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      resolve(false);
      return;
    }
    const w = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {})) as { Razorpay?: unknown };
    if (w?.Razorpay && typeof w.Razorpay === 'function') {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Open Razorpay checkout on web (after initRazorpayWeb). */
export function openRazorpayWeb(
  order: RazorpayOrderResponse,
  options: { name: string; description: string; prefill: { name: string; email: string; contact: string }; themeColor: string },
  onSuccess: (res: RazorpayResponse) => void,
  onFailure: (err: { description?: string }) => void,
  onClose: () => void
): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const w = (typeof window !== 'undefined' ? window : globalThis) as { Razorpay?: new (opts: unknown) => { open: () => void; on: (event: string, cb: (res: unknown) => void) => void } };
  const Razorpay = w?.Razorpay;
  if (typeof Razorpay !== 'function') {
    onFailure({ description: 'Razorpay SDK not loaded' });
    return;
  }
  const rzp = new Razorpay({
    key: RAZORPAY_KEY,
    amount: order.amount,
    currency: order.currency || 'INR',
    order_id: order.id,
    name: options.name,
    description: options.description,
    prefill: options.prefill,
    theme: { color: options.themeColor },
    handler: (res: RazorpayResponse) => onSuccess(res),
    modal: { ondismiss: () => onClose() },
  });
  rzp.on('payment.failed', (res: unknown) => {
    const r = res as { error?: { description?: string } };
    onFailure(r?.error ?? {});
  });
  rzp.open();
}
