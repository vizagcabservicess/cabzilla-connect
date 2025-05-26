
import { Payment, PaymentFilterParams, PaymentSummary } from '@/types/payment';

export const paymentsAPI = {
  getPayments: async (filters?: PaymentFilterParams) => {
    // Mock implementation
    const mockPayments: Payment[] = [];
    const mockSummary: PaymentSummary = {
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
      totalOverdue: 0,
      countByStatus: {
        pending: 0,
        partial: 0,
        paid: 0,
        cancelled: 0
      },
      countByMethod: {}
    };
    
    return Promise.resolve({
      payments: mockPayments,
      summary: mockSummary
    });
  },
  
  updatePaymentStatus: async (
    paymentId: number | string,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  },
  
  sendPaymentReminder: async (
    paymentId: number | string,
    reminderType: string,
    customMessage?: string
  ) => {
    // Mock implementation
    return Promise.resolve({ success: true });
  }
};
