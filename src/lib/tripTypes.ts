
export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';
export type LocalTripPurpose = 'business' | 'personal' | 'city-tour';

// Extended trip types for the fare management system
export type ExtendedTripType = 
  | TripType 
  | 'outstation-one-way' 
  | 'outstation-round-trip' 
  | 'base'
  | 'local-standard'
  | 'airport-transfer';

// Helper function to get the basic trip type from extended type
export const getBasicTripType = (extendedType: ExtendedTripType): TripType => {
  if (extendedType.startsWith('outstation')) {
    return 'outstation';
  }
  if (extendedType.startsWith('local')) {
    return 'local';
  }
  if (extendedType.startsWith('airport')) {
    return 'airport';
  }
  return extendedType as TripType;
};

// Helper function to get the trip mode from extended trip type
export const getTripModeFromExtendedType = (extendedType: ExtendedTripType): TripMode | null => {
  if (extendedType === 'outstation-one-way') {
    return 'one-way';
  }
  if (extendedType === 'outstation-round-trip') {
    return 'round-trip';
  }
  return null;
};
