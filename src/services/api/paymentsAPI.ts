
import axios from 'axios';
import { format } from 'date-fns';
import { 
  Payment, 
  PaymentFilterParams, 
  PaymentReminder, 
  PaymentSummary,
  PaymentsResponse,
  PaymentRemindersResponse
} from '@/types/payment';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { safeFetch, getForcedRequestConfig } from '@/config/requestConfig';

/**
 * Get all payments with optional filtering
 */
export const getPayments = async (filters?: PaymentFilterParams): Promise<PaymentsResponse> => {
  try {
    // Prepare query params
    const queryParams: Record<string, string> = {};
    
    if (filters?.dateRange?.from) {
      queryParams.from_date = format(filters.dateRange.from, 'yyyy-MM-dd');
      
      if (filters.dateRange.to) {
        queryParams.to_date = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
    }
    
    if (filters?.paymentStatus) {
      queryParams.status = filters.paymentStatus;
    }
    
    if (filters?.paymentMethod) {
      queryParams.method = filters.paymentMethod;
    }
    
    if (filters?.customerId) {
      queryParams.customer_id = String(filters.customerId);
    }
    
    if (filters?.search) {
      queryParams.search = filters.search;
    }
    
    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Make request
    const url = `${getApiUrl(`/api/admin/payments.php${queryString ? `?${queryString}` : ''}`)}`;
    console.log('Fetching payments from:', url);
    
    const response = await axios.get(url, {
      headers: {
        ...forceRefreshHeaders,
      },
    });
    
    if (response.data && response.data.status === 'success') {
      return {
        payments: response.data.data.payments || [],
        summary: response.data.data.summary || undefined
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch payments');
    }
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  paymentId: number | string, 
  status: string, 
  amount?: number,
  paymentMethod?: string,
  notes?: string
): Promise<Payment> => {
  try {
    const url = getApiUrl('/api/admin/payment-update.php');
    
    const response = await axios.post(url, {
      payment_id: paymentId,
      status,
      amount,
      payment_method: paymentMethod,
      notes
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...forceRefreshHeaders
      }
    });
    
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to update payment status');
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Get payment reminders
 */
export const getPaymentReminders = async (filters?: PaymentFilterParams): Promise<PaymentRemindersResponse> => {
  try {
    // Prepare query params
    const queryParams: Record<string, string> = {};
    
    if (filters?.dateRange?.from) {
      queryParams.from_date = format(filters.dateRange.from, 'yyyy-MM-dd');
      
      if (filters.dateRange.to) {
        queryParams.to_date = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
    }
    
    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Make request
    const url = `${getApiUrl(`/api/admin/payment-reminders.php${queryString ? `?${queryString}` : ''}`)}`;
    
    const response = await axios.get(url, {
      headers: {
        ...forceRefreshHeaders,
      },
    });
    
    if (response.data && response.data.status === 'success') {
      return {
        reminders: response.data.data.reminders || []
      };
    } else {
      throw new Error(response.data?.message || 'Failed to fetch payment reminders');
    }
  } catch (error) {
    console.error('Error fetching payment reminders:', error);
    throw error;
  }
};

/**
 * Send payment reminder
 */
export const sendPaymentReminder = async (
  paymentId: number | string,
  reminderType: string,
  customMessage?: string
): Promise<PaymentReminder> => {
  try {
    const url = getApiUrl('/api/admin/send-payment-reminder.php');
    
    const response = await axios.post(url, {
      payment_id: paymentId,
      reminder_type: reminderType,
      custom_message: customMessage
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...forceRefreshHeaders
      }
    });
    
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to send payment reminder');
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    throw error;
  }
};

/**
 * Get payment summary
 */
export const getPaymentSummary = async (filters?: PaymentFilterParams): Promise<PaymentSummary> => {
  try {
    // Prepare query params
    const queryParams: Record<string, string> = {};
    
    if (filters?.dateRange?.from) {
      queryParams.from_date = format(filters.dateRange.from, 'yyyy-MM-dd');
      
      if (filters.dateRange.to) {
        queryParams.to_date = format(filters.dateRange.to, 'yyyy-MM-dd');
      }
    }
    
    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    // Make request
    const url = `${getApiUrl(`/api/admin/payment-summary.php${queryString ? `?${queryString}` : ''}`)}`;
    
    const response = await axios.get(url, {
      headers: {
        ...forceRefreshHeaders,
      },
    });
    
    if (response.data && response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to fetch payment summary');
    }
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    throw error;
  }
};

export const paymentsAPI = {
  getPayments,
  updatePaymentStatus,
  getPaymentReminders,
  sendPaymentReminder,
  getPaymentSummary
};

export default paymentsAPI;
