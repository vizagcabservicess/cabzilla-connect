
import { 
  PoolingRide, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingBooking,
  PoolingVehicleType
} from '@/types/pooling';

// Mock data for pooling rides
const mockRides: PoolingRide[] = [
  {
    id: 1,
    type: 'car',
    providerId: 1,
    providerName: 'Rajesh Kumar',
    providerPhone: '+91 9876543210',
    providerRating: 4.8,
    fromLocation: 'Vizag',
    toLocation: 'Hyderabad',
    departureTime: '2024-12-25T08:00:00',
    arrivalTime: '2024-12-25T14:00:00',
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 800,
    vehicleInfo: {
      make: 'Maruti',
      model: 'Swift',
      color: 'White',
      plateNumber: 'AP39XX1234'
    },
    route: ['Vizag', 'Rajahmundry', 'Vijayawada', 'Hyderabad'],
    amenities: ['AC', 'Music', 'Charging Port'],
    rules: ['No Smoking', 'No Loud Music'],
    status: 'active',
    createdAt: '2024-12-20T10:00:00',
    updatedAt: '2024-12-20T10:00:00'
  },
  {
    id: 2,
    type: 'bus',
    providerId: 2,
    providerName: 'Coastal Travels',
    providerPhone: '+91 9876543211',
    providerRating: 4.5,
    fromLocation: 'Vizag',
    toLocation: 'Bangalore',
    departureTime: '2024-12-25T20:00:00',
    arrivalTime: '2024-12-26T08:00:00',
    totalSeats: 40,
    availableSeats: 15,
    pricePerSeat: 1200,
    vehicleInfo: {
      make: 'Volvo',
      model: 'B9R',
      color: 'Blue',
      plateNumber: 'AP39XX5678',
      busNumber: 'CT001'
    },
    route: ['Vizag', 'Rajahmundry', 'Vijayawada', 'Bangalore'],
    amenities: ['AC', 'Wi-Fi', 'Entertainment', 'Blanket'],
    rules: ['No Smoking', 'No Alcohol'],
    status: 'active',
    createdAt: '2024-12-18T15:00:00',
    updatedAt: '2024-12-18T15:00:00'
  }
];

const mockBookings: PoolingBooking[] = [
  {
    id: 1,
    userId: 1,
    rideId: 1,
    passengerName: 'John Doe',
    passengerPhone: '+91 9876543210',
    passengerEmail: 'john@example.com',
    seatsBooked: 2,
    totalAmount: 1600,
    status: 'confirmed',
    bookingDate: '2024-12-20T12:00:00',
    paymentStatus: 'paid'
  }
];

export const mockPoolingAPI = {
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockRides.filter(ride => {
      const matchesType = ride.type === searchParams.type;
      const matchesFrom = ride.fromLocation.toLowerCase().includes(searchParams.from.toLowerCase());
      const matchesTo = ride.toLocation.toLowerCase().includes(searchParams.to.toLowerCase());
      const hasEnoughSeats = ride.availableSeats >= searchParams.passengers;
      const matchesPrice = !searchParams.maxPrice || ride.pricePerSeat <= searchParams.maxPrice;
      
      return matchesType && matchesFrom && matchesTo && hasEnoughSeats && matchesPrice;
    });
  },

  getRideDetails: async (rideId: number): Promise<PoolingRide | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockRides.find(ride => ride.id === rideId) || null;
  },

  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newRide: PoolingRide = {
      id: mockRides.length + 1,
      ...rideData,
      providerId: 1, // Mock provider ID
      providerName: 'Current User',
      providerPhone: '+91 9999999999',
      providerRating: 4.0,
      availableSeats: rideData.totalSeats,
      route: rideData.route || [],
      amenities: rideData.amenities || [],
      rules: rideData.rules || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockRides.push(newRide);
    return newRide;
  },

  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const newBooking: PoolingBooking = {
      ...bookingData,
      id: mockBookings.length + 1,
      bookingDate: new Date().toISOString()
    };
    
    mockBookings.push(newBooking);
    
    // Update available seats
    const ride = mockRides.find(r => r.id === bookingData.rideId);
    if (ride) {
      ride.availableSeats -= bookingData.seatsBooked;
      if (ride.availableSeats <= 0) {
        ride.status = 'full';
      }
    }
    
    return newBooking;
  },

  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockBookings.filter(booking => booking.userId === userId);
  },

  createPaymentOrder: async (bookingId: number): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      id: `order_${Date.now()}`,
      amount: 1600,
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
      status: 'created'
    };
  },

  verifyPayment: async (paymentData: any): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Payment verified:', paymentData);
  },

  cancelBooking: async (bookingId: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const booking = mockBookings.find(b => b.id === bookingId);
    if (booking) {
      booking.status = 'cancelled';
      booking.paymentStatus = 'refunded';
    }
  }
};
