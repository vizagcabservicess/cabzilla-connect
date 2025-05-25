import { PoolingRide, PoolingBooking, PoolingType } from '@/types/api';

// Mock data for pooling rides
const mockRides: PoolingRide[] = Array.from({ length: 20 }, (_, i) => createMockRide(i + 1));

// Mock data for pooling bookings
const mockBookings: PoolingBooking[] = Array.from({ length: 50 }, (_, i) => createMockBooking(i + 1));

// Function to create a mock pooling ride
const createMockRide = (id: number): PoolingRide => ({
  id,
  route: `Route ${id}`, // Ensure route is always provided
  departure_time: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  arrival_time: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  available_seats: Math.floor(Math.random() * 4) + 1,
  price_per_seat: Math.floor(Math.random() * 500) + 100,
  driver_id: Math.floor(Math.random() * 10) + 1,
  vehicle_id: Math.floor(Math.random() * 20) + 1,
  status: 'active',
  created_at: new Date().toISOString()
});

// Function to create a mock pooling booking
const createMockBooking = (id: number): PoolingBooking => ({
  id,
  ride_id: Math.floor(Math.random() * 20) + 1,
  passenger_name: `Passenger ${id}`,
  passenger_phone: '+91 9876543210',
  passenger_email: `passenger${id}@example.com`,
  seats_booked: Math.floor(Math.random() * 3) + 1,
  total_amount: Math.floor(Math.random() * 1000) + 200,
  booking_status: 'confirmed',
  payment_status: 'paid',
  created_at: new Date().toISOString()
});

