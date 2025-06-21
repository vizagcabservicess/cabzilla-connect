export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  state: string;
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore: number;
  isInVizag?: boolean;
  placeId?: string;
  isPickupLocation?: boolean;
  isDropLocation?: boolean;
}

export interface LocationData {
  locations: Location[];
}
