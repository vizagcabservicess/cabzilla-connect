
export type PoolingType = 'car' | 'bus' | 'shared-taxi';
export type RideStatus = 'active' | 'completed' | 'cancelled' | 'full';
export type SeatStatus = 'available' | 'booked' | 'blocked';

export interface PoolingRide {
  id: number;
  type: PoolingType;
  providerId: number;
  providerName: string;
  providerPhone: string;
  providerRating?: number;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime?: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  vehicleInfo: {
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
    busNumber?: string; // Added for bus compatibility
  };
  route: string[];
  amenities?: string[];
  rules?: string[];
  status: RideStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BusRoute {
  id: number;
  operatorId: number;
  operatorName: string;
  routeName: string;
  fromLocation: string;
  toLocation: string;
  stops: BusStop[];
  schedules: BusSchedule[];
  busInfo: {
    busNumber: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  pricePerKm: number;
  baseFare: number;
}

export interface BusStop {
  id: number;
  name: string;
  location: string;
  arrivalTime: string;
  departureTime: string;
  fareFromOrigin: number;
}

export interface BusSchedule {
  id: number;
  routeId: number;
  departureTime: string;
  arrivalTime: string;
  date: string;
  availableSeats: number;
  seatMap: Seat[];
}

export interface Seat {
  id: string;
  row: number;
  column: string;
  type: 'regular' | 'premium' | 'sleeper';
  status: SeatStatus;
  price: number;
}

export interface PoolingBooking {
  id: number;
  userId: number;
  rideId?: number;
  routeId?: number;
  scheduleId?: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  seatsBooked: number;
  selectedSeats?: string[];
  fromStop?: string;
  toStop?: string;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  bookingDate: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
}

export interface PoolingSearchRequest {
  type: PoolingType;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy?: 'price' | 'time' | 'rating';
}

export interface CreateRideRequest {
  type: PoolingType;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  totalSeats: number;
  pricePerSeat: number;
  vehicleInfo: {
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
    busNumber?: string;
  };
  route?: string[];
  amenities?: string[];
  rules?: string[];
}

// Provider types
export interface PoolingProvider {
  id: number;
  name: string;
  phone: string;
  email: string;
  rating: number;
  totalRides: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  joinedDate: string;
  documents: ProviderDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDocument {
  id?: number;
  type: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  filePath?: string;
}

// Vehicle types for pooling
export type PoolingVehicleType = 'car' | 'bus' | 'van' | 'auto';
