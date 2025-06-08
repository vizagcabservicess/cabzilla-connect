import { useState, useCallback, useEffect, useRef } from "react";
import type { Location } from '@/lib/locationData';
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { toast } from "sonner";

// Import essential components directly from react-google-maps/api
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker, 
  DirectionsRenderer
} from "@react-google-maps/api";

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  tripType: string;
  onDistanceCalculated?: (distance: number, duration: number) => void;
}

// Vizag default coordinates as fallback
const DEFAULT_LAT = 17.6868;
const DEFAULT_LNG = 83.2185;

// Cache for directions results
const directionsCache = new Map<string, google.maps.DirectionsResult>();

// Generate a cache key for two locations
const generateCacheKey = (origin: any, destination: any): string => {
  return `${origin.lat},${origin.lng}_${destination.lat},${destination.lng}`;
};

const GoogleMapComponent = ({ 
  pickupLocation, 
  dropLocation,
  tripType,
  onDistanceCalculated 
}: GoogleMapComponentProps) => {
  const { isLoaded, google } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapKey] = useState(() => Date.now()); // Stable key for map instance
  const distanceCalculated = useRef<boolean>(false);
  
  // Map container style
  const mapContainerStyle = {
    width: "100%",
    height: "400px",
    position: "relative" as const
  };
  
  // Safely extract coordinates and create valid LatLngLiteral objects
  const getValidCoordinates = (location: any) => {
    if (!location) return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
    
    const lat = typeof location.lat === 'number' && !isNaN(location.lat) 
      ? location.lat 
      : DEFAULT_LAT;
      
    const lng = typeof location.lng === 'number' && !isNaN(location.lng)
      ? location.lng
      : DEFAULT_LNG;
      
    return { lat, lng };
  };
  
  const pickupCoords = getValidCoordinates(pickupLocation);
  const dropCoords = getValidCoordinates(dropLocation);
  
  // Set the center to the pickup location
  const center = pickupCoords;
  
  // Handle map load - store the map instance and set up directions service
  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    console.log("GoogleMapComponent: Map loaded successfully");
    setMap(mapInstance);
    
    if (google && google.maps) {
      const directionsServiceInstance = new google.maps.DirectionsService();
      setDirectionsService(directionsServiceInstance);
    }
  }, [google]);
  
  // Calculate and display directions when both locations and services are available
  useEffect(() => {
    if (!map || !directionsService || !google || distanceCalculated.current) return;
    
    const fetchDirections = async () => {
      const cacheKey = generateCacheKey(pickupCoords, dropCoords);
      
      // Check cache first
      if (directionsCache.has(cacheKey)) {
        console.log("Using cached directions");
        setDirections(directionsCache.get(cacheKey)!);
        return;
      }
      
      try {
        console.log("Calculating directions between:", pickupCoords, dropCoords);
        
        const results = await directionsService.route({
          origin: pickupCoords,
          destination: dropCoords,
          travelMode: google.maps.TravelMode.DRIVING
        });
        
        // Cache the results
        directionsCache.set(cacheKey, results);
        setDirections(results);
        
      } catch (err) {
        console.error("Error calculating directions:", err);
        setError("Failed to calculate route");
        toast.error("Could not calculate route between locations");
      }
    };
    
    fetchDirections();
  }, [map, directionsService, pickupCoords, dropCoords, google, tripType]);
  
  // Reset the calculated flag when locations or tripType change
  useEffect(() => {
    distanceCalculated.current = false;
  }, [pickupLocation, dropLocation, tripType]);
  
  // Add this after the main useEffect for fetching directions
  useEffect(() => {
    if (directions && onDistanceCalculated) {
      const leg = directions.routes[0]?.legs[0];
      if (leg) {
        const distanceValue = leg.distance?.value ? Math.round(leg.distance.value / 1000) : 0;
        const durationValue = leg.duration?.value ? Math.round(leg.duration.value / 60) : 0;
        onDistanceCalculated(distanceValue, durationValue);
        distanceCalculated.current = true;
      }
    }
  }, [directions, onDistanceCalculated]);
  
  if (!isLoaded || !google) {
    return (
      <div className="bg-white rounded-md shadow p-4 text-left h-[400px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <h3 className="text-lg font-medium mb-2">Loading Google Maps...</h3>
        <p className="text-gray-500">Please wait while we connect to the map service</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-md shadow p-4 text-left h-[400px] flex flex-col items-center justify-center">
        <div className="bg-red-100 p-3 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Map Error</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button 
          onClick={() => setError(null)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
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
        {/* Pickup marker */}
        <Marker 
          position={pickupCoords} 
          label={{
            text: "P",
            color: "white",
            fontWeight: "bold"
          }}
          title={pickupLocation?.name || "Pickup Location"}
        />
        
        {/* Dropoff marker */}
        <Marker 
          position={dropCoords}
          label={{
            text: "D",
            color: "white",
            fontWeight: "bold"
          }}
          title={dropLocation?.name || "Drop Location"}
        />
        
        {/* Render directions if available */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // Hide default markers as we're using custom ones
              polylineOptions: {
                strokeColor: "#3B82F6", // blue-500
                strokeWeight: 5,
                strokeOpacity: 0.8
              }
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;
