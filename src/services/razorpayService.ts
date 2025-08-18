import { toast } from "sonner";
import { BookingRequest } from "@/types/api";
import { getApiUrl, apiBaseUrl } from "@/config/api";

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
    const primaryUrl = getApiUrl("/api/create-razorpay-order");
    const fallbackUrl = `https://www.vizagtaxihub.com/api/create-razorpay-order.php`;

    const buildBody = (amt: number) => {
      const body: any = { amount: Math.round(amt) };
      if (bookingId) body.booking_id = bookingId;
      return body;
    };

    const doPost = async (url: string, body: any) => fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: 'cors'
    });

    let response: Response | null = null;
    let lastError: any = null;

    // Try primary (rupees)
    try {
      response = await doPost(primaryUrl, buildBody(amount));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (e) {
      lastError = e;
    }

    // If primary failed, try primary (paise)
    if (!response || !response.ok) {
      try {
        response = await doPost(primaryUrl, buildBody(amount * 100));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (e) {
        lastError = e;
      }
    }

    // If still failed, try fallback (rupees)
    if (!response || !response.ok) {
      try {
        response = await doPost(fallbackUrl, buildBody(amount));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (e) {
        lastError = e;
      }
    }

    // If still failed, try fallback (paise)
    if (!response || !response.ok) {
      response = await doPost(fallbackUrl, buildBody(amount * 100));
    }
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Razorpay order error body:', text);
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
    const primaryUrl = getApiUrl("/api/verify-razorpay-payment");
    const fallbackUrl = `https://www.vizagtaxihub.com/api/verify-razorpay-payment.php`;
    const doPost = async (url: string) => fetch(url, {
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
      mode: 'cors'
    });
    let response: Response;
    try {
      response = await doPost(primaryUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (e) {
      response = await doPost(fallbackUrl);
    }
    
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
