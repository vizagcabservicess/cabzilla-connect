
import { Location } from '@/types/api';

export function createMockLocation(name: string, address: string): Location {
  return {
    id: `location-${Date.now()}-${Math.random()}`,
    name,
    address,
    lat: 17.6868 + (Math.random() - 0.5) * 0.1,
    lng: 83.2185 + (Math.random() - 0.5) * 0.1,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    isInVizag: true,
    type: 'other'
  };
}

export function isValidLocation(location: any): location is Location {
  return location && 
         typeof location.id === 'string' &&
         typeof location.name === 'string' &&
         typeof location.address === 'string' &&
         typeof location.lat === 'number' &&
         typeof location.lng === 'number' &&
         typeof location.city === 'string' &&
         typeof location.state === 'string';
}

export function getLocationFromString(locationString: string): Location {
  return {
    id: `location-${Date.now()}-${Math.random()}`,
    name: locationString,
    address: locationString,
    lat: 17.6868,
    lng: 83.2185,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    isInVizag: true,
    type: 'other'
  };
}

export function convertToApiLocation(location: Location): any {
  return {
    place_id: location.id,
    description: location.name,
    structured_formatting: {
      main_text: location.name,
      secondary_text: location.address
    }
  };
}

export function createLocationChangeHandler(setLocation: (location: Location) => void) {
  return (location: Location) => {
    setLocation(location);
  };
}

export function isLocationInVizag(location: Location): boolean {
  if (location.isInVizag !== undefined) {
    return location.isInVizag;
  }
  
  // Check if location is within Visakhapatnam bounds
  const vizagBounds = {
    north: 17.8,
    south: 17.6,
    east: 83.4,
    west: 83.1
  };
  
  return location.lat >= vizagBounds.south && 
         location.lat <= vizagBounds.north &&
         location.lng >= vizagBounds.west && 
         location.lng <= vizagBounds.east;
}

export function safeIncludes(str: string, searchStr: string): boolean {
  return str?.toLowerCase().includes(searchStr?.toLowerCase()) || false;
}
