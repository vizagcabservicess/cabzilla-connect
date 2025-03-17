
import { Location as ApiLocation } from '@/types/api';
import { Location as LocationDataType } from '@/lib/locationData';

/**
 * Converts a frontend location object to the API location type
 */
export function convertToApiLocation(location: LocationDataType | ApiLocation | null): ApiLocation | undefined {
  if (!location) return undefined;
  
  // Ensure we have an address property even if it's coming from locationData.ts
  const address = 'address' in location ? location.address : (location.name || '');
  
  return {
    id: location.id,
    address: typeof address === 'string' ? address : '',
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
 * This function creates a handler that can accept either Location type
 * and converts it to the proper format for state management
 */
export function createLocationChangeHandler(
  setLocationState: React.Dispatch<React.SetStateAction<LocationDataType | null>> | 
                    React.Dispatch<React.SetStateAction<ApiLocation | null>>
) {
  return (location: ApiLocation) => {
    console.log('Location change handler called with:', location);
    
    // Ensure we always have a valid address
    if (!location.address && location.name) {
      location.address = location.name;
    } else if (!location.address) {
      location.address = '';
    }
    
    // Convert to the format expected by LocationDataType if needed
    const normalizedLocation: LocationDataType = {
      id: location.id || '',
      name: location.name || '',
      city: location.city || '',
      state: location.state || '',
      lat: location.lat || 0,
      lng: location.lng || 0,
      type: location.type || 'other',
      popularityScore: location.popularityScore || 0,
      isPickupLocation: location.isPickupLocation,
      isDropLocation: location.isDropLocation,
      // Add the address property from the API location
      address: location.address
    };
    
    // Set the state with the updated location
    // We use any here to handle the type mismatch - TypeScript doesn't recognize
    // that both dispatch functions can handle this normalized location
    (setLocationState as any)(normalizedLocation);
  };
}
