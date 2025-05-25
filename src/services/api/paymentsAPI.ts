
import { Payment, PaymentFilterParams, PaymentSummary } from '@/types/payment';

export const paymentsAPI = {
  async getPayments(filters: PaymentFilterParams = {}) {
    // Mock implementation - replace with actual API call
    const mockPayments: Payment[] = [
      {
        id: '1',
        bookingId: 'BK001',
        amount: 1500,
        method: 'cash',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    const mockSummary: PaymentSummary = {
      totalAmount: 15000,
      totalPaid: 10000,
      totalPending: 4000,
      totalOverdue: 1000,
      countByStatus: {
        pending: 5,
        partial: 2,
        paid: 10,
        cancelled: 1
      },
      countByMethod: {
        cash: 8,
        card: 3,
        upi: 4,
        bank_transfer: 2,
        wallet: 1,
        cheque: 0,
        razorpay: 0,
        other: 0
      }
    };

    return { payments: mockPayments, summary: mockSummary };
  },

  async updatePaymentStatus(
    paymentId: string | number,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) {
    // Mock implementation
    console.log('Updating payment:', { paymentId, status, amount, paymentMethod, notes });
    return { success: true };
  },

  async sendPaymentReminder(
    paymentId: string | number,
    reminderType: string,
    customMessage?: string
  ) {
    // Mock implementation
    console.log('Sending reminder:', { paymentId, reminderType, customMessage });
    return { success: true };
  }
};
