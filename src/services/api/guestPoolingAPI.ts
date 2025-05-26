
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { RideRequest, GuestBooking, GuestDashboardData, RideSearchFilters } from '@/types/poolingGuest';
import { PoolingRide } from '@/types/pooling';

const GUEST_API_URL = getApiUrl('/api/pooling/guest');

export const guestPoolingAPI = {
  // Search rides with guest-specific filters
  searchRides: async (filters: RideSearchFilters): Promise<PoolingRide[]> => {
    try {
      const queryParams = new URLSearchParams({
        type: filters.type,
        from: filters.from,
        to: filters.to,
        date: filters.date,
        passengers: filters.passengers.toString(),
        sortBy: filters.sortBy,
        ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
        ...(filters.departureTimeRange?.start && { timeStart: filters.departureTimeRange.start }),
        ...(filters.departureTimeRange?.end && { timeEnd: filters.departureTimeRange.end })
      });

      const response = await axios.get(`${GUEST_API_URL}/search.php?${queryParams}`);
      return response.data.rides || [];
    } catch (error) {
      console.error('Error searching rides:', error);
      throw error;
    }
  },

  // Submit ride request
  submitRideRequest: async (requestData: Omit<RideRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<RideRequest> => {
    try {
      const response = await axios.post(`${GUEST_API_URL}/requests.php`, requestData);
      return response.data.request;
    } catch (error) {
      console.error('Error submitting ride request:', error);
      throw error;
    }
  },

  // Get guest dashboard data
  getDashboardData: async (guestId: number): Promise<GuestDashboardData> => {
    try {
      const response = await axios.get(`${GUEST_API_URL}/dashboard.php?guest_id=${guestId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Cancel ride request
  cancelRideRequest: async (requestId: number): Promise<void> => {
    try {
      await axios.put(`${GUEST_API_URL}/requests.php`, {
        id: requestId,
        status: 'cancelled'
      });
    } catch (error) {
      console.error('Error cancelling ride request:', error);
      throw error;
    }
  },

  // Create payment for approved request
  createPayment: async (requestId: number): Promise<{ paymentUrl: string; orderId: string }> => {
    try {
      const response = await axios.post(`${GUEST_API_URL}/payments.php`, {
        request_id: requestId,
        action: 'create_payment'
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  },

  // Verify payment and confirm booking
  verifyPayment: async (paymentData: any): Promise<GuestBooking> => {
    try {
      const response = await axios.post(`${GUEST_API_URL}/payments.php`, {
        ...paymentData,
        action: 'verify_payment'
      });
      return response.data.booking;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  },

  // Rate provider after ride completion
  rateProvider: async (bookingId: number, rating: number, feedback?: string): Promise<void> => {
    try {
      await axios.post(`${GUEST_API_URL}/ratings.php`, {
        booking_id: bookingId,
        rating,
        feedback,
        type: 'provider'
      });
    } catch (error) {
      console.error('Error rating provider:', error);
      throw error;
    }
  },

  // Send message to provider
  sendMessage: async (bookingId: number, message: string): Promise<void> => {
    try {
      await axios.post(`${GUEST_API_URL}/messages.php`, {
        booking_id: bookingId,
        message,
        sender_type: 'guest'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};
