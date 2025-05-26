
import { Location as ApiLocation } from '@/types/api';
import { Location as ComponentLocation } from '@/components/LocationInput';

export const convertToApiLocation = (location: ComponentLocation): ApiLocation => {
  return {
    id: location.id,
    name: location.name,
    type: 'city',
    latitude: location.latitude,
    longitude: location.longitude,
    address: location.address
  };
};
