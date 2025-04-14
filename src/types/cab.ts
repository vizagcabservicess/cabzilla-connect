
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  price?: number;
  pricePerKm?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  basePrice?: number;
  vehicleId?: string;
  vehicleType?: string;
  // Fare properties
  outstationFares?: OutstationFare;
  localPackageFares?: LocalFare;
  airportFares?: AirportFare;
}

export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  // Alias properties for compatibility with different component usages
  nightHalt?: number;  // Alias for nightHaltCharge
}

export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number; 
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance: number; // Added driverAllowance property
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
  basePrice: number;
  pricePerKm: number;
  dropPrice: number;
  pickupPrice: number;
  tier1Price: number;   // 0-10 KM
  tier2Price: number;   // 11-20 KM
  tier3Price: number;   // 21-30 KM
  tier4Price: number;   // 31+ KM
  extraKmCharge: number;
}

export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
  forceRefresh?: boolean;  // Added this property
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  description?: string;
  basePrice?: number;
  multiplier?: number;
}

export interface FareCache {
  timestamp: number;
  fares: Record<string, any>;
}

export interface TourInfo {
  id: string;
  name: string;
  distance: number;
  days: number;
  description?: string;
  image?: string;
}

export interface TourFares {
  [tourId: string]: {
    sedan: number;
    ertiga: number;
    innova: number;
    tempo?: number;
    luxury?: number;
  };
}

export interface ExtraCharges {
  gst?: number;
  serviceTax?: number;
  driverAllowance?: number;
  parkingCharges?: number;
  stateTax?: number;
  tollCharges?: number;
}

export interface LocalPackagePriceMatrix {
  [packageId: string]: {
    [cabType: string]: number;
  };
}

export interface VehiclePricing {
  vehicleType: string;
  vehicleId?: string;  // Added to support both column names
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundtripBasePrice?: number;
  roundtripPricePerKm?: number;
  // Local package fare properties in both naming conventions
  localPackage4hr?: number;
  localPackage8hr?: number;
  localPackage10hr?: number;
  extraKmCharge?: number;
  extraHourCharge?: number;
  // Local package fare properties in alternative naming conventions
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Airport fare properties
  airportBasePrice?: number;
  airportPricePerKm?: number;
  airportDropPrice?: number;
  airportPickupPrice?: number;
  airportTier1Price?: number;
  airportTier2Price?: number;
  airportTier3Price?: number;
  airportTier4Price?: number;
  airportExtraKmCharge?: number;
}

export interface FareData {
  vehicleId: string;
  vehicle_id?: string;
  // Local fare fields
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Airport fare fields
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  // Outstation fare fields
  oneWayBasePrice?: number;
  oneWayPricePerKm?: number;
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
  driverAllowance?: number;
  nightHaltCharge?: number;
  [key: string]: any;
}

export interface LocalFareData {
  vehicleId: string;
  vehicle_id?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  driverAllowance?: number;
  [key: string]: any;
}

export interface AirportFareData {
  vehicleId: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  [key: string]: any;
}

export interface OutstationFareData {
  vehicleId: string;
  vehicle_id?: string;
  oneWayBasePrice: number;
  oneWayPricePerKm: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  basePrice?: number;
  pricePerKm?: number;
  [key: string]: any;
}
