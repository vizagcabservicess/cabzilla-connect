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
  createdAt?: string;
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
  vehicleId?: string;
  name: string;
  type: string;
  capacity: number;
  luggage: number;
  luggageCapacity: number;
  price: number;
  basePrice: number;
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  nightHaltCharge: number;
  driverAllowance: number;
  isActive: boolean;
  localPackageFares?: {
    package4hr40km?: number;
    package8hr80km?: number;
    package10hr100km?: number;
    extraKmRate?: number;
    extraHourRate?: number;
  };
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
  image?: string;
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
  forceRefresh?: boolean;
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
  pricePerKm: number;
  basePrice: number;
  roundTripPricePerKm?: number;
  roundTripBasePrice?: number;
}

export interface LocalFare {
  id: number;
  vehicleType: string;
  packageType: string;
  rate: number;
  hours: number;
  kilometers: number;
  price8hrs80km: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  price4hrs40km?: number;
  price10hrs100km?: number;
}

export interface AirportFare {
  id: number;
  vehicleType: string;
  rate: number;
  location?: string;
  basePrice: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
}

export interface CommissionSetting {
  id: number | string;
  vehicleType: string;
  defaultPercentage: number;
  default_percentage?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
}

export interface CommissionPayment {
  id: number;
  bookingId: number;
  bookingNumber?: string;
  driverId: number;
  driverName: string;
  vehicleType: string;
  vehicleId?: string;
  totalAmount: number;
  amount?: number;
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
  id: number | string;
  fuelType: string;
  pricePerLiter: number;
  price: number;
  location?: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: number | string;
  vehicleId: string;
  fuelType: string;
  fillDate: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  odometer: number;
  fuelStation?: string;
  paymentMethod: 'Cash' | 'Card' | 'Company' | 'Customer';
  paymentDetails?: {
    bankName?: string;
    lastFourDigits?: string;
  };
  mileage?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FareBreakdown {
  basePrice: number;
  pricePerKm: number;
  extraKmPrice?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
  totalDistance: number;
  totalPrice: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
}
