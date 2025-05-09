
import axios from 'axios';
import { Payment, PaymentFilterParams, PaymentSummary, PaymentsResponse, PaymentRemindersResponse } from '@/types/payment';
import { getApiUrl, defaultHeaders } from '@/config/api';

// Base URL for payments API
const PAYMENTS_API_URL = `${getApiUrl()}/admin/payments.php`;

/**
 * Get payments with optional filtering
 */
const getPayments = async (filters?: PaymentFilterParams): Promise<PaymentsResponse> => {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.dateRange?.from) {
        params.append('from_date', filters.dateRange.from.toISOString().split('T')[0]);
        
        if (filters.dateRange.to) {
          params.append('to_date', filters.dateRange.to.toISOString().split('T')[0]);
        }
      }
      
      if (filters.paymentStatus) {
        params.append('status', filters.paymentStatus);
      }
      
      if (filters.paymentMethod) {
        params.append('method', filters.paymentMethod);
      }
      
      if (filters.customerId) {
        params.append('customer_id', filters.customerId.toString());
      }
      
      if (filters.search) {
        params.append('search', filters.search);
      }
    }
    
    const response = await axios.get(PAYMENTS_API_URL, { 
      params,
      headers: defaultHeaders
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

/**
 * Update payment status
 */
const updatePaymentStatus = async (
  paymentId: number | string, 
  status: string,
  amount?: number,
  paymentMethod?: string,
  notes?: string
): Promise<Payment> => {
  try {
    const response = await axios.post(
      `${getApiUrl()}/admin/payment-update.php`, 
      {
        payment_id: paymentId,
        status,
        amount,
        payment_method: paymentMethod,
        notes
      },
      { headers: defaultHeaders }
    );
    
    return response.data.payment;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Send payment reminder
 */
const sendPaymentReminder = async (
  paymentId: number | string,
  reminderType: string,
  customMessage?: string
): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post(
      `${getApiUrl()}/admin/send-payment-reminder.php`,
      {
        payment_id: paymentId,
        reminder_type: reminderType,
        custom_message: customMessage
      },
      { headers: defaultHeaders }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    throw error;
  }
};

/**
 * Get payment reminders
 */
const getPaymentReminders = async (paymentId: number | string): Promise<PaymentRemindersResponse> => {
  try {
    const response = await axios.get(
      `${getApiUrl()}/admin/payment-reminders.php`,
      {
        params: { payment_id: paymentId },
        headers: defaultHeaders
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching payment reminders:', error);
    throw error;
  }
};

export const paymentsAPI = {
  getPayments,
  updatePaymentStatus,
  sendPaymentReminder,
  getPaymentReminders
};
