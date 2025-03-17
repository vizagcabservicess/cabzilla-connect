
import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

/**
 * Converts a Location from locationData.ts format to the api.ts Location format
 */
export function convertToApiLocation(location: LibLocation): ApiLocation {
  return {
    id: location.id,
    name: location.name,
    city: location.city,
    state: location.state,
    lat: location.lat,
    lng: location.lng,
    type: location.type,
    popularityScore: location.popularityScore,
    isPickupLocation: location.isPickupLocation,
    isDropLocation: location.isDropLocation,
    address: location.name // Use name as address since locationData.ts doesn't have address
  };
}

/**
 * Converts a setState function for a locationData.ts Location to a handler for api.ts Location
 */
export function createLocationChangeHandler(
  setter: React.Dispatch<React.SetStateAction<LibLocation | null>>
): (location: ApiLocation) => void {
  return (apiLocation: ApiLocation) => {
    const libLocation: LibLocation = {
      id: apiLocation.id || '',
      name: apiLocation.name || apiLocation.address,
      city: apiLocation.city || '',
      state: apiLocation.state || '',
      lat: apiLocation.lat || 0,
      lng: apiLocation.lng || 0,
      type: apiLocation.type || 'other',
      popularityScore: apiLocation.popularityScore || 0,
      isPickupLocation: apiLocation.isPickupLocation,
      isDropLocation: apiLocation.isDropLocation
    };
    setter(libLocation);
  };
}
