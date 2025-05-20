
import { Booking } from '@/types/api';

// Payment status types
export type PaymentStatus = 
  | 'pending'
  | 'partial'
  | 'paid'
  | 'cancelled';

// Payment method types
export type PaymentMethod = 
  | 'cash'
  | 'card'
  | 'upi'
  | 'bank_transfer'
  | 'wallet'
  | 'cheque'
  | 'razorpay'  // Added Razorpay payment method
  | 'other';

// Payment interface
export interface Payment {
  id: number | string;
  bookingId: number | string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  booking?: Booking;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
}

// Razorpay payment specific details
export interface RazorpayPaymentDetails {
  paymentId: string;
  orderId: string;
  signature: string;
  amount: number;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  createdAt: string;
}

// Payment filter parameters
export interface PaymentFilterParams {
  dateRange?: {
    from: Date | undefined;
    to?: Date | undefined;
  };
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  customerId?: number | string;
  search?: string;
}

// Payment reminder
export interface PaymentReminder {
  id: number | string;
  paymentId: number | string;
  bookingId: number | string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  reminderType: 'initial' | 'followup' | 'final';
  reminderDate: string;
  sentDate?: string;
  status: 'pending' | 'sent' | 'failed';
  message: string;
  createdAt: string;
  updatedAt: string;
}

// Payment summary
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

// API response types
export interface PaymentsResponse {
  payments: Payment[];
  summary?: PaymentSummary;
}

export interface PaymentRemindersResponse {
  reminders: PaymentReminder[];
}
