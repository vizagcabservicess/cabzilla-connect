
import { toast } from "sonner";

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

// Initialize Razorpay SDK
export const initRazorpay = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      toast.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Create a Razorpay order
export const createRazorpayOrder = async (
  amount: number,
  currency = 'INR'
): Promise<RazorpayOrderResponse | null> => {
  try {
    // This would typically call your backend API
    const response = await fetch('/api/create-razorpay-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency }),
    });

    if (!response.ok) {
      throw new Error('Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
};

// Open Razorpay checkout
export const openRazorpayCheckout = async (
  options: RazorpayOptions,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
): Promise<void> => {
  const isLoaded = await initRazorpay();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load');
  }

  const razorpay = new (window as any).Razorpay({
    ...options,
    handler: onSuccess,
  });
  razorpay.on('payment.failed', onError);
  razorpay.open();
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
  bookingId?: number
): Promise<boolean> => {
  try {
    const verifyResponse = await fetch('/api/verify-razorpay-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        booking_id: bookingId
      }),
    });

    const result = await verifyResponse.json();
    return result.success;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
};
