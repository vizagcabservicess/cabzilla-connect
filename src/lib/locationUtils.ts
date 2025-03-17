
import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

/**
 * Converts a Location from locationData.ts format to the api.ts Location format
 */
export function convertToApiLocation(location: LibLocation | null): ApiLocation {
  if (!location) return { address: '' };
  
  const result: ApiLocation = {
    address: location.name || ''  // Use name as address since locationData.ts doesn't have address
  };
  
  // Only add properties that exist in the location object
  if (location.id) result.id = location.id;
  if (location.name) result.name = location.name;
  if (location.city) result.city = location.city;
  if (location.state) result.state = location.state;
  if (typeof location.lat === 'number') result.lat = location.lat;
  if (typeof location.lng === 'number') result.lng = location.lng;
  if (location.type) result.type = location.type;
  if (typeof location.popularityScore === 'number') result.popularityScore = location.popularityScore;
  
  // Explicit boolean check to avoid issues with falsy values
  if (typeof location.isPickupLocation === 'boolean') result.isPickupLocation = location.isPickupLocation;
  if (typeof location.isDropLocation === 'boolean') result.isDropLocation = location.isDropLocation;
  
  return result;
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
    
    // If there is just an empty address field, preserve the existing location
    // This allows for partial input without resetting the location
    if (
      Object.keys(apiLocation).length === 1 && 
      (!apiLocation.address || apiLocation.address.trim() === '')
    ) {
      return;
    }
    
    // Convert API location to Library location format with safe defaults
    const libLocation: LibLocation = {
      id: apiLocation.id || '',
      name: apiLocation.name || apiLocation.address || '',
      city: apiLocation.city || '',
      state: apiLocation.state || '',
      lat: typeof apiLocation.lat === 'number' ? apiLocation.lat : 0,
      lng: typeof apiLocation.lng === 'number' ? apiLocation.lng : 0,
      type: apiLocation.type || 'other',
      popularityScore: typeof apiLocation.popularityScore === 'number' ? apiLocation.popularityScore : 0,
      isPickupLocation: typeof apiLocation.isPickupLocation === 'boolean' ? apiLocation.isPickupLocation : false,
      isDropLocation: typeof apiLocation.isDropLocation === 'boolean' ? apiLocation.isDropLocation : false
    };
    
    setter(libLocation);
  };
}
