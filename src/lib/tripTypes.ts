
// Create or update the tripTypes.ts file to include the required types
export type TripMode = 'one-way' | 'round-trip' | 'pickup' | 'drop' | 'continued';
export type TripType = 'local' | 'outstation' | 'airport' | 'tour';

// Add the missing functions that are imported elsewhere
export const isAdminTripType = (tripType: string): boolean => {
  return ['admin', 'fleet', 'maintenance', 'fuel'].includes(tripType);
};

export const isTourTripType = (tripType: string): boolean => {
  return tripType === 'tour';
};

export const isRegularTripType = (tripType: string): boolean => {
  return ['local', 'outstation', 'airport'].includes(tripType);
};

export const ensureCustomerTripType = (tripType: string): TripType => {
  if (['local', 'outstation', 'airport', 'tour'].includes(tripType)) {
    return tripType as TripType;
  }
  return 'local';
};

// These functions are likely imported elsewhere but not used in the error list
export const isCustomerTripType = (tripType: string): boolean => {
  return ['local', 'outstation', 'airport', 'tour'].includes(tripType);
};

export const isAdminTripType2 = (tripType: string): boolean => {
  return ['admin', 'fleet', 'maintenance', 'fuel'].includes(tripType);
};
