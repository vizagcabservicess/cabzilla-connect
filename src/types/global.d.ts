
declare global {
  interface Window {
    google: {
      maps: {
        DistanceMatrixService: new () => google.maps.DistanceMatrixService;
        DirectionsService: new () => google.maps.DirectionsService;
        places: {
          Autocomplete: new (input: HTMLInputElement, options?: google.maps.places.AutocompleteOptions) => google.maps.places.Autocomplete;
        };
        LatLng: new (lat: number, lng: number) => google.maps.LatLng;
        Circle: new (options?: google.maps.CircleOptions) => google.maps.Circle;
        TravelMode: {
          DRIVING: google.maps.TravelMode;
        };
        UnitSystem: {
          METRIC: google.maps.UnitSystem;
        };
      };
    };
  }
}

export {};
