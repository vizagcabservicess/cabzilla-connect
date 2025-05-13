export interface Payment {
  id: string;
  bookingId: string;
  bookingNumber?: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentDate: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface PaymentFilterParams {
  startDate?: string;
  endDate?: string;
  bookingId?: string;
  status?: string;
  method?: string;
}
