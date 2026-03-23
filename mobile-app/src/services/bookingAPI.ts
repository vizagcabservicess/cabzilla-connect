/**
 * Booking API - same endpoint and payload as web app
 */
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { BookingRequest } from '../types';

const BASE = API_BASE_URL || 'https://www.vizagtaxihub.com';

export const bookingAPI = {
  createBooking: async (bookingData: BookingRequest) => {
    const response = await axios.post(`${BASE}/api/book.php`, bookingData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  },

  /**
   * Notify that booking payment was abandoned/cancelled.
   * Triggers pending payment email to admin/customer and WhatsApp to admin (same as web).
   */
  notifyPendingPayment: async (bookingId: number | string, reason: 'cancelled' | 'abandoned' = 'abandoned') => {
    try {
      await axios.post(`${BASE}/api/send-pending-notification.php`, { booking_id: bookingId, reason }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  },
};
