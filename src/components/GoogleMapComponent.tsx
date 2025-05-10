
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
  const maxRetries = useRef(3);
  const directionsServiceRef = useRef<any>(null);
  const distanceCalculatedRef = useRef<boolean>(false);
  const [mapKey, setMapKey] = useState(Date.now()); // Used to force re-render

  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

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

  // Check if locations are too far apart (more than 2000km)
  const areLocationsTooFarApart = () => {
    const distance = calculateHaversineDistance(
      safePickupLocation.lat, safePickupLocation.lng,
      safeDropLocation.lat, safeDropLocation.lng
    );
    return distance > 2000; // More than 2000km apart
  };

  // Check if both locations are in India (approximate bounds)
  const areLocationsInIndia = () => {
    const inIndiaBounds = (lat: number, lng: number) => {
      return lat >= 8.0 && lat <= 37.0 && lng >= 68.0 && lng <= 97.0;
    };
    
    return inIndiaBounds(safePickupLocation.lat, safePickupLocation.lng) && 
           inIndiaBounds(safeDropLocation.lat, safeDropLocation.lng);
  };

  // Handle directions callback - single definition to avoid duplicates
  const handleDirectionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    console.log("Directions status:", status);
    
    // If we've already reported distance once, don't do it again
    if (distanceCalculatedRef.current) {
      if (result) setDirections(result);
      return;
    }
    
    if (status === google.maps.DirectionsStatus.OK && result) {
      // Cache the result
      directionsCache.set(cacheKey, result);
      
      setRouteNotFound(false);
      setDirections(result);
      setDirectionsRequestFailed(false);
      
      // Extract and log the actual distance from the directions result
      const route = result.routes[0];
      if (route && route.legs && route.legs.length > 0) {
        const leg = route.legs[0];
        const distanceValue = leg.distance?.value || 0;
        const durationValue = leg.duration?.value || 0;
        
        console.log("Actual distance from Google:", leg.distance?.text);
        console.log("Actual duration from Google:", leg.duration?.text);
        
        // Convert meters to kilometers and round to nearest integer
        const distanceInKm = Math.round(distanceValue / 1000);
        // Convert seconds to minutes
        const durationInMinutes = Math.round(durationValue / 60);
        
        // Mark that we've calculated and reported the distance
        distanceCalculatedRef.current = true;
        
        // Call the callback with the actual distance and duration
        if (onDistanceCalculated) {
          onDistanceCalculated(distanceInKm, durationInMinutes);
        }
      }
    } else {
      console.error("Directions request failed with status:", status);
      setDirectionsRequestFailed(true);
      
      if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        setRouteNotFound(true);
        
        // If both locations have valid coordinates, use Haversine formula as fallback
        if (typeof safePickupLocation.lat === 'number' && 
            typeof safePickupLocation.lng === 'number' &&
            typeof safeDropLocation.lat === 'number' && 
            typeof safeDropLocation.lng === 'number') {
          
          // Calculate approximate distance using the Haversine formula
          const distance = calculateHaversineDistance(
            safePickupLocation.lat, safePickupLocation.lng,
            safeDropLocation.lat, safeDropLocation.lng
          );
          
          const duration = Math.round(distance * 2); // Approximate duration in minutes
          
          console.log("Using Haversine distance fallback:", distance, "km");
          
          // Mark that we've calculated and reported the distance
          distanceCalculatedRef.current = true;
          
          if (onDistanceCalculated) {
            onDistanceCalculated(distance, duration);
          }
        }
      }
    }
  }, [onDistanceCalculated, safePickupLocation, safeDropLocation, google, cacheKey]);

  // Calculate distance between two points using Haversine formula
  function calculateHaversineDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return Math.round(distance);
  }
  
  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  useEffect(() => {
    try {
      // Reset directions when locations change
      if (safePickupLocation && safeDropLocation) {
        setDirections(null);
        setDirectionsRequested(false);
        setDirectionsRequestFailed(false);
        setRouteNotFound(false);
        directionsRequestCount.current = 0;
        distanceCalculatedRef.current = false;
      }
    } catch (error) {
      console.error("Error in location change effect:", error);
      setMapError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [safePickupLocation, safeDropLocation]);

  // Handle map load - single definition to avoid duplicates
  const handleMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }, []);

  // Handle directions request - now with caching
  useEffect(() => {
    try {
      if (mapLoaded && !directionsRequested && google) {
        // Check if both locations are in India
        if (!areLocationsInIndia()) {
          console.error("One or both locations are outside India");
          setRouteNotFound(true);
          setDirectionsRequestFailed(true);
          
          if (!distanceCalculatedRef.current && onDistanceCalculated) {
            // Use Haversine as fallback
            const distance = calculateHaversineDistance(
              safePickupLocation.lat, safePickupLocation.lng,
              safeDropLocation.lat, safeDropLocation.lng
            );
            const duration = Math.round(distance * 2);
            onDistanceCalculated(distance, duration);
            distanceCalculatedRef.current = true;
          }
          return;
        }
        
        // Check if locations are too far apart
        if (areLocationsTooFarApart()) {
          console.error("Locations are too far apart (>2000km)");
          setRouteNotFound(true);
          setDirectionsRequestFailed(true);
          
          if (!distanceCalculatedRef.current && onDistanceCalculated) {
            // Use Haversine as fallback
            const distance = calculateHaversineDistance(
              safePickupLocation.lat, safePickupLocation.lng,
              safeDropLocation.lat, safeDropLocation.lng
            );
            const duration = Math.round(distance * 2);
            onDistanceCalculated(distance, duration);
            distanceCalculatedRef.current = true;
          }
          return;
        }
        
        setDirectionsRequested(true);
        directionsRequestCount.current += 1;

        // Try to get from cache first
        const cachedResult = directionsCache.get(cacheKey);
        if (cachedResult) {
          console.log("Using cached directions for:", cacheKey);
          setDirections(cachedResult);
          
          // Extract distance from cached result
          if (!distanceCalculatedRef.current && onDistanceCalculated) {
            const route = cachedResult.routes[0];
            if (route && route.legs && route.legs.length > 0) {
              const leg = route.legs[0];
              const distanceValue = leg.distance?.value || 0;
              const durationValue = leg.duration?.value || 0;
              const distanceInKm = Math.round(distanceValue / 1000);
              const durationInMinutes = Math.round(durationValue / 60);
              
              onDistanceCalculated(distanceInKm, durationInMinutes);
              distanceCalculatedRef.current = true;
            }
          }
          return;
        }
        
        // Create service if not already created
        if (!directionsServiceRef.current && google.maps) {
          directionsServiceRef.current = new google.maps.DirectionsService();
        }
        
        if (directionsServiceRef.current) {
          console.log("Requesting directions for:", cacheKey);
          directionsServiceRef.current.route({
            origin: { 
              lat: safePickupLocation.lat, 
              lng: safePickupLocation.lng 
            },
            destination: { 
              lat: safeDropLocation.lat, 
              lng: safeDropLocation.lng 
            },
            travelMode: google.maps.TravelMode.DRIVING,
            region: 'IN'
          }, handleDirectionsCallback);
        } else {
          console.error("Directions service is not available");
          setDirectionsRequestFailed(true);
          
          // Fallback to Haversine calculation
          if (!distanceCalculatedRef.current && onDistanceCalculated) {
            const distance = calculateHaversineDistance(
              safePickupLocation.lat, safePickupLocation.lng,
              safeDropLocation.lat, safeDropLocation.lng
            );
            const duration = Math.round(distance * 2);
            onDistanceCalculated(distance, duration);
            distanceCalculatedRef.current = true;
          }
        }
      }
    } catch (error) {
      console.error("Error requesting directions:", error);
      setMapError(error instanceof Error ? error : new Error(String(error)));
      setDirectionsRequestFailed(true);
      
      // Fallback to Haversine calculation
      if (!distanceCalculatedRef.current && onDistanceCalculated) {
        const distance = calculateHaversineDistance(
          safePickupLocation.lat, safePickupLocation.lng,
          safeDropLocation.lat, safeDropLocation.lng
        );
        const duration = Math.round(distance * 2);
        onDistanceCalculated(distance, duration);
        distanceCalculatedRef.current = true;
      }
    }
  }, [
    mapLoaded, directionsRequested, google, 
    safePickupLocation, safeDropLocation, 
    handleDirectionsCallback, onDistanceCalculated, cacheKey
  ]);

  // Force map refresh if Google becomes available after initial render
  useEffect(() => {
    if (google && !mapLoaded) {
      setMapKey(Date.now());
    }
  }, [google, mapLoaded]);

  if (!isLoaded || !google) {
    return (
      <div className="bg-white rounded-md shadow p-4 text-center h-[400px] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <h3 className="text-lg font-medium mb-2">Loading Google Maps...</h3>
        <p className="text-gray-500 mb-4">Please wait while we load the map service</p>
        <button 
          onClick={retryLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry Loading Maps
        </button>
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

  return (
    <div className="relative">
      {routeNotFound && (
        <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex flex-col items-center justify-center p-4 text-center">
          <h3 className="text-lg font-bold text-amber-600 mb-2">Route Not Found</h3>
          <p className="text-gray-700 mb-4">
            We couldn't find a driving route between these locations.
            {areLocationsTooFarApart() && " The locations may be too far apart."}
          </p>
          <p className="text-sm text-gray-500">
            Using approximate distance: {calculateHaversineDistance(
              safePickupLocation.lat, safePickupLocation.lng,
              safeDropLocation.lat, safeDropLocation.lng
            )} km
          </p>
        </div>
      )}
      
      <GoogleMap
        key={mapKey}
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          scrollwheel: true,
          fullscreenControl: false,
          streetViewControl: false,
        }}
        onLoad={handleMapLoad}
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
