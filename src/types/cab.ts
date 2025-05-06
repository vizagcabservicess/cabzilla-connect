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
  // Fleet management properties
  year?: number;
  lastService?: string;
  vehicleNumber?: string;
  model?: string;
  make?: string;
  status?: 'Active' | 'Maintenance' | 'Inactive';
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
  airportFee?: number;  // Added airportFee property
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

export interface FleetVehicle {
  id: string;
  vehicleNumber: string;  // Registration/license plate number
  name: string;           // Display name
  model: string;          // Vehicle model
  make: string;           // Manufacturer
  year: number;           // Year of manufacture
  status: 'Active' | 'Maintenance' | 'Inactive';
  lastService: string;    // Date of last service
  nextServiceDue: string; // Date when next service is due
  lastServiceOdometer?: number; // Odometer reading at last service
  nextServiceOdometer?: number; // Odometer reading for next service due
  fuelType: string;       // Petrol, Diesel, CNG, Electric
  vehicleType: string;    // Sedan, SUV, etc.
  cabTypeId: string;      // Reference to the cab type
  capacity: number;       // Passenger capacity
  luggageCapacity: number; // Luggage capacity
  isActive: boolean;      // Whether the vehicle is active
  assignedDriverId?: string; // Reference to assigned driver
  currentOdometer?: number;  // Current odometer reading
  documents?: VehicleDocument[];
  createdAt: string;
  updatedAt: string;
  vehicle_number?: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  type: 'registration' | 'insurance' | 'permit' | 'fitness' | 'pollution' | 'other';
  number: string;
  issuedDate: string;
  expiryDate: string;
  fileUrl?: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  notes?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  cost: number;
  vendor: string;
  odometer: number;
  nextServiceDue: string;
  nextServiceOdometer: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  fillDate: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  odometer: number;
  fuelStation: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
