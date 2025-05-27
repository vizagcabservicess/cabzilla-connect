
// Payment Types
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';

export interface Payment {
  id: string;
  bookingId: string;
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

export interface PaymentFilterParams {
  status?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  overdueTransactions: number;
}
