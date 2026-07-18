
export type TripType = 'outstation' | 'local' | 'airport' | 'tour' | 'admin' | 'custom';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

// Helper functions for trip type validation
export const isTourTripType = (tripType: TripType): boolean => {
  return tripType === 'tour';
};

export const isAdminTripType = (tripType: TripType): boolean => {
  return tripType === 'admin';
};

export const isRegularTripType = (tripType: TripType): boolean => {
  return (
    tripType === 'outstation' ||
    tripType === 'local' ||
    tripType === 'airport' ||
    tripType === 'custom'
  );
};

// Helper to check if tripType is a customer-facing type (not admin)
export const isCustomerTripType = (tripType: TripType): boolean => {
  return (
    tripType === 'outstation' ||
    tripType === 'local' ||
    tripType === 'airport' ||
    tripType === 'tour' ||
    tripType === 'custom'
  );
};

// Function to ensure trip type is customer-facing for UI components
export const ensureCustomerTripType = (
  tripType: TripType
): 'outstation' | 'local' | 'airport' | 'tour' | 'custom' => {
  return isCustomerTripType(tripType)
    ? (tripType as 'outstation' | 'local' | 'airport' | 'tour' | 'custom')
    : 'outstation';
};
