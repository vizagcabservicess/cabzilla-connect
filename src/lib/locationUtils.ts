
import { Location as ApiLocation } from '@/types/api';
import { Location as ComponentLocation } from '@/components/LocationInput';

export const convertToApiLocation = (location: ComponentLocation): ApiLocation => {
  return {
    id: location.id,
    name: location.name,
    type: location.type || 'city',
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address
  };
};

export const convertToComponentLocation = (location: ApiLocation): ComponentLocation => {
  return {
    id: location.id,
    name: location.name,
    address: location.address || location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    city: location.city || location.name,
    type: location.type || 'city'
  };
};
