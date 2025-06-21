
export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
  isInVizag: boolean;
  placeId?: string;
}

export interface LocationData {
  locations: Location[];
}
