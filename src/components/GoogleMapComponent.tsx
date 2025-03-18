
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { Location } from "@/lib/locationData";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

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
  const directionsRequestCount = useRef(0);

  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  // Create safe location objects with validated values
  const safePickupLocation: SafeLocation = {
    id: pickupLocation?.id || '',
    name: pickupLocation?.name || '',
    address: pickupLocation?.address || '',
    lat: typeof pickupLocation?.lat === 'number' && !isNaN(pickupLocation.lat) 
      ? pickupLocation.lat : 17.6868,
    lng: typeof pickupLocation?.lng === 'number' && !isNaN(pickupLocation.lng) 
      ? pickupLocation.lng : 83.2185
  };
  
  const safeDropLocation: SafeLocation = {
    id: dropLocation?.id || '',
    name: dropLocation?.name || '',
    address: dropLocation?.address || '',
    lat: typeof dropLocation?.lat === 'number' && !isNaN(dropLocation.lat) 
      ? dropLocation.lat : 17.7,
    lng: typeof dropLocation?.lng === 'number' && !isNaN(dropLocation.lng) 
      ? dropLocation.lng : 83.3
  };

  // Set the center to Visakhapatnam by default
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
    // Reset directions when locations change
    if (safePickupLocation && safeDropLocation) {
      setDirections(null);
      setDirectionsRequested(false);
      setDirectionsRequestFailed(false);
      directionsRequestCount.current = 0;
    }
  }, [safePickupLocation, safeDropLocation]);

  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }, []);

  // Check if locations have valid coordinates
  const hasValidLocations = () => {
    return true; // We've already validated and provided defaults
  };

  // Handle directions request
  useEffect(() => {
    if (mapLoaded && !directionsRequested && google && hasValidLocations()) {
      setDirectionsRequested(true);
      directionsRequestCount.current += 1;
      console.log(`Making directions request #${directionsRequestCount.current}`);
    }
  }, [mapLoaded, directionsRequested, google]);

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
      {hasValidLocations() && mapLoaded && !directions && directionsRequested && !directionsRequestFailed && (
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
};

export default GoogleMapComponent;
