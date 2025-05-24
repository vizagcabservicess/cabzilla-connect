
export interface PoolingLocation {
  id: string;
  name: string;
  city: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  type: 'major' | 'minor';
}

export const POOLING_LOCATIONS: PoolingLocation[] = [
  // Major cities in Andhra Pradesh and Telangana
  {
    id: 'vizag',
    name: 'Visakhapatnam',
    city: 'Visakhapatnam',
    coordinates: { lat: 17.6868, lng: 83.2185 },
    type: 'major'
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    city: 'Hyderabad', 
    coordinates: { lat: 17.3850, lng: 78.4867 },
    type: 'major'
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    city: 'Vijayawada',
    coordinates: { lat: 16.5062, lng: 80.6480 },
    type: 'major'
  },
  {
    id: 'guntur',
    name: 'Guntur',
    city: 'Guntur',
    coordinates: { lat: 16.3067, lng: 80.4365 },
    type: 'major'
  },
  {
    id: 'warangal',
    name: 'Warangal',
    city: 'Warangal',
    coordinates: { lat: 17.9689, lng: 79.5941 },
    type: 'major'
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    city: 'Tirupati',
    coordinates: { lat: 13.6288, lng: 79.4192 },
    type: 'major'
  },
  {
    id: 'rajahmundry',
    name: 'Rajahmundry',
    city: 'Rajahmundry',
    coordinates: { lat: 17.0005, lng: 81.8040 },
    type: 'minor'
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    city: 'Kakinada',
    coordinates: { lat: 16.9891, lng: 82.2475 },
    type: 'minor'
  },
  {
    id: 'nizamabad',
    name: 'Nizamabad',
    city: 'Nizamabad',
    coordinates: { lat: 18.6725, lng: 78.0941 },
    type: 'minor'
  },
  {
    id: 'karimnagar',
    name: 'Karimnagar',
    city: 'Karimnagar',
    coordinates: { lat: 18.4386, lng: 79.1288 },
    type: 'minor'
  }
];

export const getLocationById = (id: string): PoolingLocation | undefined => {
  return POOLING_LOCATIONS.find(loc => loc.id === id);
};

export const getLocationsByType = (type: 'major' | 'minor'): PoolingLocation[] => {
  return POOLING_LOCATIONS.filter(loc => loc.type === type);
};
