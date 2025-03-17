
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
    isPickupLocation: location.isPickupLocation === true,
    isDropLocation: location.isDropLocation === true,
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
    // Safety check: ensure the location object exists
    if (!apiLocation) {
      setter(null);
      return;
    }
    
    // If the address is empty or undefined, don't reset the location
    // This allows users to type and see suggestions
    if (!apiLocation.address || apiLocation.address.trim() === '') {
      // Only if it's the only property, it might be a text input clearing
      if (Object.keys(apiLocation).length === 1) {
        return;
      }
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
      isPickupLocation: apiLocation.isPickupLocation === true,
      isDropLocation: apiLocation.isDropLocation === true
    };
    
    setter(libLocation);
  };
}
