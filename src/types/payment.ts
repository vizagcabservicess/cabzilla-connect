
export type PaymentStatus = 
  | 'paid' 
  | 'partially_paid' 
  | 'pending' 
  | 'overdue' 
  | 'cancelled' 
  | 'refunded';

export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'online'
  | 'upi'
  | 'wallet'
  | 'other';

export interface Payment {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  contactNumber?: string;
}

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string; // Added to fix error
}

export interface PaymentSummary {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  countByStatus: {
    [key in PaymentStatus]?: number;
  };
}
