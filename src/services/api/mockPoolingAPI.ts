import { PoolingRide, PoolingBooking, PoolingType } from '@/types/api';
import { PoolingAnalytics } from '@/types/enhancedPooling';

// Mock data
const mockPoolingTypes: PoolingType[] = ['car', 'bus', 'shared-taxi'];

const mockRides: PoolingRide[] = [
  {
    id: 1,
    route: 'Visakhapatnam to Hyderabad',
    departure_time: '2024-01-20 08:00:00',
    arrival_time: '2024-01-20 16:00:00',
    available_seats: 3,
    price_per_seat: 800,
    driver_id: 1,
    vehicle_id: 1,
    status: 'active',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    route: 'Vizag Airport to City Center',
    departure_time: '2024-01-20 14:30:00',
    arrival_time: '2024-01-20 15:30:00',
    available_seats: 2,
    price_per_seat: 200,
    driver_id: 2,
    vehicle_id: 2,
    status: 'active',
    created_at: new Date().toISOString()
  }
];

const mockBookings: PoolingBooking[] = [
  {
    id: 1,
    ride_id: 1,
    passenger_name: 'John Doe',
    passenger_phone: '9876543210',
    passenger_email: 'john@example.com',
    seats_booked: 2,
    total_amount: 1600,
    booking_status: 'confirmed',
    payment_status: 'paid',
    created_at: new Date().toISOString(),
    bookingNumber: 'PB001'
  }
];

// Mock analytics data
const mockAnalytics: PoolingAnalytics = {
  totalRides: 45,
  activeRides: 12,
  completedRides: 28,
  cancelledRides: 5,
  totalBookings: 156,
  pendingBookings: 8,
  confirmedBookings: 142,
  totalRevenue: 125000,
  commissionEarned: 12500,
  averageRating: 4.3,
  totalProviders: 25,
  verifiedProviders: 22,
  activeDisputes: 2,
  refundsProcessed: 3,
  cancellationRate: 3.2,
  monthlyGrowth: 15.5,
  revenueByType: {
    carpool: 45000,
    bus: 65000,
    sharedTaxi: 15000
  },
  topRoutes: [
    { route: 'Visakhapatnam to Hyderabad', bookings: 45, revenue: 36000 },
    { route: 'Vizag Airport to City Center', bookings: 38, revenue: 7600 },
    { route: 'Visakhapatnam to Vijayawada', bookings: 32, revenue: 25600 }
  ]
};

// API functions
export const mockPoolingAPI = {
  // Rides
  getRides: async (): Promise<PoolingRide[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockRides), 500);
    });
  },

  createRide: async (rideData: Partial<PoolingRide>): Promise<PoolingRide> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newRide: PoolingRide = {
          id: mockRides.length + 1,
          route: rideData.route || '',
          departure_time: rideData.departure_time || '',
          arrival_time: rideData.arrival_time || '',
          available_seats: rideData.available_seats || 0,
          price_per_seat: rideData.price_per_seat || 0,
          driver_id: rideData.driver_id || 1,
          vehicle_id: rideData.vehicle_id || 1,
          status: rideData.status || 'active',
          created_at: new Date().toISOString()
        };
        mockRides.push(newRide);
        resolve(newRide);
      }, 500);
    });
  },

  updateRide: async (id: number, updates: Partial<PoolingRide>): Promise<PoolingRide> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockRides.findIndex(ride => ride.id === id);
        if (index !== -1) {
          mockRides[index] = { ...mockRides[index], ...updates };
          resolve(mockRides[index]);
        } else {
          reject(new Error('Ride not found'));
        }
      }, 500);
    });
  },

  deleteRide: async (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = mockRides.findIndex(ride => ride.id === id);
        if (index !== -1) {
          mockRides.splice(index, 1);
          resolve();
        } else {
          reject(new Error('Ride not found'));
        }
      }, 500);
    });
  },

  // Bookings
  getBookings: async (): Promise<PoolingBooking[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockBookings), 500);
    });
  },

  createBooking: async (bookingData: Partial<PoolingBooking>): Promise<PoolingBooking> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newBooking: PoolingBooking = {
          id: mockBookings.length + 1,
          ride_id: bookingData.ride_id || 1,
          passenger_name: bookingData.passenger_name || '',
          passenger_phone: bookingData.passenger_phone || '',
          passenger_email: bookingData.passenger_email || '',
          seats_booked: bookingData.seats_booked || 1,
          total_amount: bookingData.total_amount || 0,
          booking_status: bookingData.booking_status || 'pending',
          payment_status: bookingData.payment_status || 'pending',
          created_at: new Date().toISOString(),
          bookingNumber: `PB${String(mockBookings.length + 1).padStart(3, '0')}`
        };
        mockBookings.push(newBooking);
        resolve(newBooking);
      }, 500);
    });
  },

  // Analytics
  getAnalytics: async (): Promise<PoolingAnalytics> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockAnalytics), 500);
    });
  },

  // Types
  getPoolingTypes: async (): Promise<PoolingType[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockPoolingTypes), 300);
    });
  },

  // Search rides
  searchRides: async (params: {
    from?: string;
    to?: string;
    date?: string;
    seats?: number;
    type?: PoolingType;
  }): Promise<PoolingRide[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredRides = [...mockRides];
        
        if (params.from) {
          filteredRides = filteredRides.filter(ride => 
            ride.route.toLowerCase().includes(params.from!.toLowerCase())
          );
        }
        
        if (params.to) {
          filteredRides = filteredRides.filter(ride => 
            ride.route.toLowerCase().includes(params.to!.toLowerCase())
          );
        }
        
        if (params.seats) {
          filteredRides = filteredRides.filter(ride => 
            ride.available_seats >= params.seats!
          );
        }
        
        resolve(filteredRides);
      }, 500);
    });
  }
};
