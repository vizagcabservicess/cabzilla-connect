
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
}

export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHalt: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
}

export interface LocalFare {
  package4hr40km: number;
  package8hr80km: number;
  package10hr100km: number;
  extraKmRate: number;
  extraHourRate: number;
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
