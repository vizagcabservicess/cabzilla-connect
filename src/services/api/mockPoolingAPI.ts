import { 
  PoolingRide, 
  PoolingSearchRequest, 
  CreateRideRequest,
  PoolingBooking 
} from '@/types/pooling';

// Enhanced mock data generator with more variety and realistic scenarios
const generateDynamicMockRides = (): PoolingRide[] => {
  const providers = [
    { name: 'Ravi Kumar', phone: '+91 9876543210', rating: 4.5 },
    { name: 'Prasad Taxi Service', phone: '+91 9988776655', rating: 4.2 },
    { name: 'Suresh Reddy', phone: '+91 9123456789', rating: 4.8 },
    { name: 'APSRTC', phone: '+91 9999888777', rating: 4.0 },
    { name: 'Venkat Travels', phone: '+91 9876512345', rating: 4.3 },
    { name: 'Krishna Cabs', phone: '+91 9543216789', rating: 4.6 },
    { name: 'Godavari Express', phone: '+91 9321654987', rating: 4.1 },
    { name: 'Coastal Rides', phone: '+91 9654123789', rating: 4.4 }
  ];

  const vehicles = [
    { make: 'Maruti', model: 'Swift', color: 'White', plate: 'AP 05 AB 1234' },
    { make: 'Hyundai', model: 'i20', color: 'Silver', plate: 'AP 33 CD 5678' },
    { make: 'Honda', model: 'City', color: 'Blue', plate: 'TS 09 EF 9012' },
    { make: 'Toyota', model: 'Innova', color: 'Grey', plate: 'AP 39 GH 3456' },
    { make: 'Mahindra', model: 'Bolero', color: 'Black', plate: 'AP 28 IJ 7890' },
    { make: 'Tata', model: 'Nexon', color: 'Red', plate: 'TS 12 KL 2345' },
    { make: 'Ashok Leyland', model: 'Luxury Bus', color: 'Red', plate: 'AP 39 GH 3456' }
  ];

  const routes = [
    { from: 'Visakhapatnam', to: 'Hyderabad', stops: ['Vizianagaram', 'Rajam', 'Srikakulam'] },
    { from: 'Hyderabad', to: 'Visakhapatnam', stops: ['Warangal', 'Khammam', 'Rajahmundry'] },
    { from: 'Vijayawada', to: 'Guntur', stops: ['Tenali', 'Mangalagiri'] },
    { from: 'Guntur', to: 'Vijayawada', stops: ['Tenali'] },
    { from: 'Visakhapatnam', to: 'Vijayawada', stops: ['Rajahmundry', 'Eluru'] },
    { from: 'Vijayawada', to: 'Hyderabad', stops: ['Guntur', 'Ongole'] },
    { from: 'Hyderabad', to: 'Warangal', stops: ['Jangaon'] },
    { from: 'Tirupati', to: 'Chennai', stops: ['Chittoor', 'Vellore'] }
  ];

  const amenities = [
    ['AC', 'Music'],
    ['AC', 'WiFi', 'Phone Charger'],
    ['AC', 'Reclining Seats', 'WiFi', 'Entertainment'],
    ['AC', 'Music', 'Phone Charger'],
    ['AC'],
    ['Music', 'Phone Charger'],
    ['AC', 'WiFi'],
    ['Entertainment', 'Reclining Seats']
  ];

  const rules = [
    ['No smoking', 'Be punctual'],
    ['No smoking', 'Cash payment only'],
    ['No smoking', 'No loud music', 'Be punctual'],
    ['No smoking', 'Keep tickets ready', 'Board 15 mins early'],
    ['No smoking', 'No pets'],
    ['Be punctual', 'No eating in vehicle'],
    ['No smoking', 'Wear seat belts']
  ];

  const rides: PoolingRide[] = [];

  // Generate rides for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dayOffset);
    
    routes.forEach((route, routeIndex) => {
      // Generate 2-4 rides per route per day
      const ridesPerRoute = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < ridesPerRoute; i++) {
        const provider = providers[Math.floor(Math.random() * providers.length)];
        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        const amenitySet = amenities[Math.floor(Math.random() * amenities.length)];
        const ruleSet = rules[Math.floor(Math.random() * rules.length)];
        
        // Random departure time between 6 AM and 10 PM
        const departureHour = Math.floor(Math.random() * 16) + 6;
        const departureMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
        
        const departureTime = new Date(baseDate);
        departureTime.setHours(departureHour, departureMinute, 0, 0);
        
        // Calculate arrival time (2-6 hours later)
        const travelHours = Math.floor(Math.random() * 4) + 2;
        const arrivalTime = new Date(departureTime);
        arrivalTime.setHours(arrivalTime.getHours() + travelHours);
        
        // Determine ride type and pricing
        let rideType: 'car' | 'bus' | 'shared-taxi';
        let totalSeats: number;
        let priceRange: [number, number];
        
        if (provider.name === 'APSRTC' || vehicle.model === 'Luxury Bus') {
          rideType = 'bus';
          totalSeats = Math.floor(Math.random() * 20) + 35; // 35-54 seats
          priceRange = [250, 450];
        } else if (provider.name.includes('Taxi') || Math.random() < 0.3) {
          rideType = 'shared-taxi';
          totalSeats = Math.floor(Math.random() * 3) + 4; // 4-6 seats
          priceRange = [120, 300];
        } else {
          rideType = 'car';
          totalSeats = Math.floor(Math.random() * 2) + 3; // 3-4 seats
          priceRange = [400, 900];
        }
        
        const pricePerSeat = Math.floor(Math.random() * (priceRange[1] - priceRange[0]) + priceRange[0]);
        const availableSeats = Math.floor(Math.random() * totalSeats) + 1;
        
        const ride: PoolingRide = {
          id: rides.length + 1,
          type: rideType,
          providerId: routeIndex + i + 1,
          providerName: provider.name,
          providerPhone: provider.phone,
          providerRating: provider.rating,
          fromLocation: route.from,
          toLocation: route.to,
          departureTime: departureTime.toISOString(),
          arrivalTime: arrivalTime.toISOString(),
          totalSeats,
          availableSeats,
          pricePerSeat,
          vehicleInfo: {
            make: vehicle.make,
            model: vehicle.model,
            color: vehicle.color,
            plateNumber: vehicle.plate
          },
          route: route.stops,
          amenities: amenitySet,
          rules: ruleSet,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        rides.push(ride);
      }
    });
  }
  
  return rides;
};

