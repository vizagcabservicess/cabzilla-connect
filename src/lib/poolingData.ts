
export interface PoolingLocation {
  id: string;
  name: string;
  state: string;
  isPopular: boolean;
}

export const POOLING_LOCATIONS: PoolingLocation[] = [
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', isPopular: true },
  { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', isPopular: true },
  { id: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', isPopular: true },
  { id: 'tirupati', name: 'Tirupati', state: 'Andhra Pradesh', isPopular: true },
  { id: 'guntur', name: 'Guntur', state: 'Andhra Pradesh', isPopular: false },
  { id: 'nellore', name: 'Nellore', state: 'Andhra Pradesh', isPopular: false },
  { id: 'kurnool', name: 'Kurnool', state: 'Andhra Pradesh', isPopular: false },
  { id: 'kadapa', name: 'Kadapa', state: 'Andhra Pradesh', isPopular: false },
  { id: 'anantapur', name: 'Anantapur', state: 'Andhra Pradesh', isPopular: false },
  { id: 'chittoor', name: 'Chittoor', state: 'Andhra Pradesh', isPopular: false },
  { id: 'warangal', name: 'Warangal', state: 'Telangana', isPopular: false },
  { id: 'nizamabad', name: 'Nizamabad', state: 'Telangana', isPopular: false },
  { id: 'karimnagar', name: 'Karimnagar', state: 'Telangana', isPopular: false },
  { id: 'khammam', name: 'Khammam', state: 'Telangana', isPopular: false },
  { id: 'mahbubnagar', name: 'Mahbubnagar', state: 'Telangana', isPopular: false }
];

export const getLocationById = (id: string): PoolingLocation | undefined => {
  return POOLING_LOCATIONS.find(location => location.id === id);
};

export const getLocationsByState = (state: string): PoolingLocation[] => {
  return POOLING_LOCATIONS.filter(location => location.state === state);
};

export const getPopularLocations = (): PoolingLocation[] => {
  return POOLING_LOCATIONS.filter(location => location.isPopular);
};
