
// Cab type definitions

// Common properties of all vehicles
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity?: number;
  price?: number;
  pricePerKm?: number;
  image?: string;
  amenities?: string[];
  description?: string;
  ac?: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  
  // Additional properties used in the application
  vehicleId?: string; // Alternative ID used in some parts of the app
  basePrice?: number; // Base price for fare calculations
  
  // Fare-related properties
  localPackageFares?: {
    price4hrs40km?: number;
    price8hrs80km?: number;
    price10hrs100km?: number;
  };
  outstationFares?: {
    basePrice?: number;
    pricePerKm?: number;
    driverAllowance?: number;
    nightHaltCharge?: number;
    roundTripPricePerKm?: number;
    roundTripBasePrice?: number;
  };
  airportFares?: {
    basePrice?: number;
    tier1Price?: number;
    tier2Price?: number;
    tier3Price?: number;
    tier4Price?: number;
    extraKmCharge?: number;
  };
}

// Local hourly package definition
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  description?: string;
  basePrice?: number; // Optional price field
}

// Additional fare-related types needed in the application
export interface FareCalculationParams {
  tripType: string;
  distance: number;
  cabType: string;
  tripMode?: 'one-way' | 'round-trip';
  packageId?: string;
}

export interface LocalFare {
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  price_4hr_40km?: number;
  price_8hr_80km?: number;
  price_10hr_100km?: number;
}

export interface OutstationFare {
  basePrice?: number;
  pricePerKm?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  roundTripPricePerKm?: number;
  roundTripBasePrice?: number;
}

export interface AirportFare {
  basePrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
}

export interface VehiclePricing {
  vehicleId: string;
  basePrice?: number;
  pricePerKm?: number;
}

export interface LocalPackagePriceMatrix {
  [vehicleId: string]: LocalFare;
}

export interface FareCache {
  timestamp: number;
  data: Record<string, any>;
}

export interface TourInfo {
  id: string;
  name: string;
  description?: string;
  duration?: string;
  distance?: number;
}

export interface TourFares {
  [vehicleId: string]: number;
}

export interface ExtraCharges {
  driverAllowance?: number;
  nightHaltCharge?: number;
  gst?: number;
}
