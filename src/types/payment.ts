
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paidAmount: number;
  pendingAmount?: number;
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'refunded' | 'failed' | 'overdue';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'other';

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countByStatus: Record<PaymentStatus, number>;
}
