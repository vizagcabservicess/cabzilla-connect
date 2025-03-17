
import { Location as ApiLocation } from '@/types/api';
import { Location as LibLocation } from '@/lib/locationData';

/**
 * Converts a Location from locationData.ts format to the api.ts Location format
 * with robust type checking
 */
export function convertToApiLocation(location: LibLocation | null): ApiLocation {
  // If location is null or undefined, return a minimal valid location object
  if (!location) return { address: '' };
  
  // Create a base result with required address field
  const result: ApiLocation = {
    // Ensure we always have a string for address, even if name is undefined
    address: typeof location.name === 'string' ? location.name : ''
  };
  
  // Only add properties that exist and are of the correct type
  if (location.id !== undefined && typeof location.id === 'string') result.id = location.id;
  
  // Explicitly add name field separately from address
  if (location.name !== undefined && typeof location.name === 'string') result.name = location.name;
  
  if (location.city !== undefined && typeof location.city === 'string') result.city = location.city;
  if (location.state !== undefined && typeof location.state === 'string') result.state = location.state;
  
  // Careful number type checking with NaN guards
  if (location.lat !== undefined && typeof location.lat === 'number' && !isNaN(location.lat)) {
    result.lat = location.lat;
  }
  if (location.lng !== undefined && typeof location.lng === 'number' && !isNaN(location.lng)) {
    result.lng = location.lng;
  }
  
  if (location.type !== undefined && typeof location.type === 'string') result.type = location.type;
  
  if (location.popularityScore !== undefined && 
      typeof location.popularityScore === 'number' && 
      !isNaN(location.popularityScore)) {
    result.popularityScore = location.popularityScore;
  }
  
  // Strict boolean checks to avoid issues with falsy values
  if (location.isPickupLocation !== undefined && typeof location.isPickupLocation === 'boolean') {
    result.isPickupLocation = location.isPickupLocation;
  }
  if (location.isDropLocation !== undefined && typeof location.isDropLocation === 'boolean') {
    result.isDropLocation = location.isDropLocation;
  }
  
  return result;
}

/**
 * Converts a setState function for a locationData.ts Location to a handler for api.ts Location
 * with improved type safety and handling of partial updates
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
    
    // Ensure address is always a string
    const address = typeof apiLocation.address === 'string' ? apiLocation.address : '';
    
    // Handle empty address field with a partial update
    if (address.trim() === '') {
      // Create a minimal location object for user typing
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
      
      // Preserve existing values when updating
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
    
    // Convert API location to Library location format with safe defaults and strict type checking
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
