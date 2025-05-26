
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';

export interface PaymentFilterParams {
  status?: PaymentStatus;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface Payment {
  id: string | number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  bookingId?: string;
  bookingNumber?: string;
  customerName?: string;
  customerPhone?: string;
  dueDate: string;
  createdAt?: string;
  razorpayPaymentId?: string;
}

export interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onSend?: (paymentId: string | number, reminderType: string, customMessage?: string) => Promise<void>;
}
