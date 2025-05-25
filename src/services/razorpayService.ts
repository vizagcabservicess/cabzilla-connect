
// Razorpay service for handling payments
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export const initRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const createRazorpayPayment = (options: RazorpayOptions) => {
  if (window.Razorpay) {
    const rzp = new window.Razorpay(options);
    rzp.open();
    return rzp;
  } else {
    throw new Error('Razorpay SDK not loaded');
  }
};

export const createRazorpayOrder = async (amount: number) => {
  // Mock implementation - in real app, this would call your backend
  return {
    id: `order_${Date.now()}`,
    amount: amount * 100, // Convert to paisa
    currency: 'INR',
    status: 'created'
  };
};

export const openRazorpayCheckout = (
  options: RazorpayOptions,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
) => {
  const rzpOptions = {
    ...options,
    handler: (response: RazorpayResponse) => {
      onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        onError(new Error('Payment cancelled by user'));
      }
    }
  };

  if (window.Razorpay) {
    const rzp = new window.Razorpay(rzpOptions);
    rzp.open();
  } else {
    onError(new Error('Razorpay SDK not loaded'));
  }
};

export const verifyRazorpayPayment = async (
  paymentId: string,
  orderId: string,
  signature: string
) => {
  // Mock implementation - in real app, this would call your backend for verification
  console.log('Verifying payment:', { paymentId, orderId, signature });
  return true;
};
