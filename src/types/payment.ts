
import { DateRange } from "react-day-picker";

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'online' | 'card' | 'bank_transfer' | 'upi' | 'paytm' | 'other';

export interface Payment {
  id: number | string;
  bookingId: number | string;
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  date: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  // Add missing properties that are causing errors
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  remainingAmount?: number;
  paidAmount?: number;
  bookingNumber?: string;
}

export interface PaymentFilterParams {
  dateRange?: DateRange;
  search?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
}

// Add missing PaymentSummary interface
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
  countByMethod: Record<string, number>;
}
