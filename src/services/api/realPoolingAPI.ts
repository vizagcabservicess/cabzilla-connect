
import { 
  PoolingRide, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingBooking 
} from '@/types/pooling';
import { getApiUrl } from '@/config/api';

const API_BASE = getApiUrl('/api/pooling');

export const realPoolingAPI = {
  // Search for available rides
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    try {
      const queryParams = new URLSearchParams({
        type: searchParams.type,
        from: searchParams.from,
        to: searchParams.to,
        date: searchParams.date,
        passengers: searchParams.passengers.toString(),
        ...(searchParams.maxPrice && { maxPrice: searchParams.maxPrice.toString() }),
        ...(searchParams.sortBy && { sortBy: searchParams.sortBy })
      });

      const response = await fetch(`${API_BASE}/search.php?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rides = await response.json();
      console.log('✅ Fetched rides from API:', rides.length);
      return rides;
    } catch (error) {
      console.error('❌ Error searching rides:', error);
      throw error;
    }
  },

  // Get ride details
  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    try {
      const response = await fetch(`${API_BASE}/rides.php?id=${rideId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ride = await response.json();
      return ride;
    } catch (error) {
      console.error('❌ Error fetching ride details:', error);
      throw error;
    }
  },

  // Create a new ride
  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    try {
      const response = await fetch(`${API_BASE}/rides.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rideData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Created ride:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating ride:', error);
      throw error;
    }
  },

  // Book a ride
  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    try {
      const response = await fetch(`${API_BASE}/bookings.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const booking = await response.json();
      console.log('✅ Created booking:', booking);
      return booking;
    } catch (error) {
      console.error('❌ Error booking ride:', error);
      throw error;
    }
  },

  // Get user's pooling bookings
  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    try {
      const response = await fetch(`${API_BASE}/bookings.php?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const bookings = await response.json();
      return bookings;
    } catch (error) {
      console.error('❌ Error fetching user bookings:', error);
      return [];
    }
  },

  // Create Razorpay order
  createPaymentOrder: async (bookingId: number): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE}/payments.php?action=create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ booking_id: bookingId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const order = await response.json();
      return order;
    } catch (error) {
      console.error('❌ Error creating payment order:', error);
      throw error;
    }
  },

  // Verify Razorpay payment
  verifyPayment: async (paymentData: any): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/payments.php?action=verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Payment verified:', result);
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      throw error;
    }
  },

  // Cancel booking
  cancelBooking: async (bookingId: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/bookings.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: bookingId, 
          booking_status: 'cancelled' 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`✅ Cancelled booking ${bookingId}`);
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      throw error;
    }
  }
};
