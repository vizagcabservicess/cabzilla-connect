
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
    }
    
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: MapTypeId;
    }
    
    interface LatLng {
      lat(): number;
      lng(): number;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    enum MapTypeId {
      ROADMAP = 'roadmap',
      SATELLITE = 'satellite',
      HYBRID = 'hybrid',
      TERRAIN = 'terrain'
    }
    
    class DistanceMatrixService {
      getDistanceMatrix(
        request: DistanceMatrixRequest,
        callback: (response: DistanceMatrixResponse, status: DistanceMatrixStatus) => void
      ): void;
    }
    
    interface DistanceMatrixRequest {
      origins: (LatLng | LatLngLiteral | string)[];
      destinations: (LatLng | LatLngLiteral | string)[];
      travelMode: TravelMode;
      unitSystem: UnitSystem;
      avoidHighways?: boolean;
      avoidTolls?: boolean;
    }
    
    interface DistanceMatrixResponse {
      rows: DistanceMatrixResponseRow[];
    }
    
    interface DistanceMatrixResponseRow {
      elements: DistanceMatrixResponseElement[];
    }
    
    interface DistanceMatrixResponseElement {
      status: string;
      distance: Distance;
      duration: Duration;
    }
    
    interface Distance {
      text: string;
      value: number;
    }
    
    interface Duration {
      text: string;
      value: number;
    }
    
    enum DistanceMatrixStatus {
      OK = 'OK',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
    
    enum TravelMode {
      DRIVING = 'DRIVING',
      WALKING = 'WALKING',
      BICYCLING = 'BICYCLING',
      TRANSIT = 'TRANSIT'
    }
    
    enum UnitSystem {
      METRIC = 0,
      IMPERIAL = 1
    }
    
    class DirectionsService {
      route(
        request: DirectionsRequest,
        callback: (result: DirectionsResult, status: DirectionsStatus) => void
      ): void;
    }
    
    interface DirectionsRequest {
      origin: LatLng | LatLngLiteral | string;
      destination: LatLng | LatLngLiteral | string;
      travelMode: TravelMode;
    }
    
    interface DirectionsResult {
      routes: DirectionsRoute[];
    }
    
    interface DirectionsRoute {
      legs: DirectionsLeg[];
    }
    
    interface DirectionsLeg {
      distance?: Distance;
      duration?: Duration;
    }
    
    enum DirectionsStatus {
      OK = 'OK',
      NOT_FOUND = 'NOT_FOUND',
      ZERO_RESULTS = 'ZERO_RESULTS',
      MAX_WAYPOINTS_EXCEEDED = 'MAX_WAYPOINTS_EXCEEDED',
      INVALID_REQUEST = 'INVALID_REQUEST',
      OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
      REQUEST_DENIED = 'REQUEST_DENIED',
      UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    }
  }
}

export {};
