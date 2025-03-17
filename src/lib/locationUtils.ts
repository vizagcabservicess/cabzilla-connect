
import { Location as ApiLocation } from '@/types/api';
import { Location as LocationDataType } from '@/lib/locationData';

/**
 * Converts a frontend location object to the API location type
 */
export function convertToApiLocation(location: LocationDataType | ApiLocation | null): ApiLocation | undefined {
  if (!location) return undefined;
  
  // Create a new object that meets the ApiLocation interface requirements
  return {
    id: location.id,
    // Ensure we have a valid address string
    address: typeof location.address === 'string' 
      ? location.address 
      : (location.name || ''),
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
  return (location: ApiLocation | LocationDataType) => {
    console.log('Location change handler called with:', location);
    
    // Make sure we have a valid address
    const address = typeof location.address === 'string' 
      ? location.address 
      : (location.name || '');
    
    // Create a normalized location object that has all required fields
    const normalizedLocation = {
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
      // Always include the address property
      address: address
    };
    
    // Set the state with the updated location
    // Use type assertion to handle the type mismatch
    (setLocationState as any)(normalizedLocation);
  };
}
