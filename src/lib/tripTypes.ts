
export type TripType = 'outstation' | 'local' | 'airport' | 'tour' | 'admin';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

// Type guard to check if a trip type is a tour
export const isTourTripType = (tripType: TripType): boolean => {
  return tripType === 'tour';
};

// Type guard to check if a trip type is for admin use
export const isAdminTripType = (tripType: TripType): boolean => {
  return tripType === 'admin';
};

// Type guard to check if a trip type is one of the regular types
export const isRegularTripType = (tripType: TripType): boolean => {
  return tripType === 'outstation' || tripType === 'local' || tripType === 'airport';
};

// Type guard to check if tripType is a customer-facing type (not admin)
export const isCustomerTripType = (tripType: TripType): boolean => {
  return tripType === 'outstation' || tripType === 'local' || tripType === 'airport' || tripType === 'tour';
};

// Type assertion function to ensure trip type is customer-facing
export const ensureCustomerTripType = (tripType: TripType | string): 'outstation' | 'local' | 'airport' | 'tour' => {
  // First make sure it's one of our valid trip types
  const validType = ['outstation', 'local', 'airport', 'tour', 'admin'].includes(tripType) ? 
    tripType as TripType : 
    'outstation';
    
  // Then make sure it's a customer-facing type
  return isCustomerTripType(validType) 
    ? validType as 'outstation' | 'local' | 'airport' | 'tour'
    : 'outstation'; // Default to outstation if admin type is passed
};
