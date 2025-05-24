
import { 
  PoolingRide, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingBooking 
} from '@/types/pooling';

// Mock data for testing
const mockRides: PoolingRide[] = [
  {
    id: 1,
    type: 'car',
    providerId: 1,
    providerName: 'Ravi Kumar',
    providerPhone: '+91 9876543210',
    providerRating: 4.5,
    fromLocation: 'Visakhapatnam',
    toLocation: 'Hyderabad',
    departureTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    arrivalTime: new Date(Date.now() + 86400000 + 18000000).toISOString(), // 5 hours later
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 800,
    vehicleInfo: {
      make: 'Maruti',
      model: 'Swift',
      color: 'White',
      plateNumber: 'AP 05 AB 1234'
    },
    route: ['Vizianagaram', 'Rajam'],
    amenities: ['AC', 'Music'],
    rules: ['No smoking', 'Be punctual'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    type: 'shared-taxi',
    providerId: 2,
    providerName: 'Prasad Taxi Service',
    providerPhone: '+91 9988776655',
    providerRating: 4.2,
    fromLocation: 'Vijayawada',
    toLocation: 'Guntur',
    departureTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    totalSeats: 6,
    availableSeats: 3,
    pricePerSeat: 150,
    vehicleInfo: {
      make: 'Mahindra',
      model: 'Bolero',
      color: 'Silver'
    },
    route: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockPoolingAPI = {
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockRides.filter(ride => 
      ride.fromLocation.toLowerCase().includes(searchParams.from.toLowerCase()) &&
      ride.toLocation.toLowerCase().includes(searchParams.to.toLowerCase()) &&
      ride.type === searchParams.type
    );
  },

  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const ride = mockRides.find(r => r.id === rideId);
    if (!ride) {
      throw new Error('Ride not found');
    }
    return ride;
  },

  createRide: async (rideData: CreateRideRequest): Promise<PoolingRide> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newRide: PoolingRide = {
      id: mockRides.length + 1,
      ...rideData,
      providerId: 1,
      providerName: 'Current User',
      providerPhone: '+91 9999999999',
      availableSeats: rideData.totalSeats,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockRides.push(newRide);
    return newRide;
  },

  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: Date.now(),
      ...bookingData,
      bookingDate: new Date().toISOString()
    };
  },

  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [];
  },

  cancelBooking: async (bookingId: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};
