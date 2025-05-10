
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { Location } from "@/lib/locationData";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { ApiErrorFallback } from "./ApiErrorFallback";

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  onDistanceCalculated?: (distance: number, duration: number) => void;
}

interface SafeLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Vizag default coordinates as fallback
const DEFAULT_LAT = 17.6868;
const DEFAULT_LNG = 83.2185;

// Cache for directions results
const directionsCache = new Map<string, google.maps.DirectionsResult>();

// Generate a cache key for two locations
const generateCacheKey = (origin: SafeLocation, destination: SafeLocation): string => {
  return `${origin.lat},${origin.lng}_${destination.lat},${destination.lng}`;
};

const GoogleMapComponent = ({ 
  pickupLocation, 
  dropLocation,
  onDistanceCalculated 
}: GoogleMapComponentProps) => {
  const { isLoaded, google, retryLoading } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [directionsRequested, setDirectionsRequested] = useState(false);
  const [directionsRequestFailed, setDirectionsRequestFailed] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const [routeNotFound, setRouteNotFound] = useState(false);
  const directionsRequestCount = useRef(0);
  const distanceCalculatedRef = useRef<boolean>(false);
  const [mapKey, setMapKey] = useState(Date.now()); // Used to force re-render
  
  // Debug log - Check loadness of Google Maps
  useEffect(() => {
    console.log(`GoogleMapComponent: Google Maps loaded state: ${isLoaded}`);
  }, [isLoaded]);
  
  // Create safe location objects with validated values
  const createSafeLocation = (location: any): SafeLocation => {
    if (!location) {
      console.warn("Invalid location provided to GoogleMapComponent");
      return {
        id: `default_${Date.now()}`,
        name: 'Default Location',
        address: 'Visakhapatnam, Andhra Pradesh',
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG
      };
    }
    
    // Ensure all required properties exist with proper types
    return {
      id: typeof location.id === 'string' ? location.id : `loc_${Date.now()}`,
      name: typeof location.name === 'string' ? location.name : 'Unknown Location',
      address: typeof location.address === 'string' ? location.address : 
               (typeof location.name === 'string' ? location.name : 'Unknown Location'),
      lat: typeof location.lat === 'number' && !isNaN(location.lat) ? location.lat : DEFAULT_LAT,
      lng: typeof location.lng === 'number' && !isNaN(location.lng) ? location.lng : DEFAULT_LNG
    };
  };
  
  const safePickupLocation = createSafeLocation(pickupLocation);
  const safeDropLocation = createSafeLocation(dropLocation);
  const cacheKey = generateCacheKey(safePickupLocation, safeDropLocation);

  // Set the center to the pickup location
  const center = { 
    lat: safePickupLocation.lat,
    lng: safePickupLocation.lng
  };
  
  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  // Handle map load
  const handleMapLoad = useCallback(() => {
    console.log("GoogleMapComponent: Map loaded successfully");
    setMapLoaded(true);
  }, []);

  // Force map refresh if Google becomes available after initial render
  useEffect(() => {
    if (google && !mapLoaded) {
      console.log("GoogleMapComponent: Google object became available, forcing map refresh");
      setMapKey(Date.now());
    }
  }, [google, mapLoaded]);

  if (!isLoaded || !google) {
    return (
      <div className="bg-white rounded-md shadow p-4 text-center h-[400px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <h3 className="text-lg font-medium mb-2">Loading Google Maps...</h3>
        <p className="text-gray-500 mb-4">Please wait while we connect to the map service</p>
        <button 
          onClick={retryLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry Loading Maps
        </button>
        <p className="text-xs text-gray-400 mt-4">
          API Status: {google ? 'Loaded' : 'Not Loaded'} | Script: {document.querySelector('script[src*="maps.googleapis.com"]') ? 'Found' : 'Not Found'}
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="bg-white rounded-md shadow p-4">
        <h3 className="text-lg font-bold text-red-600 mb-2">Error Loading Map</h3>
        <p className="text-gray-700 mb-4">{mapError.message}</p>
        <button 
          onClick={() => {
            setMapError(null);
            setMapKey(Date.now());
            retryLoading();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Just return the map without all the other logic for now to debug rendering
  return (
    <div className="relative">
      <GoogleMap
        key={mapKey}
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          scrollwheel: true,
          fullscreenControl: false,
          streetViewControl: false,
        }}
      >
        <Marker position={center} title={safePickupLocation.name} />
        <Marker 
          position={{ 
            lat: safeDropLocation.lat, 
            lng: safeDropLocation.lng
          }} 
          title={safeDropLocation.name}
        />
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;
