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

const GoogleMapComponent = ({ 
  pickupLocation, 
  dropLocation,
  onDistanceCalculated 
}: GoogleMapComponentProps) => {
  const { isLoaded, google } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [directionsRequested, setDirectionsRequested] = useState(false);
  const [directionsRequestFailed, setDirectionsRequestFailed] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);
  const directionsRequestCount = useRef(0);

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

  // Set the center to the pickup location
  const center = { 
    lat: safePickupLocation.lat,
    lng: safePickupLocation.lng
  };

  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    console.log("Directions status:", status);
    
    if (status === google.maps.DirectionsStatus.OK && result) {
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
        
        // Call the callback with the actual distance and duration
        if (onDistanceCalculated) {
          onDistanceCalculated(distanceInKm, durationInMinutes);
        }
      }
    } else {
      console.error("Directions request failed with status:", status);
      setDirectionsRequestFailed(true);
      
      // Fallback to default distance calculation if Google Maps fails
      if (onDistanceCalculated) {
        // Calculate approximate distance using the Haversine formula
        const distance = calculateHaversineDistance(
          safePickupLocation.lat, safePickupLocation.lng,
          safeDropLocation.lat, safeDropLocation.lng
        );
        
        const duration = Math.round(distance * 2); // Approximate duration in minutes
        
        onDistanceCalculated(distance, duration);
      }
    }
  }, [onDistanceCalculated, safePickupLocation, safeDropLocation, google]);

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
        directionsRequestCount.current = 0;
      }
    } catch (error) {
      console.error("Error in location change effect:", error);
      setMapError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [safePickupLocation, safeDropLocation]);

  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }, []);

  // Handle directions request
  useEffect(() => {
    try {
      if (mapLoaded && !directionsRequested && google) {
        setDirectionsRequested(true);
        directionsRequestCount.current += 1;
        console.log(`Making directions request #${directionsRequestCount.current}`);
      }
    } catch (error) {
      console.error("Error in directions request effect:", error);
      setMapError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [mapLoaded, directionsRequested, google]);

  // Handle errors
  if (mapError) {
    return (
      <ApiErrorFallback 
        error={mapError}
        onRetry={() => window.location.reload()}
        title="Map Error"
      />
    );
  }

  if (!isLoaded) {
    return <div className="p-4 text-center bg-gray-100 rounded-lg">Loading map...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onMapLoad}
    >
      {mapLoaded && !directions && directionsRequested && !directionsRequestFailed && (
        <DirectionsService
          options={{
            origin: { lat: safePickupLocation.lat, lng: safePickupLocation.lng },
            destination: { lat: safeDropLocation.lat, lng: safeDropLocation.lng },
            travelMode: google?.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
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
  );
  
  // Define the functions referenced in the code
  function directionsCallback(result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) {
    console.log("Directions status:", status);
    
    if (status === google.maps.DirectionsStatus.OK && result) {
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
        
        // Call the callback with the actual distance and duration
        if (onDistanceCalculated) {
          onDistanceCalculated(distanceInKm, durationInMinutes);
        }
      }
    } else {
      console.error("Directions request failed with status:", status);
      setDirectionsRequestFailed(true);
      
      // Fallback to default distance calculation if Google Maps fails
      if (onDistanceCalculated) {
        // Calculate approximate distance using the Haversine formula
        const distance = calculateHaversineDistance(
          safePickupLocation.lat, safePickupLocation.lng,
          safeDropLocation.lat, safeDropLocation.lng
        );
        
        const duration = Math.round(distance * 2); // Approximate duration in minutes
        
        onDistanceCalculated(distance, duration);
      }
    }
  }
  
  function onMapLoad() {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }
};

export default GoogleMapComponent;
