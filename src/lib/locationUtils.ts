
import { Location as ApiLocation } from '@/types/api';
import { Location as AppLocation } from '@/lib/locationData';
import { safeIncludes, safeLowerCase, safeGetString } from '@/lib/safeStringUtils';

// Re-export the safe string utility functions from safeStringUtils
export { safeIncludes, safeLowerCase, safeGetString };

/**
 * Converts a location from the application format to the API format
 */
export const convertToApiLocation = (location: AppLocation | null): ApiLocation | undefined => {
  if (!location) return undefined;
  
  return {
    id: location.id || '',
    name: location.name || '',
    address: location.address || location.name || '',
    lat: typeof location.lat === 'number' ? location.lat : 0,
    lng: typeof location.lng === 'number' ? location.lng : 0,
    isInVizag: typeof location.isInVizag === 'boolean' ? location.isInVizag : false
  };
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
    const id = newLocation.id !== undefined ? String(newLocation.id) : `loc_${Date.now()}`;
    
    // Safely extract address information
    const locationAddress = newLocation.address || newLocation.name || '';
    
    // Convert API location format to app location format with safe defaults
    const appLocation: AppLocation = {
      id,
      name: newLocation.name || newLocation.address || '',
      address: locationAddress,
      city: extractCityFromAddress(locationAddress),
      state: extractStateFromAddress(locationAddress),
      lat: typeof newLocation.lat === 'number' ? newLocation.lat : 0,
      lng: typeof newLocation.lng === 'number' ? newLocation.lng : 0,
      type: 'other',
      popularityScore: 50,
      isInVizag: typeof newLocation.isInVizag === 'boolean' ? 
        newLocation.isInVizag : determineIfLocationIsInVizag(newLocation)
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
 * Safely determine if a location is in Visakhapatnam based on its properties
 * Uses safeIncludes to prevent errors with null/undefined values
 */
function determineIfLocationIsInVizag(location: ApiLocation | null | undefined): boolean {
  if (!location) return false;
  
  // Check if location has valid coordinates
  if (typeof location.lat === 'number' && 
      typeof location.lng === 'number' && 
      !isNaN(location.lat) && 
      !isNaN(location.lng)) {
    
    // Check if coordinates are within Vizag bounds
    if (location.lat >= 17.6 && location.lat <= 17.9 && 
        location.lng >= 83.1 && location.lng <= 83.4) {
      return true;
    }
  }
  
  // Check location name and address for Vizag keywords
  const vizagKeywords = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
  
  for (const keyword of vizagKeywords) {
    if (safeIncludes(location.address, keyword) || 
        safeIncludes(location.name, keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a location is in Visakhapatnam based on coordinates and address
 * Safe handling of potentially undefined values
 */
export const isLocationInVizag = (location: AppLocation | ApiLocation | null | undefined): boolean => {
  if (!location) return false;
  
  // Check if isInVizag is already set
  if (typeof location.isInVizag === 'boolean') {
    return location.isInVizag;
  }
  
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
  
  // Using safeIncludes for all string checks to avoid toLowerCase on undefined
  const vizagNames = ['visakhapatnam', 'vizag', 'waltair', 'vizianagaram'];
  
  // Check if any Vizag name appears in the location's address, name, or city
  return vizagNames.some(vizagName => 
    safeIncludes(location.address, vizagName) ||
    safeIncludes(location.name, vizagName) ||
    safeIncludes((location as AppLocation).city, vizagName)
  );
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
