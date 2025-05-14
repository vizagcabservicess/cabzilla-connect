
export interface LocalFare {
  id: string;
  cabTypeId: string;
  basePrice: number;
  price4hr40km: number;
  price8hr80km: number;
  price10hr100km: number;
  extraKmCharge: number;
  extraHourCharge: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocalPackageFare {
  id: string;
  packageId: string;
  price: number;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  cabTypeId: string;
}

export interface OutstationFare {
  id: string;
  cabTypeId: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightCharges?: number;
  roundTripBasePrice?: number;
  roundTripPricePerKm?: number;
  minKm?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AirportFare {
  id: string;
  cabTypeId: string;
  basePrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FareBreakdown {
  basePrice: number;
  driverAllowance?: number;
  nightCharges?: number;
  extraDistanceFare?: number;
  extraKmCharge?: number;
  airportFee?: number;
  packageLabel?: string;
  discount?: number;
  tax?: number;
  extraCharges?: number;
}

export interface FareCalculationResult {
  totalPrice: number;
  basePrice: number;
  breakdown: FareBreakdown;
  timestamp: number;
}
