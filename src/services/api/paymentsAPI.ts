
import { Payment, PaymentFilterParams, PaymentSummary } from '@/types/payment';

const API_BASE_URL = '/api/admin';

interface PaymentsResponse {
  payments: Payment[];
  summary: PaymentSummary;
}

export const paymentsAPI = {
  async getPayments(filters: PaymentFilterParams = {}): Promise<PaymentsResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const url = `${API_BASE_URL}/payments.php${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'success') {
        return {
          payments: data.data?.payments || [],
          summary: data.data?.summary || {
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            countByStatus: { pending: 0, partial: 0, paid: 0, cancelled: 0 },
            countByMethod: {}
          }
        };
      } else {
        throw new Error(data.message || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  async updatePaymentStatus(
    paymentId: number | string,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments.php`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: paymentId,
        status,
        amount,
        paymentMethod,
        notes
      }),
    });

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to update payment status');
    }
  },

  async sendPaymentReminder(
    paymentId: number | string,
    reminderType: string,
    customMessage?: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/send-payment-reminder.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentId,
        reminderType,
        customMessage
      }),
    });

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(data.message || 'Failed to send payment reminder');
    }
  }
};
