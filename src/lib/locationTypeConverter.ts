
import { Location as LocationDataType } from '@/lib/locationData';
import { Location as ApiLocationType } from '@/types/api';

/**
 * Converts an API location type to the internal location data type
 */
export function convertApiLocationToInternalLocation(location: ApiLocationType): LocationDataType {
  return {
    ...location,
    popularityScore: 0, // Default popularity score
    isInVizag: location.isInVizag ?? false,
    type: location.type || 'general',
    lat: location.lat || 0,
    lng: location.lng || 0
  };
}

/**
 * Safely handles location props to work with both Location types
 */
export function createLocationChangeHandler(
  setter: React.Dispatch<React.SetStateAction<LocationDataType | null>>
) {
  return (location: ApiLocationType) => {
    setter(location ? convertApiLocationToInternalLocation(location) : null);
  };
}
