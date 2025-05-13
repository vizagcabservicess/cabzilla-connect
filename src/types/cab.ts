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
  kms: number; // Replace kilometers with kms
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
  vehicleName?: string; // Add this property for compatibility
}

export interface FuelPrice {
  id: string;
  fuelType: "Diesel" | "Petrol" | "CNG";
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
  fuelType: "Diesel" | "Petrol" | "CNG";
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometer: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalPackageFare {
  id: string;
  packageId: string;
  price: number;
  price8hrs80km?: number;
}
