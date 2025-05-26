
// Payment-specific types

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'paid' | 'partial';

export interface Payment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  customerName?: string;
  customerPhone?: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  method: PaymentMethod;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  razorpayPaymentId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countByStatus: {
    pending: number;
    partial: number;
    paid: number;
    cancelled: number;
  };
  countByMethod: {
    [key in PaymentMethod]?: number;
  };
}
