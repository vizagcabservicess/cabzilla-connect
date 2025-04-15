
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
  
  // Additional properties needed by components
  vehicleId?: string; // Alternative ID used in some API responses
  basePrice?: number; // Base price for calculation
  
  // Fare-related properties
  outstationFares?: OutstationFare;
  localPackageFares?: LocalFare;
  airportFares?: AirportFare;
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

// Fare calculation parameters
export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode?: 'one-way' | 'round-trip';
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  forceRefresh?: boolean;
}

// Fare cache interface
export interface FareCache {
  expire: number;
  price: number;
}

// Tour information
export interface TourInfo {
  id: string;
  name: string;
  description: string;
  duration: string;
  places: string[];
  image?: string;
}

// Tour fare mapping by vehicle types
export interface TourFares {
  [tourId: string]: {
    [vehicleId: string]: number;
  };
}

// Extra charges that might apply to a booking
export interface ExtraCharges {
  nightHalt?: number;
  extraKm?: number;
  extraHour?: number;
  toll?: number;
  parking?: number;
  other?: number;
}

// Local package price matrix
export interface LocalPackagePriceMatrix {
  [vehicleId: string]: {
    [packageId: string]: number;
  };
}

// Vehicle pricing structure for different fare types
export interface VehiclePricing {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

// Outstation fare structure
export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
  driverAllowance: number;
  nightHaltCharge: number;
}

// Local fare structure
export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate: number;
  extraHourRate: number;
}

// Airport fare structure
export interface AirportFare {
  basePrice: number;
  pricePerKm: number;
  airportFee?: number;
  dropPrice?: number;
  pickupPrice?: number;
  tier1Price: number;    // 0-10 KM
  tier2Price: number;    // 11-20 KM
  tier3Price: number;    // 21-30 KM
  tier4Price: number;    // 31+ KM
  extraKmCharge: number;
}
