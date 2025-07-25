import { toast } from "sonner";
import { BookingRequest } from "@/types/api";

// Razorpay types
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

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
export const createRazorpayOrder = async (amount: number, bookingId?: string): Promise<RazorpayOrderResponse | null> => {
  try {
    const requestBody: any = { amount: amount * 100 }; // Convert to paise
    if (bookingId) {
      requestBody.booking_id = bookingId;
    }
    
    const response = await fetch("/api/create-razorpay-order.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error("Failed to create order");
    }
    
    const data = await response.json();
    return data.order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    toast.error("Failed to create order. Please try again.");
    return null;
  }
};

// Open Razorpay payment window
export const openRazorpayCheckout = (
  options: RazorpayOptions,
  onSuccess: (response: RazorpayResponse) => void,
  onError: (error: any) => void
) => {
  if (typeof (window as any).Razorpay !== 'function') {
    toast.error('Razorpay failed to load. Please refresh and try again.');
    return;
  }
  const rzp = new (window as any).Razorpay(options);
  
  // Add event handlers
  rzp.on('payment.success', (response: RazorpayResponse) => {
    onSuccess(response);
  });
  
  rzp.on('payment.error', (response: any) => {
    onError(response.error);
  });
  
  // Open checkout modal
  rzp.open();
};

// Verify payment on server
export const verifyRazorpayPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
  bookingId?: string
): Promise<boolean> => {
  try {
    const response = await fetch("/api/verify-razorpay-payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature,
        booking_id: bookingId
      }),
    });
    
    if (!response.ok) {
      throw new Error("Payment verification failed");
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return false;
  }
};
