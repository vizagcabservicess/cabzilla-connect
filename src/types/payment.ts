
// Payment Types
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';

export interface Payment {
  id: string | number;
  bookingId: string | number;
  bookingNumber?: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  status: PaymentStatus;
  paymentStatus?: PaymentStatus;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}
