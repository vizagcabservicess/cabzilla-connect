
import { Location as ApiLocation } from '@/types/api';
import { Location as AppLocation } from '@/lib/locationData';

/**
 * Converts a location from the application format to the API format
 */
export const convertToApiLocation = (location: AppLocation | null): ApiLocation | undefined => {
  if (!location) return undefined;
  
  return {
    id: location.id || '',
    name: location.name || '',
    address: location.address || location.name || '',
    lat: location.lat || 0,
    lng: location.lng || 0,
    isInVizag: location.isInVizag !== undefined ? location.isInVizag : false
  };
};

/**
 * Safely check if a string contains a target substring
 * Handles null, undefined, and non-string inputs
 */
export const safeIncludes = (str: any, target: string): boolean => {
  // If str is null, undefined, or not a string, return false
  if (str === null || str === undefined || typeof str !== 'string') {
    return false;
  }
  
  // Check if the lowercase version of str includes target
  return str.toLowerCase().includes(target);
};

/**
 * Creates a location change handler function for components
 */
export const createLocationChangeHandler = (
  setLocation: (location: AppLocation | null) => void,
  additionalCallback?: (location: AppLocation | null) => void
) => {
  return (newLocation: ApiLocation) => {
    if (!newLocation) {
      console.warn('Received undefined or null location');
      return null;
    }
    
    // Handle potentially incomplete location data
    const id = newLocation.id || `loc_${Date.now()}`;
    
    // Safely extract address information
    const locationAddress = newLocation.address || newLocation.name || '';
    
    // Convert API location format to app location format
    const appLocation: AppLocation = {
      id,
      name: newLocation.name || newLocation.address || '',
      address: locationAddress,
      city: extractCityFromAddress(locationAddress),
      state: extractStateFromAddress(locationAddress),
      lat: newLocation.lat || 0,
      lng: newLocation.lng || 0,
      type: 'other',
      popularityScore: 50,
      isInVizag: newLocation.isInVizag !== undefined ? newLocation.isInVizag : isLocationInVizag(newLocation)
    };
    
    console.log('Location changed:', appLocation);
    
    // Update state with the new location
    setLocation(appLocation);
    
    // Call additional callback if provided
    if (additionalCallback) {
      additionalCallback(appLocation);
    }
    
    return appLocation;
  };
};

/**
 * Check if a location is in Visakhapatnam based on coordinates and address
 * Safe handling of potentially undefined values
 */
export const isLocationInVizag = (location: AppLocation | ApiLocation | null | undefined): boolean => {
  if (!location) return false;
  
  // Check by coordinates (Visakhapatnam approximate bounds)
  const hasValidCoordinates = 
    typeof location.lat === 'number' && !isNaN(location.lat) && 
    typeof location.lng === 'number' && !isNaN(location.lng);
    
  if (hasValidCoordinates) {
    const isInVizagBounds = 
      location.lat >= 17.6 && location.lat <= 17.9 && 
      location.lng >= 83.1 && location.lng <= 83.4;
    
    if (isInVizagBounds) return true;
  }
  
  // Using safeIncludes for all string checks
  const vizagNames = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
  
  // Get location address, name, city ensuring they are strings
  const address = location.address || '';
  const name = location.name || '';
  const city = 'city' in location && location.city ? location.city : '';
  
  for (const vizagName of vizagNames) {
    if (
      safeIncludes(address, vizagName) ||
      safeIncludes(name, vizagName) ||
      safeIncludes(city, vizagName)
    ) {
      return true;
    }
  }
  
  return false;
};

/**
 * Extract city from a formatted address with safe handling of undefined
 */
function extractCityFromAddress(address: string | undefined | null): string {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    return 'Visakhapatnam';
  }
  
  // Simple extraction - get the first part that might be a city
  const parts = address.split(',').map(part => part.trim());
  
  // Try to find a likely city name
  // Usually cities are the second or third element in the comma-separated address
  if (parts.length >= 3) {
    return parts[1]; // Often city is the second element
  } else if (parts.length >= 2) {
    return parts[0]; // Fallback to first element
  }
  
  return 'Visakhapatnam'; // Default fallback
}

/**
 * Extract state from a formatted address with safe handling of undefined
 */
function extractStateFromAddress(address: string | undefined | null): string {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    return 'Andhra Pradesh';
  }
  
  // Try to find Andhra Pradesh or other state names in the address
  if (address.includes('Andhra Pradesh')) {
    return 'Andhra Pradesh';
  }
  
  // Check for other common Indian states
  const indianStates = [
    'Telangana', 'Tamil Nadu', 'Karnataka', 'Kerala', 'Maharashtra', 
    'Gujarat', 'Rajasthan', 'Punjab', 'Haryana', 'Uttar Pradesh',
    'Madhya Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Assam'
  ];
  
  for (const state of indianStates) {
    if (address.includes(state)) {
      return state;
    }
  }
  
  return 'Andhra Pradesh'; // Default fallback
}
