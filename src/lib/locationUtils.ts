
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
