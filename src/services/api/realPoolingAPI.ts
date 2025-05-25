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
    // Validate required parameters before making the API call
    if (!searchParams.type || !searchParams.from || !searchParams.to || !searchParams.date || !searchParams.passengers) {
      throw new Error('Missing required search parameters: type, from, to, date, passengers');
    }
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

      // Read response as text first, then try to parse as JSON
      const text = await response.text();
      let rides;
      try {
        rides = JSON.parse(text);
      } catch (jsonErr) {
        if (text.startsWith('<!DOCTYPE html>')) {
          throw new Error('Received HTML instead of JSON. The API endpoint may be missing or misconfigured.');
        }
        throw new Error('Invalid JSON response from server.');
      }
      if (!Array.isArray(rides)) {
        throw new Error('API did not return a list of rides.');
      }
      // Patch: Map vehicle fields into vehicleInfo object for each ride
      const ridesWithVehicleInfo = rides.map((ride: any) => ({
        ...ride,
        vehicleInfo: {
          make: ride.vehicleMake || '',
          model: ride.vehicleModel || '',
          color: ride.vehicleColor || '',
          plateNumber: ride.plateNumber || ''
        }
      }));
      console.log('✅ Fetched rides from API:', ridesWithVehicleInfo.length);
      return ridesWithVehicleInfo;
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

      // Read as text first to handle empty/invalid JSON
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server.');
      }
      let ride;
      try {
        ride = JSON.parse(text);
      } catch (jsonErr) {
        if (text.startsWith('<!DOCTYPE html>')) {
          throw new Error('Received HTML instead of JSON. The API endpoint may be missing or misconfigured.');
        }
        throw new Error('Invalid JSON response from server.');
      }
      // Patch: Map vehicle fields into vehicleInfo if not present
      if (!ride.vehicleInfo) {
        ride.vehicleInfo = {
          make: ride.vehicleMake || '',
          model: ride.vehicleModel || '',
          color: ride.vehicleColor || '',
          plateNumber: ride.plateNumber || ''
        };
      }
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
