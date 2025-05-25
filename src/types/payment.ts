
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';

export interface Payment {
  id: string | number;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
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
  countByMethod: Record<PaymentMethod, number>;
}

export interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onSendReminder: (paymentId: string | number, reminderType: string, customMessage?: string) => Promise<void>;
}
