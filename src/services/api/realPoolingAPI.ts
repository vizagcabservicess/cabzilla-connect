import { 
  PoolingRide, 
  PoolingBooking, 
  PoolingSearchRequest, 
  CreateRideRequest 
} from '@/types/pooling';
import { POOLING_LOCATIONS } from '@/lib/poolingData';

// Mock data for development
const mockRides: PoolingRide[] = [
  {
    id: 1,
    type: 'car',
    providerId: 1,
    providerName: 'Ravi Kumar',
    providerPhone: '+91 9966363662',
    providerRating: 4.5,
    fromLocation: 'Hyderabad',
    toLocation: 'Vijayawada',
    departureTime: '2024-01-15T10:00:00Z',
    arrivalTime: '2024-01-15T13:30:00Z',
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 300,
    vehicleInfo: {
      make: 'Honda',
      model: 'City',
      color: 'White',
      plateNumber: 'TS09ABC1234'
    },
    route: ['Shamshabad', 'Kurnool'],
    amenities: ['AC', 'Music', 'Phone Charging'],
    rules: ['No smoking', 'No loud music'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    type: 'shared-taxi',
    providerId: 2,
    providerName: 'Priya Sharma',
    providerPhone: '+91 9876543211',
    providerRating: 4.8,
    fromLocation: 'Visakhapatnam',
    toLocation: 'Hyderabad',
    departureTime: '2024-01-15T08:00:00Z',
    arrivalTime: '2024-01-15T14:00:00Z',
    totalSeats: 6,
    availableSeats: 3,
    pricePerSeat: 450,
    vehicleInfo: {
      make: 'Toyota',
      model: 'Innova',
      color: 'Silver',
      plateNumber: 'AP39XYZ5678'
    },
    route: ['Rajahmundry', 'Eluru', 'Vijayawada'],
    amenities: ['AC', 'WiFi', 'Refreshments'],
    rules: ['No pets', 'Punctuality required'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const realPoolingAPI = {
  // Search for available rides
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    await delay(1000); // Simulate network delay
    
    console.log('Searching rides with params:', searchParams);
    
    // Filter rides based on search parameters
    let filteredRides = mockRides.filter(ride => {
      const matchesType = ride.type === searchParams.type;
      const matchesFrom = ride.fromLocation.toLowerCase().includes(searchParams.from.toLowerCase());
      const matchesTo = ride.toLocation.toLowerCase().includes(searchParams.to.toLowerCase());
      const hasAvailableSeats = ride.availableSeats >= searchParams.passengers;
      const isActive = ride.status === 'active';
      
      return matchesType && matchesFrom && matchesTo && hasAvailableSeats && isActive;
    });

    // Apply price filter if specified
    if (searchParams.maxPrice) {
      filteredRides = filteredRides.filter(ride => ride.pricePerSeat <= searchParams.maxPrice!);
    }

    // Sort results
    switch (searchParams.sortBy) {
      case 'price':
        filteredRides.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
        break;
      case 'rating':
        filteredRides.sort((a, b) => (b.providerRating || 0) - (a.providerRating || 0));
        break;
      case 'time':
      default:
        filteredRides.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
        break;
    }

    return filteredRides;
  },

  // Get ride details
  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    await delay(500);
    
    const ride = mockRides.find(r => r.id === rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }
    
    return ride;
  },

  // Create a new ride
  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    await delay(1000);
    
    console.log('Creating ride:', rideData);
    
    const newRide: PoolingRide = {
      id: Date.now(), // Generate unique ID
      ...rideData,
      providerId: 1, // Current user ID (mock)
      providerName: 'Current User',
      providerPhone: '+91 9876543210',
      availableSeats: rideData.totalSeats,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockRides.push(newRide);
    return newRide;
  },

  // Book a ride
  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    await delay(1000);
    
    console.log('Booking ride:', bookingData);
    
    const booking: PoolingBooking = {
      id: Date.now(),
      ...bookingData,
      bookingDate: new Date().toISOString()
    };

    // Update available seats
    const ride = mockRides.find(r => r.id === bookingData.rideId);
    if (ride) {
      ride.availableSeats = Math.max(0, ride.availableSeats - bookingData.seatsBooked);
    }

    return booking;
  },

  // Get user's pooling bookings
  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    await delay(500);
    
    // Return mock bookings for the user
    return [];
  },

  // Create payment order
  createPaymentOrder: async (bookingId: number): Promise<any> => {
    await delay(500);
    
    return {
      id: `order_${Date.now()}`,
      amount: 300, // Mock amount
      currency: 'INR',
      status: 'created'
    };
  },

  // Verify payment
  verifyPayment: async (paymentData: any): Promise<void> => {
    await delay(500);
    
    console.log('Verifying payment:', paymentData);
    // Mock payment verification
  },

  // Cancel booking
  cancelBooking: async (bookingId: number): Promise<void> => {
    await delay(500);
    
    console.log('Cancelling booking:', bookingId);
    // Mock cancellation logic
  },

  createRequest: async (requestData) => {
    console.log('[realPoolingAPI.ts] createRequest called with', requestData);
    // ... real implementation ...
  }
};
