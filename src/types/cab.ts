
// Vehicle and Fleet Types

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  name: string;
  model: string;
  make: string;
  year: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  lastService: string;
  nextServiceDue: string;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  currentOdometer?: number;
  fuelType: string;
  vehicleType: string;
  cabTypeId: string;
  capacity?: number;
  luggageCapacity?: number;
  isActive?: boolean;
  commissionPercentage?: number;
  updatedAt?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerKm: number;
  basePrice: number;
  image?: string;
}

export interface CabType {
  id: string;
  name: string;
  description: string;
  capacity: number;
  luggage: number;
  image?: string;
  amenities?: string[];
  basePrice: number;
  pricePerKm: number;
  type: string;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
  description?: string;
}

export interface FareCache {
  [key: string]: {
    fare: number;
    timestamp: number;
    source: string;
  };
}

export interface TourInfo {
  id: string;
  name: string;
  description?: string;
  duration: number;
  distance: number;
}

export interface TourFares {
  [vehicleType: string]: number;
}

export interface ExtraCharges {
  tollCharges?: number;
  waitingCharges?: number;
  nightHaltCharges?: number;
  driverAllowance?: number;
  otherCharges?: number;
}

export interface LocalPackagePriceMatrix {
  [packageId: string]: {
    [vehicleType: string]: number;
  };
}

export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
}

export interface VehiclePricing {
  id: number;
  vehicleId: number;
  vehicleType: string;
  localRate: number;
  outstationRate: number;
  airportTransferRate: number;
  basePrice?: number;
  pricePerKm?: number;
  perKmRate?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

export interface OutstationFare {
  id: number;
  vehicleType: string;
  rate: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

export interface LocalFare {
  id: number;
  vehicleType: string;
  packageType: string;
  rate: number;
  hours: number;
  kilometers: number;
}

export interface AirportFare {
  id: number;
  vehicleType: string;
  rate: number;
  location?: string;
}

export interface CommissionSetting {
  id: number;
  vehicleType: string;
  defaultPercentage: number;
  default_percentage?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPayment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  driverId: number;
  driverName: string;
  vehicleType: string;
  totalAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  payoutAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionReport {
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  commissionsByVehicle: { [vehicleType: string]: number };
  commissionsByDriver: { [driverId: string]: number };
}

export interface FuelPrice {
  id: number;
  fuelType: string;
  pricePerLiter: number;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: number;
  vehicleId: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometer: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
