export interface AdminProfile {
  id: number;
  adminUserId: number;
  businessName: string;
  displayName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  logoUrl?: string;
  description?: string;
  startingFare: number;
  rating: number;
  totalRatings: number;
  isActive: boolean;
  serviceAreas: string[];
  amenities: string[];
  vehicleTypes: string[];
  vehicleCount?: number;
  bookingCount?: number;
  createdAt?: string;
  updatedAt?: string;
  adminUser?: {
    name: string;
    email: string;
    phone: string;
    role?: string;
  };
}

export interface CreateAdminProfileRequest {
  adminUserId?: number;
  businessName: string;
  displayName: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  logoUrl?: string;
  description?: string;
  startingFare: number;
  serviceAreas: string[];
  amenities: string[];
  vehicleTypes: string[];
}

export interface UpdateAdminProfileRequest extends CreateAdminProfileRequest {
  id: number;
  isActive?: boolean;
}

export interface OperatorCard {
  id: number;
  adminUserId: number;
  businessName: string;
  displayName: string;
  description?: string;
  startingFare: number;
  rating: number;
  totalRatings: number;
  vehicleCount: number;
  serviceAreas: string[];
  amenities: string[];
  vehicleTypes: string[];
  logoUrl?: string;
}

export interface OperatorReview {
  id: number;
  operatorAdminId: number;
  bookingId?: number;
  customerName?: string;
  customerEmail?: string;
  rating: number;
  reviewText?: string;
  isVerified: boolean;
  isPublic: boolean;
  createdAt: string;
}

export interface AdminVehicleFare {
  id: number;
  adminId: number;
  vehicleId: number;
  tripType: 'local' | 'outstation' | 'airport';
  baseFare: number;
  perKmRate: number;
  perHourRate: number;
  nightCharges: number;
  waitingCharges: number;
  tollCharges: number;
  driverAllowance: number;
  isActive: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilter {
  operatorId?: number;
  vehicleType?: string[];
  tripType?: 'local' | 'outstation' | 'airport';
  features?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  availability?: {
    date: string;
    time?: string;
  };
  sortBy?: 'price' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
}