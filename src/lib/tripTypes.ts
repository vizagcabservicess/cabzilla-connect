
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

// Add any additional helper functions if needed
