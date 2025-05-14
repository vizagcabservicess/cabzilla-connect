
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  basePrice: number;
  price?: number;  // Legacy support
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  vehicleId?: string;
  outstationFares?: OutstationFare;
  localPackageFares?: LocalPackageFare[];
  airportFares?: AirportFare;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  vehicleName?: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  status: string;
  lastService?: string;
  lastServiceOdometer?: number;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
  registration?: string;
  insurance?: string;
  insuranceExpiry?: string;
  permit?: string;
  permitExpiry?: string;
  pollution?: string;
  pollutionExpiry?: string;
  currentOdometer?: number;
  capacity?: number;
  luggageCapacity?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kms: number;
  basePrice?: number;  // Added basePrice for compatibility
}

export interface LocalFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  // Legacy field names compatibility
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  extra_km_charge?: number;
  extra_hour_charge?: number;
}

export interface LocalPackageFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

export interface OutstationFare {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
}

export interface AirportFare {
  vehicleId: string;
  basePrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

export interface FuelPrice {
  id: string;
  fuelType: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
  price: number;
  effectiveDate: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  date?: string; // For compatibility
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  refillDate: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometer: number;
  fuelType: 'Diesel' | 'Petrol' | 'CNG' | 'Electric';
  location?: string;
  notes?: string;
  paymentMethod?: 'Cash' | 'Card' | 'Company' | 'Customer';
  paymentDetails?: {
    bankName?: string;
    lastFourDigits?: string;
  };
  mileage?: number;
  
  // For compatibility with form fields
  quantity?: number;
  pricePerUnit?: number;
  totalCost?: number;
  fuelStation?: string;
  fillDate?: string;
}
