
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

// Define more cab-related types here
