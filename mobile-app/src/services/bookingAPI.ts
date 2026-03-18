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
};
