
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
}

export interface PaymentFilterParams {
  dateRange?: DateRange;
  search?: string;
  // Add these properties to fix the errors
  status?: PaymentStatus;
  method?: PaymentMethod;
}
