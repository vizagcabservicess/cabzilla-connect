
export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  type?: 'airport' | 'hotel' | 'railway' | 'tourist' | 'other' | 'train_station' | 'bus_station' | 'landmark';
  popularityScore?: number;
  isInVizag?: boolean;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  returnDate?: string | null;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string | null;
}

export interface Booking {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'assigned' | 'in_progress' | 'payment_received' | 'payment_pending' | 'continued';
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'assigned' | 'in_progress' | 'payment_received' | 'payment_pending' | 'continued';

export interface DashboardMetrics {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}
