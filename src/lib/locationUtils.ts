
import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

/**
 * Converts a Location from locationData.ts format to the api.ts Location format
 */
export function convertToApiLocation(location: LibLocation | null): ApiLocation {
  if (!location) return { address: '' };
  
  return {
    id: location.id || '',
    name: location.name || '',
    city: location.city || '',
    state: location.state || '',
    lat: location.lat || 0,
    lng: location.lng || 0,
    type: location.type || 'other',
    popularityScore: location.popularityScore || 0,
    isPickupLocation: location.isPickupLocation || false,
    isDropLocation: location.isDropLocation || false,
    address: location.name || '' // Use name as address since locationData.ts doesn't have address
  };
}

/**
 * Converts a setState function for a locationData.ts Location to a handler for api.ts Location
 */
export function createLocationChangeHandler(
  setter: React.Dispatch<React.SetStateAction<LibLocation | null>>
): (location: ApiLocation) => void {
  return (apiLocation: ApiLocation) => {
    // Safety check: ensure the location object and necessary properties exist
    if (!apiLocation) {
      setter(null);
      return;
    }
    
    // If only address is empty string, this may be a user typing - don't reset the location
    if (Object.keys(apiLocation).length === 1 && apiLocation.address === '') {
      return;
    }
    
    // Convert API location to Library location format with safe defaults
    const libLocation: LibLocation = {
      id: apiLocation.id || '',
      name: apiLocation.name || apiLocation.address || '',
      city: apiLocation.city || '',
      state: apiLocation.state || '',
      lat: apiLocation.lat || 0,
      lng: apiLocation.lng || 0,
      type: apiLocation.type || 'other',
      popularityScore: apiLocation.popularityScore || 0,
      isPickupLocation: Boolean(apiLocation.isPickupLocation),
      isDropLocation: Boolean(apiLocation.isDropLocation)
    };
    
    setter(libLocation);
  };
}