// Mock API for pooling rides and bookings
export const mockPoolingAPI = {
  // Get all pooling rides
  getAllRides: async (): Promise<PoolingRide[]> => {
    return Promise.resolve(mockRides);
  },

  // Get pooling ride by ID
  getRideById: async (id: number): Promise<PoolingRide | undefined> => {
    const ride = mockRides.find(ride => ride.id === id);
    return Promise.resolve(ride);
  },

  // Create a new pooling ride
  createRide: async (rideData: Omit<PoolingRide, 'id' | 'created_at'>): Promise<PoolingRide> => {
    const newRide: PoolingRide = {
      id: mockRides.length + 1,
      ...rideData,
      created_at: new Date().toISOString()
    };
    mockRides.push(newRide);
    return Promise.resolve(newRide);
  },

  // Update an existing pooling ride
  updateRide: async (id: number, rideData: Partial<PoolingRide>): Promise<PoolingRide | undefined> => {
    const rideIndex = mockRides.findIndex(ride => ride.id === id);
    if (rideIndex === -1) {
      return Promise.resolve(undefined);
    }
    const updatedRide = {
      ...mockRides[rideIndex],
      ...rideData
    };
    mockRides[rideIndex] = updatedRide;
    return Promise.resolve(updatedRide);
  },

  // Delete a pooling ride
  deleteRide: async (id: number): Promise<boolean> => {
    const rideIndex = mockRides.findIndex(ride => ride.id === id);
    if (rideIndex === -1) {
      return Promise.resolve(false);
    }
    mockRides.splice(rideIndex, 1);
    return Promise.resolve(true);
  },

  // Get all pooling bookings
  getAllBookings: async (): Promise<PoolingBooking[]> => {
    return Promise.resolve(mockBookings);
  },

  // Get pooling booking by ID
  getBookingById: async (id: number): Promise<PoolingBooking | undefined> => {
    const booking = mockBookings.find(booking => booking.id === id);
    return Promise.resolve(booking);
  },

  // Create a new pooling booking
  createBooking: async (bookingData: Omit<PoolingBooking, 'id' | 'created_at'>): Promise<PoolingBooking> => {
    const newBooking: PoolingBooking = {
      id: mockBookings.length + 1,
      ...bookingData,
      created_at: new Date().toISOString()
    };
    mockBookings.push(newBooking);
    return Promise.resolve(newBooking);
  },

  // Update an existing pooling booking
  updateBooking: async (id: number, bookingData: Partial<PoolingBooking>): Promise<PoolingBooking | undefined> => {
    const bookingIndex = mockBookings.findIndex(booking => booking.id === id);
    if (bookingIndex === -1) {
      return Promise.resolve(undefined);
    }
    const updatedBooking = {
      ...mockBookings[bookingIndex],
      ...bookingData
    };
    mockBookings[bookingIndex] = updatedBooking;
    return Promise.resolve(updatedBooking);
  },

  // Delete a pooling booking
  deleteBooking: async (id: number): Promise<boolean> => {
    const bookingIndex = mockBookings.findIndex(booking => booking.id === id);
    if (bookingIndex === -1) {
      return Promise.resolve(false);
    }
    mockBookings.splice(bookingIndex, 1);
    return Promise.resolve(true);
  },

  // Mock function to simulate fetching pooling types
  getPoolingTypes: async (): Promise<PoolingType[]> => {
    const poolingTypes: PoolingType[] = [
      {
        id: 1,
        name: 'Carpool',
        description: 'Share a ride with others heading in the same direction.',
        icon: 'carpool',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Bike Pool',
        description: 'Organize a group bike ride for daily commute.',
        icon: 'bike',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Walk Pool',
        description: 'Create a walking group for safety and companionship.',
        icon: 'walk',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    return Promise.resolve(poolingTypes);
  },

  // Mock function to simulate creating a pooling type
  createPoolingType: async (typeData: Omit<PoolingType, 'id' | 'createdAt' | 'updatedAt'>): Promise<PoolingType> => {
    const newType: PoolingType = {
      id: 4, // Assuming there are 3 existing types
      ...typeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return Promise.resolve(newType);
  },

  // Mock function to simulate updating a pooling type
  updatePoolingType: async (id: number, typeData: Partial<PoolingType>): Promise<PoolingType | undefined> => {
    // In a real implementation, you would update the item in your data store
    const updatedType: PoolingType = {
      id,
      name: 'Carpool',
      description: 'Share a ride with others heading in the same direction.',
      icon: 'carpool',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...typeData
    };
    return Promise.resolve(updatedType);
  },

  // Mock function to simulate deleting a pooling type
  deletePoolingType: async (id: number): Promise<boolean> => {
    // In a real implementation, you would remove the item from your data store
    return Promise.resolve(true);
  },

  // Mock function to simulate assigning a driver to a ride
  assignDriverToRide: async (rideId: number, driverId: number): Promise<boolean> => {
    // In a real implementation, you would update the ride with the driver information
    console.log(`Driver ${driverId} assigned to ride ${rideId}`);
    return Promise.resolve(true);
  },

  // Mock function to simulate recording a ride completion
  recordRideCompletion: async (rideId: number): Promise<boolean> => {
    // In a real implementation, you would update the ride status to completed
    console.log(`Ride ${rideId} marked as completed`);
    return Promise.resolve(true);
  },

  // Mock function to simulate cancelling a ride
  cancelRide: async (rideId: number): Promise<boolean> => {
    // In a real implementation, you would update the ride status to cancelled
    console.log(`Ride ${rideId} cancelled`);
    return Promise.resolve(true);
  },

  // Mock function to simulate fetching analytics data
  getAnalyticsData: async (): Promise<any> => {
    // Replace with actual analytics data retrieval logic
    const analyticsData = {
      totalRides: 500,
      activeRides: 150,
      completedRides: 350,
      averageRating: 4.5,
      totalRevenue: 50000
    };
    return Promise.resolve(analyticsData);
  },

  // Mock function to simulate fetching provider performance data
  getProviderPerformance: async (): Promise<any[]> => {
    // Replace with actual provider performance data retrieval logic
    const providerPerformance = [
      {
        providerId: 1,
        providerName: 'John Doe',
        totalRides: 120,
        completedRides: 115,
        averageRating: 4.7,
        totalEarnings: 12000
      },
      {
        providerId: 2,
        providerName: 'Jane Smith',
        totalRides: 95,
        completedRides: 90,
        averageRating: 4.3,
        totalEarnings: 9500
      }
    ];
    return Promise.resolve(providerPerformance);
  }
};
