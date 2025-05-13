
export interface CabType {
  id: string;
  name: string;
  description: string;
  image: string;
  capacity: number;
  basePrice: number;
  pricePerKm: number;
  amenities: string[];
  luggageCapacity?: number;
  ac?: boolean;
  // Add missing properties that are causing errors
  price?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  isActive?: boolean;
  vehicleId?: string;
  localPackageFares?: LocalPackageFare[];
}

// Add FleetVehicle type that's missing
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
  capacity: number;
  cabTypeId?: string;
  luggageCapacity?: number;
  isActive?: boolean;
  currentOdometer?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Add HourlyPackage type
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  distance: number;
  price: number;
  vehicleType?: string;
  description?: string;
  isActive?: boolean;
}

// Add LocalPackageFare type
export interface LocalPackageFare {
  packageId: string;
  packageName: string;
  basePrice: number;
  hours: number;
  kilometers: number;
  extraHourRate?: number;
  extraKmRate?: number;
}

// Add missing types for fuel-related components
export interface FuelPrice {
  id: string | number;
  fuelType: string;
  price: number;
  date: string;
  location?: string;
  updatedAt?: string;
}

export interface FuelRecord {
  id?: string | number;
  vehicleId: string;
  fuelType: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  odometer: number;
  date: string;
  paymentMode?: string;
  stationName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Add types that are re-exported from lib/index.ts
export interface FareCache {}
export interface TourInfo {}
export interface TourFares {}
export interface ExtraCharges {}
export interface LocalPackagePriceMatrix {}
export interface FareCalculationParams {}
export interface VehiclePricing {}
export interface OutstationFare {}
export interface LocalFare {}
export interface AirportFare {}
