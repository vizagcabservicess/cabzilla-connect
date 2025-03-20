
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { Location } from "@/lib/locationData";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { ApiErrorFallback } from "./ApiErrorFallback";
import { toast } from "sonner";
import { MapPin } from "lucide-react";

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
  const { isLoaded, google, loadError } = useGoogleMaps();
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
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

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

  // Display error if Google Maps API fails to load
  useEffect(() => {
    if (loadError) {
      console.error("Google Maps API failed to load:", loadError);
      setMapError(new Error("Failed to load Google Maps. Please check your internet connection."));
      toast.error("Google Maps couldn't load. Distance calculations might be less accurate.", {
        duration: 5000,
        id: "google-maps-load-error"
      });
    }
  }, [loadError]);

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
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
    setMapInstance(map);
    
    // Add custom map styles
    try {
      // Set some basic style options for better visibility
      map.setOptions({
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        // Restrict to India view
        restriction: {
          latLngBounds: {
            north: 37.0,
            south: 8.0,
            west: 68.0,
            east: 97.0
          },
          strictBounds: false
        }
      });
    } catch (error) {
      console.error("Error setting map options:", error);
    }
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
            // Provide a fallback distance for non-Indian locations
            const distance = calculateHaversineDistance(
              safePickupLocation.lat, safePickupLocation.lng,
              safeDropLocation.lat, safeDropLocation.lng
            );
            const duration = Math.round(distance * 2);
            distanceCalculatedRef.current = true;
            onDistanceCalculated(distance, duration);
          }
          return;
        }
        
        // Check for cached result first
        if (directionsCache.has(cacheKey)) {
          console.log('🔄 Using cached directions result');
          const cachedDirections = directionsCache.get(cacheKey)!;
          setDirections(cachedDirections);
          
          // If we have a cached result, extract the distance and duration
          if (!distanceCalculatedRef.current && onDistanceCalculated) {
            const route = cachedDirections.routes[0];
            if (route && route.legs && route.legs.length > 0) {
              const leg = route.legs[0];
              const distanceValue = leg.distance?.value || 0;
              const durationValue = leg.duration?.value || 0;
              
              // Convert meters to kilometers and round to nearest integer
              const distanceInKm = Math.round(distanceValue / 1000);
              // Convert seconds to minutes
              const durationInMinutes = Math.round(durationValue / 60);
              
              distanceCalculatedRef.current = true;
              onDistanceCalculated(distanceInKm, durationInMinutes);
            }
          }
          return;
        }
        
        // Check if locations are too far apart
        if (areLocationsTooFarApart()) {
          console.warn("Locations are very far apart (>2000km), route might not be found");
        }
        
        setDirectionsRequested(true);
        directionsRequestCount.current += 1;
        console.log(`Making directions request #${directionsRequestCount.current}`);
      }
    } catch (error) {
      console.error("Error in directions request effect:", error);
      setMapError(error instanceof Error ? error : new Error(String(error)));
      
      // Use fallback distance calculation if directions request fails
      if (!distanceCalculatedRef.current && onDistanceCalculated) {
        const distance = calculateHaversineDistance(
          safePickupLocation.lat, safePickupLocation.lng,
          safeDropLocation.lat, safeDropLocation.lng
        );
        const duration = Math.round(distance * 2);
        distanceCalculatedRef.current = true;
        onDistanceCalculated(distance, duration);
      }
    }
  }, [mapLoaded, directionsRequested, google, cacheKey, safePickupLocation, safeDropLocation, onDistanceCalculated]);

  // Fallback if Google Maps fails to load
  if (mapError) {
    // Calculate and provide a fallback distance before showing error
    if (!distanceCalculatedRef.current && onDistanceCalculated) {
      try {
        const distance = calculateHaversineDistance(
          safePickupLocation.lat, safePickupLocation.lng,
          safeDropLocation.lat, safeDropLocation.lng
        );
        const duration = Math.round(distance * 2);
        onDistanceCalculated(distance, duration);
        distanceCalculatedRef.current = true;
      } catch (error) {
        console.error("Error calculating fallback distance:", error);
      }
    }
    
    return (
      <div className="bg-gray-100 rounded-lg p-6 text-center border border-gray-300">
        <div className="flex flex-col items-center justify-center gap-4">
          <MapPin className="h-12 w-12 text-blue-500" />
          <h3 className="text-lg font-semibold">Map temporarily unavailable</h3>
          <p className="text-gray-600 mb-4">
            We're using an approximate distance calculation instead.
          </p>
          <p className="text-sm text-gray-500">
            From: {safePickupLocation.address || safePickupLocation.name}
            <br />
            To: {safeDropLocation.address || safeDropLocation.name}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-4 text-center bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={handleMapLoad}
        options={{ 
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          // Restrict to India view
          restriction: {
            latLngBounds: {
              north: 37.0,
              south: 8.0,
              west: 68.0,
              east: 97.0
            },
            strictBounds: false
          }
        }}
      >
        {mapLoaded && !directions && directionsRequested && !directionsRequestFailed && (
          <DirectionsService
            options={{
              origin: { lat: safePickupLocation.lat, lng: safePickupLocation.lng },
              destination: { lat: safeDropLocation.lat, lng: safeDropLocation.lng },
              travelMode: google?.maps.TravelMode.DRIVING,
              region: 'in', // India region code
              avoidFerries: true,
              avoidHighways: false,
              avoidTolls: false,
            }}
            callback={handleDirectionsCallback}
          />
        )}

        {directions && (
          <DirectionsRenderer
            options={{
              directions: directions,
              suppressMarkers: false,
            }}
          />
        )}

        {!directions && (
          <>
            <Marker
              position={{ lat: safePickupLocation.lat, lng: safePickupLocation.lng }}
              label={{ text: "A", color: "white" }}
            />
            <Marker
              position={{ lat: safeDropLocation.lat, lng: safeDropLocation.lng }}
              label={{ text: "B", color: "white" }}
            />
          </>
        )}
      </GoogleMap>
      
      {routeNotFound && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          <p className="font-medium">No route found between these locations</p>
          <p className="text-sm">We've calculated an approximate straight-line distance instead.</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapComponent;
