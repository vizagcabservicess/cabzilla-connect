
export interface Location {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  city: string;
  address: string;
}

export const LOCATIONS: Location[] = [
  {
    id: '1',
    name: 'Mumbai',
    type: 'city',
    latitude: 19.0760,
    longitude: 72.8777,
    city: 'Mumbai',
    address: 'Mumbai, Maharashtra, India'
  },
  {
    id: '2',
    name: 'Delhi',
    type: 'city',
    latitude: 28.7041,
    longitude: 77.1025,
    city: 'Delhi',
    address: 'Delhi, India'
  }
];
