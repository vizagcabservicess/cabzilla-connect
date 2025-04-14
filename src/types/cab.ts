// Define all cab-related types and interfaces

export interface CabType {
  id: string;
  vehicleId?: string;
  name: string;
  image?: string;
  description?: string;
  capacity: number;
  luggageCapacity: number;
  basePrice?: number;
  price?: number;
  pricePerKm?: number;
  ac?: boolean;
  isActive?: boolean;
  amenities?: string[];
  driverAllowance?: number;
  nightHaltCharge?: number;
  outstationFares?: OutstationFare;
  localFares?: LocalFare;
  airportFares?: AirportFare;
  maxHours?: number;
  maxDistance?: number;
  localPackageFares?: any;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice?: number;
  description?: string;
  multiplier?: number;
}

export interface LocalPackagePriceMatrix {
  [key: string]: {
    [key: string]: number;
  };
}

export interface FareCache {
  [key: string]: {
    fare: number;
    timestamp: number;
    expiry: number;
  };
}

export interface TourInfo {
  id: string;
  name: string;
  distance: number;
  description?: string;
  image?: string;
  duration?: string;
  includes?: string[];
  excludes?: string[];
  attractions?: string[];
  basePrice?: number;
  days?: number;
}

export interface TourFares {
  [tourId: string]: {
    [cabId: string]: number;
  };
}

export interface ExtraCharges {
  nightCharges?: number;
  extraKmCharges?: number;
  extraHourCharges?: number;
  driverAllowance?: number;
  gst?: number;
}

export interface FareCalculationParams {
  cabType: CabType | string;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  extraKm?: number;
  extraHours?: number;
  pickupDate?: Date;
  returnDate?: Date | null;
  forceRefresh?: boolean;
}

export interface OutstationFare {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  minDistance?: number;
  driverAllowance?: number;
  nightHaltCharges?: number;
  roundTripPricePerKm?: number;
  gst?: number;
}

export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number; 
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance: number;  // Added this missing property
  // Alias properties for compatibility with different component usages
  package4hr40km?: number;  // Alias for price4hrs40km
  package8hr80km?: number;  // Alias for price8hrs80km
  package10hr100km?: number;  // Alias for price10hrs100km
  extraKmRate?: number;  // Alias for priceExtraKm
  extraHourRate?: number;  // Alias for priceExtraHour
  // Additional aliases for database column name variations
  local_package_4hr?: number;  // For vehicle_pricing table
  local_package_8hr?: number;  // For vehicle_pricing table
  local_package_10hr?: number; // For vehicle_pricing table
  extra_km_charge?: number;    // For vehicle_pricing table
  extra_hour_charge?: number;  // For vehicle_pricing table
  // Raw database column names from local_package_fares
  price_4hrs_40km?: number;    // From local_package_fares table
  price_8hrs_80km?: number;    // From local_package_fares table
  price_10hrs_100km?: number;  // From local_package_fares table
  price_extra_km?: number;     // From local_package_fares table
  price_extra_hour?: number;   // From local_package_fares table
}

export interface AirportFare {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;  // <= 10km
  tier2Price?: number;  // 11-20km
  tier3Price?: number;  // 21-30km
  tier4Price?: number;  // > 30km
  extraKmCharge?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
}

export interface VehiclePricing {
  vehicle_id: string;
  price_per_km: number;
  base_price: number;
  driver_allowance?: number;
  night_halt_charge?: number;
  gst_percentage?: number;
}

export interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice?: number;
  [key: string]: any;
}

// Making vehicleId required to match service expectations
export interface LocalFareData extends FareData {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

// Making vehicleId required to match service expectations
export interface AirportFareData extends FareData {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

export interface OutstationFareData {
  vehicleId: string;
  basePrice: number;
  pricePerKm: number;
  roundTripPricePerKm: number;
  minDistance: number;  // Added this missing property
  driverAllowance: number;
  nightHaltCharge: number;
  // Additional properties for the component
  roundTripBasePrice?: number;
  oneWayBasePrice?: number;
  oneWayPricePerKm?: number;
}