let mockRides = generateDynamicMockRides();

export const mockPoolingAPI = {
  searchRides: async (searchParams: PoolingSearchRequest): Promise<PoolingRide[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('🔍 Searching with params:', searchParams);
    
    // Filter rides based on search criteria
    const filteredRides = mockRides.filter(ride => {
      // Check type match
      const typeMatch = ride.type === searchParams.type;
      
      // Check location match (flexible matching)
      const fromMatch = ride.fromLocation.toLowerCase().includes(searchParams.from.toLowerCase()) ||
                       searchParams.from.toLowerCase().includes(ride.fromLocation.toLowerCase());
      const toMatch = ride.toLocation.toLowerCase().includes(searchParams.to.toLowerCase()) ||
                     searchParams.to.toLowerCase().includes(ride.toLocation.toLowerCase());
      
      // Check if ride has enough available seats
      const seatsMatch = ride.availableSeats >= searchParams.passengers;
      
      // Check date
      const rideDate = new Date(ride.departureTime);
      const searchDate = new Date(searchParams.date);
      const dateMatch = rideDate.toDateString() === searchDate.toDateString();
      
      // Price filter (if specified)
      const priceMatch = !searchParams.maxPrice || ride.pricePerSeat <= searchParams.maxPrice;
      
      return typeMatch && fromMatch && toMatch && seatsMatch && dateMatch && priceMatch;
    });
    
    // Sort results based on sortBy parameter
    if (searchParams.sortBy === 'price') {
      filteredRides.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
    } else if (searchParams.sortBy === 'time') {
      filteredRides.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
    } else if (searchParams.sortBy === 'rating') {
      filteredRides.sort((a, b) => (b.providerRating || 0) - (a.providerRating || 0));
    }
    
    console.log(`✅ Found ${filteredRides.length} rides matching criteria`);
    return filteredRides.slice(0, 20); // Limit to 20 results
  },

  getRideDetails: async (rideId: number): Promise<PoolingRide> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
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
      providerId: 999,
      providerName: 'Current User',
      providerPhone: '+91 9999999999',
      providerRating: 4.5,
      availableSeats: rideData.totalSeats,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockRides.push(newRide);
    console.log('✅ Created new ride:', newRide);
    return newRide;
  },

  bookRide: async (bookingData: Omit<PoolingBooking, 'id' | 'bookingDate'>): Promise<PoolingBooking> => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Update available seats
    const ride = mockRides.find(r => r.id === bookingData.rideId);
    if (ride) {
      ride.availableSeats = Math.max(0, ride.availableSeats - bookingData.seatsBooked);
      console.log(`📝 Updated ride ${ride.id}: ${ride.availableSeats} seats remaining`);
    }
    
    const booking: PoolingBooking = {
      id: Date.now(),
      ...bookingData,
      bookingDate: new Date().toISOString()
    };
    
    console.log('✅ Created booking:', booking);
    return booking;
  },

  getUserBookings: async (userId: number): Promise<PoolingBooking[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return empty array for now - would be populated from actual bookings
    return [];
  },

  cancelBooking: async (bookingId: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`❌ Cancelled booking ${bookingId}`);
  },

  // Helper method to regenerate mock data
  regenerateData: () => {
    mockRides = generateDynamicMockRides();
    console.log('🔄 Regenerated mock ride data');
  },

  createRequest: async (requestData) => {
    console.log('[mockPoolingAPI.ts] createRequest called with', requestData);
    // ... mock implementation ...
  }
};
