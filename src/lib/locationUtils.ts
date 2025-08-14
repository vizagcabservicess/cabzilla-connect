import { Location as ApiLocation } from '@/types/api';
import { Location as AppLocation } from '@/lib/locationData';
import { safeIncludes, safeLowerCase, safeGetString } from '@/lib/safeStringUtils';

// Re-export the safe string utility functions from safeStringUtils
export { safeIncludes, safeLowerCase, safeGetString };

// Visakhapatnam city center coordinates
const VIZAG_CENTER = {
  lat: 17.6868,
  lng: 83.2185
};

// Maximum distance for a location to be considered in Vizag (in km)
const VIZAG_RADIUS_KM = 35;

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
    
    // Calculate if the location is in Vizag based on the 35km radius
    const isInVizag = determineIfLocationIsInVizag(newLocation);
    
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
      isInVizag
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
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  
  return distance;
}

/**
 * Determine if a location is within the specified radius of Visakhapatnam
 */
function determineIfLocationIsInVizag(location: ApiLocation | null | undefined): boolean {
  if (!location) return false;
  
  // Check if location has valid coordinates
  if (typeof location.lat === 'number' && 
      typeof location.lng === 'number' && 
      !isNaN(location.lat) && 
      !isNaN(location.lng)) {
    
    // Calculate distance from Vizag center
    const distance = calculateDistance(
      location.lat, 
      location.lng, 
      VIZAG_CENTER.lat, 
      VIZAG_CENTER.lng
    );
    
    // Check if within 35km radius
    if (distance <= VIZAG_RADIUS_KM) {
      return true;
    }
  }
  
  // Check location name and address for Vizag keywords as fallback
  const vizagKeywords = ['visakhapatnam', 'vizag', 'waltair'];
  
  for (const keyword of vizagKeywords) {
    if (safeIncludes(location.address, keyword) || 
        safeIncludes(location.name, keyword)) {
      return true;
    }
  }
  
  return false;
}

// Add more Vizag suburbs/areas to the recognized list
const vizagNames = [
  'visakhapatnam', 'vizag', 'waltair',
  'pendurthi', 'gajuwaka', 'madhurawada', 'mvp colony', 'nad junction', 'dwaraka nagar', 'akkayyapalem', 'gopalapatnam', 'kurmannapalem', 'sheela nagar', 'bhel', 'autonagar', 'simhachalam', 'bhimili', 'bhimli', 'ananthapuram', 'yendada', 'rushikonda', 'kailasagiri', 'jagadamba', 'seethammadhara', 'dondaparthi', 'railway colony', 'old gajuwaka', 'new gajuwaka', 'murali nagar', 'kancharapalem', 'chinna waltair', 'lawsons bay', 'siripuram', 'ramnagar', 'hb colony', 'marripalem', 'peda waltair', 'sagar nagar', 'kirlampudi', 'sriharipuram', 'malkapuram', 'scindia', 'gopalapatnam', 'pothinamallayya palem', 'arilova', 'bakkannapalem', 'gambhiram', 'ananthapuram', 'gopalapatnam', 'gajuwaka', 'pendurthi', 'madhurawada', 'mvp', 'nad', 'jagadamba', 'rk beach', 'beach road', 'airport', 'railway station', 'rtc complex'
];

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
  
  // Check distance from Vizag center if coordinates are available
  const hasValidCoordinates = 
    typeof location.lat === 'number' && !isNaN(location.lat) && 
    typeof location.lng === 'number' && !isNaN(location.lng);
    
  if (hasValidCoordinates) {
    const distance = calculateDistance(
      location.lat, 
      location.lng, 
      VIZAG_CENTER.lat, 
      VIZAG_CENTER.lng
    );
    
    if (distance <= VIZAG_RADIUS_KM) {
      return true;
    }
  }
  
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

/**
 * Check if a location is within the specified radius of Visakhapatnam
 * Returns distance if it's outside the radius, null if within radius
 */
export const checkDistanceFromVizag = (location: AppLocation | ApiLocation | null | undefined): number | null => {
  if (!location) return null;
  
  // Check if location has valid coordinates
  const hasValidCoordinates = 
    typeof location.lat === 'number' && !isNaN(location.lat) && 
    typeof location.lng === 'number' && !isNaN(location.lng);
    
  if (hasValidCoordinates) {
    const distance = calculateDistance(
      location.lat, 
      location.lng, 
      VIZAG_CENTER.lat, 
      VIZAG_CENTER.lng
    );
    
    if (distance <= VIZAG_RADIUS_KM) {
      return null; // Within radius
    } else {
      return Math.round(distance); // Return distance if outside radius
    }
  }
  
  return null; // Cannot calculate distance
};
