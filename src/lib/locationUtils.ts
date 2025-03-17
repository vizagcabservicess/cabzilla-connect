import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

/**
 * Converts a Location from locationData.ts format to the api.ts Location format
 */
export function convertToApiLocation(location: LibLocation | null): ApiLocation {
  // If location is null or undefined, return a minimal valid location object
  if (!location) return { address: '' };
  
  // Create a base result with required address field
  const result: ApiLocation = {
    address: location.name || ''  // Use name as address since locationData.ts doesn't have address
  };
  
  // Only add properties that exist and are of the correct type in the location object
  if (location.id && typeof location.id === 'string') result.id = location.id;
  if (location.name && typeof location.name === 'string') result.name = location.name;
  if (location.city && typeof location.city === 'string') result.city = location.city;
  if (location.state && typeof location.state === 'string') result.state = location.state;
  if (typeof location.lat === 'number' && !isNaN(location.lat)) result.lat = location.lat;
  if (typeof location.lng === 'number' && !isNaN(location.lng)) result.lng = location.lng;
  if (location.type && typeof location.type === 'string') result.type = location.type;
  if (typeof location.popularityScore === 'number' && !isNaN(location.popularityScore)) {
    result.popularityScore = location.popularityScore;
  }
  
  // Explicit boolean check to avoid issues with falsy values
  if (typeof location.isPickupLocation === 'boolean') {
    result.isPickupLocation = location.isPickupLocation;
  }
  if (typeof location.isDropLocation === 'boolean') {
    result.isDropLocation = location.isDropLocation;
  }
  
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
    
    // Handle empty address field with a partial update instead of full reset
    // This allows for user typing without clearing the entire location
    if (
      !apiLocation.address || 
      (typeof apiLocation.address === 'string' && apiLocation.address.trim() === '')
    ) {
      // Create a minimal location object that won't cause type errors in downstream components
      const partialLocation: LibLocation = {
        id: '',
        name: '',
        city: '',
        state: '',
        lat: 0,
        lng: 0,
        type: 'other',
        popularityScore: 0
      };
      
      // If we have an existing location, preserve its ID and other properties
      setter((prevLocation) => {
        if (!prevLocation) return partialLocation;
        
        // Keep previous values except address/name which we set to empty string
        return {
          ...prevLocation,
          name: ''
        };
      });
      return;
    }
    
    // Convert API location to Library location format with safe defaults
    const libLocation: LibLocation = {
      id: typeof apiLocation.id === 'string' ? apiLocation.id : '',
      name: typeof apiLocation.name === 'string' ? apiLocation.name : 
            typeof apiLocation.address === 'string' ? apiLocation.address : '',
      city: typeof apiLocation.city === 'string' ? apiLocation.city : '',
      state: typeof apiLocation.state === 'string' ? apiLocation.state : '',
      lat: typeof apiLocation.lat === 'number' && !isNaN(apiLocation.lat) ? apiLocation.lat : 0,
      lng: typeof apiLocation.lng === 'number' && !isNaN(apiLocation.lng) ? apiLocation.lng : 0,
      type: typeof apiLocation.type === 'string' ? apiLocation.type : 'other',
      popularityScore: typeof apiLocation.popularityScore === 'number' && !isNaN(apiLocation.popularityScore) 
        ? apiLocation.popularityScore : 0,
      isPickupLocation: typeof apiLocation.isPickupLocation === 'boolean' ? apiLocation.isPickupLocation : false,
      isDropLocation: typeof apiLocation.isDropLocation === 'boolean' ? apiLocation.isDropLocation : false
    };
    
    setter(libLocation);
  };
}
