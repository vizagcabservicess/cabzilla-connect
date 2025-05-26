
import { PaymentFilterParams, Payment } from '@/types/payment';

export const paymentsAPI = {
  getPayments: async (filters: PaymentFilterParams = {}) => {
    // Mock implementation - replace with actual API call
    const mockPayments: Payment[] = [
      {
        id: '1',
        amount: 1500,
        paidAmount: 0,
        remainingAmount: 1500,
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        bookingNumber: 'BK001',
        customerName: 'John Doe',
        customerPhone: '9876543210',
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    const mockSummary = {
      totalAmount: 1500,
      totalPaid: 0,
      totalPending: 1500,
      totalOverdue: 0,
      countByStatus: {
        pending: 1,
        partial: 0,
        paid: 0,
        cancelled: 0
      },
      countByMethod: {
        cash: 1
      }
    };

    return {
      payments: mockPayments,
      summary: mockSummary
    };
  },

  updatePaymentStatus: async (
    paymentId: string | number,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => {
    // Mock implementation
    return { success: true };
  },

  sendPaymentReminder: async (
    paymentId: string | number,
    reminderType: string,
    customMessage?: string
  ) => {
    // Mock implementation
    return { success: true };
  }
};
