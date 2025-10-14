import { API_BASE_URL } from '@/config';

export interface PaymentTrackingData {
  booking_id: number;
  booking_number: string;
  amount: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  payment_status?: 'initiated' | 'failed' | 'cancelled' | 'successful';
  failure_reason?: string;
  cancellation_reason?: string;
  customer_phone?: string;
  customer_email?: string;
}

export const paymentTrackingService = {
  /**
   * Track payment attempt
   */
  trackAttempt: async (data: PaymentTrackingData) => {
    try {
              const response = await fetch(`https://vizagtaxihub.com/api/payment-tracker-final.php`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  action: 'track_attempt',
                  ...data,
                }),
                redirect: 'follow',
              });

      const result = await response.json();
      return result;
    } catch (error) {
      return { status: 'error', message: 'Failed to track payment attempt' };
    }
  },

  /**
   * Track payment failure
   */
  trackFailure: async (data: PaymentTrackingData & { failure_reason: string; failure_code?: string }) => {
    try {
              const response = await fetch(`https://vizagtaxihub.com/api/payment-tracker-final.php`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  action: 'track_failure',
                  ...data,
                }),
                redirect: 'follow',
              });

      const result = await response.json();
      return result;
    } catch (error) {
      return { status: 'error', message: 'Failed to track payment failure' };
    }
  },

  /**
   * Track payment cancellation
   */
  trackCancellation: async (data: PaymentTrackingData & { 
    cancellation_reason: 'user_cancelled' | 'timeout' | 'system_error' | 'insufficient_funds' | 'card_declined' | 'other';
    cancellation_description?: string;
  }) => {
    try {
              const response = await fetch(`https://vizagtaxihub.com/api/payment-tracker-final.php`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  action: 'track_cancellation',
                  ...data,
                }),
                redirect: 'follow',
              });

      const result = await response.json();
      return result;
    } catch (error) {
      return { status: 'error', message: 'Failed to track payment cancellation' };
    }
  },

  /**
   * Get payment tracking data for a booking
   */
  getTrackingData: async (bookingId?: number, bookingNumber?: string, status?: string) => {
    try {
      const params = new URLSearchParams();
      if (bookingId) params.append('booking_id', bookingId.toString());
      if (bookingNumber) params.append('booking_number', bookingNumber);
      if (status) params.append('status', status);

              const response = await fetch(`https://vizagtaxihub.com/api/payment-tracker-final.php?${params.toString()}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'application/json',
                },
                redirect: 'follow',
              });

      const result = await response.json();
      return result;
    } catch (error) {
      return { status: 'error', message: 'Failed to get payment tracking data' };
        }
    },

    deletePaymentAttempt: async (paymentId: number) => {
        try {
            const response = await fetch(`https://vizagtaxihub.com/api/payment-tracker-final.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ id: paymentId }),
                redirect: 'follow',
            });

            const result = await response.json();
            return result;
        } catch (error) {
            return { status: 'error', message: 'Failed to delete payment attempt' };
        }
    }
};

// Helper function to track payment cancellation from frontend
export const trackPaymentCancellation = async (
  bookingId: number,
  bookingNumber: string,
  amount: number,
  reason: 'user_cancelled' | 'timeout' | 'system_error' | 'insufficient_funds' | 'card_declined' | 'other',
  description?: string,
  customerPhone?: string,
  customerEmail?: string
) => {
  return paymentTrackingService.trackCancellation({
    booking_id: bookingId,
    booking_number: bookingNumber,
    amount: amount,
    cancellation_reason: reason,
    cancellation_description: description,
    customer_phone: customerPhone,
    customer_email: customerEmail,
  });
};

// Helper function to track payment failure from frontend
export const trackPaymentFailure = async (
  bookingId: number,
  bookingNumber: string,
  amount: number,
  reason: string,
  code?: string
) => {
  return paymentTrackingService.trackFailure({
    booking_id: bookingId,
    booking_number: bookingNumber,
    amount: amount,
    failure_reason: reason,
    failure_code: code,
  });
};

// Direct export for easier importing
export const getTrackingData = paymentTrackingService.getTrackingData;
export const trackPaymentAttempt = paymentTrackingService.trackAttempt;
