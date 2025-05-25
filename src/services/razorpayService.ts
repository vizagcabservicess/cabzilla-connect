
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
  orderData: RazorpayOrderResponse,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
): Promise<void> => {
  const isLoaded = await initRazorpay();
  if (!isLoaded) {
    throw new Error('Razorpay SDK failed to load');
  }

  const options = {
    key: process.env.VITE_RAZORPAY_KEY_ID,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'Your Company Name',
    description: 'Payment for booking',
    order_id: orderData.id,
    handler: onSuccess,
    prefill: {
      name: '',
      email: '',
      contact: ''
    },
    theme: {
      color: '#3B82F6'
    }
  };

  const razorpay = new (window as any).Razorpay(options);
  razorpay.on('payment.failed', onError);
  razorpay.open();
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (
  response: RazorpayResponse
): Promise<boolean> => {
  try {
    const verifyResponse = await fetch('/api/verify-razorpay-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    });

    const result = await verifyResponse.json();
    return result.success;
  } catch (error) {
    console.error('Error verifying payment:', error);
    return false;
  }
};
