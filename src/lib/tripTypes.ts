
export type TripType = 'outstation' | 'local' | 'airport' | 'tour' | 'admin';
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
  return tripType === 'outstation' || tripType === 'local' || tripType === 'airport';
};

// Helper to check if tripType is a customer-facing type (not admin)
export const isCustomerTripType = (tripType: TripType): boolean => {
  return tripType === 'outstation' || tripType === 'local' || tripType === 'airport' || tripType === 'tour';
};

// Function to ensure trip type is customer-facing for UI components
export const ensureCustomerTripType = (tripType: TripType): 'outstation' | 'local' | 'airport' | 'tour' => {
  return isCustomerTripType(tripType) 
    ? tripType as 'outstation' | 'local' | 'airport' | 'tour'
    : 'outstation'; // Default to outstation if admin type is passed
};

// Get display name for trip type
export const getTripTypeDisplayName = (tripType: TripType): string => {
  switch (tripType) {
    case 'outstation':
      return 'Outstation Trip';
    case 'local':
      return 'Local Hourly Rental';
    case 'airport':
      return 'Airport Transfer';
    case 'tour':
      return 'Tour Package';
    case 'admin':
      return 'Custom Booking';
    default:
      return 'Trip';
  }
};
