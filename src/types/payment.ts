
// Payment-specific types

export interface Payment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  customerName?: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'wallet' | 'cheque' | 'razorpay' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}
