
export interface Payment {
  id: string | number;
  bookingId: string | number;
  bookingNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'other';

export interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countByStatus: {
    paid: number;
    pending: number;
    partial: number;
    cancelled: number;
  };
}

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  overdue?: boolean;
}
