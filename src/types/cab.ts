
export interface CabType {
  id: string;
  name: string;
  description: string;
  image: string;
  capacity: number;
  luggageCapacity: number;
  basePrice: number;
  pricePerKm: number;
  amenities: string[];
  ac: boolean;
  price?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  isActive?: boolean;
  vehicleId?: string;
  localPackageFares?: {
    price8hrs80km?: number;
  };
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kms: number; 
  basePrice: number;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  status: string;
  lastService?: string;
  lastServiceOdometer?: number;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  fuelType?: string;
  fuelEfficiency?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  createdAt?: string;
  updatedAt?: string;
  vehicleName?: string; // Added for backward compatibility
  // Adding properties used in components but missing from the interface
  capacity?: number;
  luggageCapacity?: number;
  isActive?: boolean;
  currentOdometer?: number;
  cabTypeId?: string;
}

export interface FuelPrice {
  id: string;
  fuelType: "Diesel" | "Petrol" | "CNG" | "Electric";  // Added Electric to fix error
  price: number;
  location: string;
  effectiveDate: string;
  date?: string; // Added for compatibility
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  refillDate: string;
  fillDate?: string; // Added for backward compatibility
  fuelType: "Diesel" | "Petrol" | "CNG" | "Electric";
  liters: number;
  quantity?: number; // Added for backward compatibility
  pricePerLiter: number;
  pricePerUnit?: number; // Added for backward compatibility
  totalAmount: number;
  totalCost?: number; // Added for backward compatibility
  odometer: number;
  location?: string;
  notes?: string;
  fuelStation?: string; // Added for backward compatibility
  createdAt: string;
  updatedAt: string;
  mileage?: number;
  paymentMethod?: 'Cash' | 'Card' | 'Company' | 'Customer';
  paymentDetails?: {
    bankName?: string;
    lastFourDigits?: string;
  };
}

export interface LocalPackageFare {
  id: string;
  packageId: string;
  price: number;
  price8hrs80km?: number;
}

export interface OutstationFare {
  id: string;
  vehicleId: string;
  pricePerKm: number;
  basePrice: number;
  driverAllowance: number;
  roundTripPricePerKm?: number;
  roundTripBasePrice?: number;
  nightHaltCharge?: number;
  minKm?: number;
  description?: string;
  isActive?: boolean;
}

export interface AirportFare {
  id: string;
  vehicleId: string;
  basePrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  description?: string;
  isActive?: boolean;
}

export interface LocalFare {
  id: string;
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  extraKmRate?: number;
  extraHourRate?: number;
  description?: string;
  isActive?: boolean;
}
