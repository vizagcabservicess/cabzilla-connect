
import { 
  PoolingRide, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingBooking 
} from '@/types/pooling';

// Enhanced mock data for testing with more variety
const generateMockRides = (): PoolingRide[] => [
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
    arrivalTime: new Date(Date.now() + 172800000 + 3600000).toISOString(), // 1 hour later
    totalSeats: 6,
    availableSeats: 3,
    pricePerSeat: 150,
    vehicleInfo: {
      make: 'Mahindra',
      model: 'Bolero',
      color: 'Silver',
      plateNumber: 'AP 33 CD 5678'
    },
    route: ['Tenali'],
    amenities: ['AC'],
    rules: ['No smoking', 'Cash payment only'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    type: 'car',
    providerId: 3,
    providerName: 'Suresh Reddy',
    providerPhone: '+91 9123456789',
    providerRating: 4.8,
    fromLocation: 'Hyderabad',
    toLocation: 'Visakhapatnam',
    departureTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    arrivalTime: new Date(Date.now() + 259200000 + 19800000).toISOString(), // 5.5 hours later
    totalSeats: 3,
    availableSeats: 1,
    pricePerSeat: 750,
    vehicleInfo: {
      make: 'Honda',
      model: 'City',
      color: 'Blue',
      plateNumber: 'TS 09 EF 9012'
    },
    route: ['Warangal', 'Khammam'],
    amenities: ['AC', 'Music', 'Phone Charger'],
    rules: ['No smoking', 'No loud music', 'Be punctual'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    type: 'bus',
    providerId: 4,
    providerName: 'APSRTC',
    providerPhone: '+91 9999888777',
    providerRating: 4.0,
    fromLocation: 'Visakhapatnam',
    toLocation: 'Vijayawada',
    departureTime: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
    arrivalTime: new Date(Date.now() + 345600000 + 14400000).toISOString(), // 4 hours later
    totalSeats: 45,
    availableSeats: 23,
    pricePerSeat: 300,
    vehicleInfo: {
      make: 'Ashok Leyland',
      model: 'Luxury Bus',
      color: 'Red',
      plateNumber: 'AP 39 GH 3456'
    },
    route: ['Rajahmundry', 'Eluru'],
    amenities: ['AC', 'Reclining Seats', 'WiFi', 'Entertainment'],
    rules: ['No smoking', 'Keep tickets ready', 'Board 15 mins early'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let mockRides = generateMockRides();

export const mockPoolingAPI = {
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Searching with params:', searchParams);
    
    // Filter rides based on search criteria
    const filteredRides = mockRides.filter(ride => {
      // Check type match
      const typeMatch = ride.type === searchParams.type;
      
      // Check location match (case insensitive)
      const fromMatch = ride.fromLocation.toLowerCase().includes(searchParams.from.toLowerCase());
      const toMatch = ride.toLocation.toLowerCase().includes(searchParams.to.toLowerCase());
      
      // Check if ride has enough available seats
      const seatsMatch = ride.availableSeats >= searchParams.passengers;
      
      // Check date (simplified - just check if ride is in future)
      const rideDate = new Date(ride.departureTime);
      const searchDate = new Date(searchParams.date);
      const dateMatch = rideDate.toDateString() === searchDate.toDateString();
      
      return typeMatch && fromMatch && toMatch && seatsMatch && dateMatch;
    });
    
    // Sort results based on sortBy parameter
    if (searchParams.sortBy === 'price') {
      filteredRides.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    } else if (searchParams.sortBy === 'time') {
      filteredRides.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
    } else if (searchParams.sortBy === 'rating') {
      filteredRides.sort((a, b) => (b.providerRating || 0) - (a.providerRating || 0));
    }
    
    console.log('Found rides:', filteredRides);
    return filteredRides;
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
      providerRating: 4.5,
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
    
    // Update available seats
    const ride = mockRides.find(r => r.id === bookingData.rideId);
    if (ride) {
      ride.availableSeats = Math.max(0, ride.availableSeats - bookingData.seatsBooked);
    }
    
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
