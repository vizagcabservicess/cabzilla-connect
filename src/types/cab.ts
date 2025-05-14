
export interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  basePrice: number;
  pricePerKm: number;
  image: string;
  amenities: string[];
  description: string;
  ac: boolean;
  nightHaltCharge?: number;
  driverAllowance?: number;
  isActive?: boolean;
  localPackageFares?: LocalPackageFare;
  outstationFares?: OutstationFare;
  airportFares?: AirportFare;
}

export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kms: number;
  basePrice?: number;
}

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;
  vehicleName: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  status: string;
  cabTypeId?: string;
  fuelType: string;
  capacity?: number;
  luggageCapacity?: number;
  currentOdometer?: number;
  isActive?: boolean;
  lastService?: string;
  lastServiceOdometer?: number;
  nextServiceDue?: string;
  nextServiceOdometer?: number;
  registrationExpiry?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  permitExpiry?: string;
  pucExpiry?: string;
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
  pricePerKm: number;
  basePrice: number;
  driverAllowance: number;
  roundTripPricePerKm?: number;
  roundTripBasePrice?: number;
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
}
