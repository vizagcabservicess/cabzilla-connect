
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
    // Handle null or empty location
    if (!apiLocation || !apiLocation.address) {
      setter(null);
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
      isPickupLocation: apiLocation.isPickupLocation || false,
      isDropLocation: apiLocation.isDropLocation || false
    };
    
    setter(libLocation);
  };
}
