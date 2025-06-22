export interface GalleryItem {
  url: string;
  alt?: string;
  caption?: string;
}

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
  discount?: string;
  oldPrice?: string;
  year?: number;
  lastService?: string;
  vehicleNumber?: string;
  model?: string;
  make?: string;
  status?: 'Active' | 'Maintenance' | 'Inactive';
  outstationFares?: OutstationFare;
  localPackageFares?: LocalFare;
  airportFares?: AirportFare;
  commissionPercentage?: number;
  defaultCommission?: boolean;
  inclusions?: string[];
  exclusions?: string[];
  cancellationPolicy?: string;
  fuelType?: string;
  gallery?: GalleryItem[];
}

export interface OutstationFare {
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  nightHalt?: number;
}

export interface LocalFare {
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number; 
  priceExtraKm: number;
  priceExtraHour: number;
  package4hr40km?: number;
  package8hr80km?: number;
  package10hr100km?: number;
  extraKmRate?: number;
  extraHourRate?: number;
  local_package_4hr?: number;
  local_package_8hr?: number;
  local_package_10hr?: number;
  extra_km_charge?: number;
  extra_hour_charge?: number;
  price_4hrs_40km?: number;
  price_8hrs_80km?: number;
  price_10hrs_100km?: number;
  price_extra_km?: number;
  price_extra_hour?: number;
}

export interface AirportFare {
  basePrice: number;
  pricePerKm: number;
  dropPrice: number;
  pickupPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  airportFee?: number;
}

export interface FareCalculationParams {
  cabType: CabType;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
  forceRefresh?: boolean;
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
  pricing?: { [vehicleId: string]: number };
}

export interface TourFares {
  [tourId: string]: {
    [vehicleId: string]: number;
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
  vehicleId?: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
  roundtripBasePrice?: number;
  roundtripPricePerKm?: number;
  localPackage4hr?: number;
  localPackage8hr?: number;
  localPackage10hr?: number;
  extraKmCharge?: number;
  extraHourCharge?: number;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
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
  vehicleNumber: string;
  name: string;
  model: string;
  make: string;
  year: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  lastService: string;
  nextServiceDue: string;
  lastServiceOdometer?: number;
  nextServiceOdometer?: number;
  fuelType: string;
  vehicleType: string;
  cabTypeId: string;
  capacity: number;
  luggageCapacity: number;
  isActive: boolean;
  assignedDriverId?: string;
  currentOdometer?: number;
  documents?: VehicleDocument[];
  createdAt: string;
  updatedAt: string;
  vehicle_number?: string;
  emi?: number;
  commissionPercentage?: number;
  inclusions?: string[];
  exclusions?: string[];
  cancellationPolicy?: string;
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
  id: string | number;
  vehicleId: string;
  fillDate: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  odometer: number;
  fuelStation: string;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
  paymentMethod: 'Cash' | 'Card' | 'Company' | 'Customer';
  paymentDetails?: {
    bankName?: string;
    lastFourDigits?: string;
  };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  mileage?: number;
  calculatedMileage?: number | null;
  vehicleName?: string;
  vehicleNumber?: string;
  vehicleModel?: string;
}

export interface FuelPrice {
  id: string;
  fuelType: 'Petrol' | 'Diesel' | 'CNG';
  price: number;
  effectiveDate: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSetting {
  id: string;
  name: string;
  description?: string;
  defaultPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPayment {
  id: string;
  bookingId: string;
  vehicleId: string;
  driverId?: string;
  amount: number;
  commissionAmount: number;
  commissionPercentage: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionReport {
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  vehicleWiseCommission: {
    vehicleId: string;
    vehicleName: string;
    bookings: number;
    revenue: number;
    commission: number;
    percentage: number;
  }[];
  periodStart: string;
  periodEnd: string;
}
