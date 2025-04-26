
export interface BookingDetails {
  id: number;
  bookingNumber: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  cabType: string;
  tripType: string;
  tripMode?: string;
  status: BookingStatus;
  totalAmount: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  gstEnabled?: boolean;
  billingAddress?: string;
  extraCharges?: {
    id?: number;
    description: string;
    amount: number;
  }[];
  totalExtraCharges?: number;
  finalAmount?: number;
  gstDetails?: {
    gstNumber: string;
    companyName: string;
    companyAddress: string;
  };
}

export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  license_no: string;  // Using license_no consistently
  status: DriverStatus;
  total_rides?: number;
  earnings?: number;
  rating?: number;
  location: string;
  vehicle?: string;
  vehicle_id?: string;
  vehicleNumber?: string; // Added vehicleNumber property
  created_at?: string;
  updated_at?: string;
}
