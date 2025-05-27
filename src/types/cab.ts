
// Cab Types
export interface CabType {
  id: string;
  name: string;
  type: string;
  capacity: number;
  luggageCapacity: number;
  luggage: string;
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
  vehicleId?: string;
  outstationFares?: any;
  airportFares?: any;
  localPackageFares?: LocalPackagePriceMatrix;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  price: number;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  driverId?: string;
  location?: string;
  fuelLevel?: number;
  mileage?: number;
  lastService?: string;
  nextService?: string;
  registrationExpiry?: string;
  insuranceExpiry?: string;
  pollutionExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelPrice {
  id: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  pricePerLitre: number;
  effectiveDate: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  quantity: number;
  pricePerLitre: number;
  totalAmount: number;
  odometer: number;
  fuelStationName?: string;
  receiptNumber?: string;
  filledBy: string;
  date: string;
  createdAt: string;
  updatedAt: string;
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

export interface LocalPackagePriceMatrix {
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extraKmRate: number;
  extraHourRate: number;
}

export interface FareCalculationParams {
  cabType: CabType;
  tripType: string;
  tripMode: string;
  distance: number;
}

export interface LocalFare {
  id: string;
  vehicle_type: string;
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extra_km_charge: number;
  extra_hour_charge: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  price8hrs80km?: number;
}

export interface FareBreakdown {
  basePrice: number;
  perKmRate: number;
  perHourRate?: number;
  nightCharges?: number;
  tolls?: number;
  taxes?: number;
  total: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  price8hrs80km?: number;
}
