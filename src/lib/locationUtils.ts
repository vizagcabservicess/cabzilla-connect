
import { Location } from '@/types/api';

/**
 * Converts a frontend location object to the API location type
 */
export function convertToApiLocation(location: Location | null): Location | undefined {
  if (!location) return undefined;
  
  return {
    id: location.id,
    address: typeof location.address === 'string' ? location.address : '',
    name: location.name || '',
    lat: location.lat,
    lng: location.lng,
    city: location.city,
    state: location.state,
    type: location.type,
    popularityScore: location.popularityScore,
    isPickupLocation: location.isPickupLocation,
    isDropLocation: location.isDropLocation
  };
}

/**
 * Creates a location change handler function for React components
 */
export function createLocationChangeHandler(
  setLocationState: React.Dispatch<React.SetStateAction<Location | null>>
) {
  return (location: Location) => {
    console.log('Location change handler called with:', location);
    
    // Ensure we always have a valid address
    if (!location.address && location.name) {
      location.address = location.name;
    } else if (!location.address) {
      location.address = '';
    }
    
    // Set the state with the updated location
    setLocationState(location);
  };
}
