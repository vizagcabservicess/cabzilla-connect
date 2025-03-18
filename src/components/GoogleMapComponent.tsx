
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { Location } from "@/lib/locationData";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  onDistanceCalculated?: (distance: number, duration: number) => void;
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

  // Ensure we have valid coordinates for the center
  const center = pickupLocation && typeof pickupLocation.lat === 'number' && typeof pickupLocation.lng === 'number' && 
                !isNaN(pickupLocation.lat) && !isNaN(pickupLocation.lng)
    ? { lat: pickupLocation.lat, lng: pickupLocation.lng } 
    : { lat: 17.6868, lng: 83.2185 }; // Default to Visakhapatnam

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
      if (onDistanceCalculated && pickupLocation && dropLocation) {
        // Calculate approximate distance using the Haversine formula
        const R = 6371; // Radius of the earth in km
        
        // Ensure we have valid coordinates
        if (typeof pickupLocation.lat !== 'number' || typeof pickupLocation.lng !== 'number' ||
            typeof dropLocation.lat !== 'number' || typeof dropLocation.lng !== 'number' ||
            isNaN(pickupLocation.lat) || isNaN(pickupLocation.lng) ||
            isNaN(dropLocation.lat) || isNaN(dropLocation.lng)) {
          console.error("Invalid coordinates for distance calculation - using default values");
          onDistanceCalculated(10, 20); // Default values
          return;
        }
        
        const dLat = (dropLocation.lat - pickupLocation.lat) * Math.PI / 180;
        const dLon = (dropLocation.lng - pickupLocation.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pickupLocation.lat * Math.PI / 180) * Math.cos(dropLocation.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = Math.round(R * c); // Distance in km
        const duration = Math.round(distance * 2); // Approximate duration in minutes
        
        onDistanceCalculated(distance, duration);
      }
    }
  }, [onDistanceCalculated, pickupLocation, dropLocation]);

  useEffect(() => {
    // Reset directions when locations change
    if (pickupLocation && dropLocation) {
      setDirections(null);
      setDirectionsRequested(false);
      setDirectionsRequestFailed(false);
      directionsRequestCount.current = 0;
    }
  }, [pickupLocation, dropLocation]);

  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }, []);

  // Handle directions request
  useEffect(() => {
    if (mapLoaded && pickupLocation && dropLocation && !directionsRequested && google) {
      // Verify we have valid coordinates
      if (typeof pickupLocation.lat !== 'number' || typeof pickupLocation.lng !== 'number' ||
          typeof dropLocation.lat !== 'number' || typeof dropLocation.lng !== 'number' ||
          isNaN(pickupLocation.lat) || isNaN(pickupLocation.lng) ||
          isNaN(dropLocation.lat) || isNaN(dropLocation.lng)) {
        console.error("Invalid coordinates for directions", { pickupLocation, dropLocation });
        setDirectionsRequestFailed(true);
        return;
      }
      
      setDirectionsRequested(true);
      directionsRequestCount.current += 1;
      console.log(`Making directions request #${directionsRequestCount.current}`);
    }
  }, [mapLoaded, pickupLocation, dropLocation, directionsRequested, google]);

  if (!isLoaded) {
    return <div className="p-4 text-center bg-gray-100 rounded-lg">Loading map...</div>;
  }

  // Validate locations before rendering
  const hasValidLocations = pickupLocation && dropLocation && 
    typeof pickupLocation.lat === 'number' && typeof pickupLocation.lng === 'number' &&
    typeof dropLocation.lat === 'number' && typeof dropLocation.lng === 'number' &&
    !isNaN(pickupLocation.lat) && !isNaN(pickupLocation.lng) &&
    !isNaN(dropLocation.lat) && !isNaN(dropLocation.lng);

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onMapLoad}
    >
      {hasValidLocations && mapLoaded && !directions && directionsRequested && !directionsRequestFailed && (
        <DirectionsService
          options={{
            origin: { lat: pickupLocation.lat, lng: pickupLocation.lng },
            destination: { lat: dropLocation.lat, lng: dropLocation.lng },
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

      {!directions && pickupLocation && typeof pickupLocation.lat === 'number' && typeof pickupLocation.lng === 'number' && 
        !isNaN(pickupLocation.lat) && !isNaN(pickupLocation.lng) && (
        <Marker
          position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
          label={{ text: "A", color: "white" }}
        />
      )}

      {!directions && dropLocation && typeof dropLocation.lat === 'number' && typeof dropLocation.lng === 'number' && 
        !isNaN(dropLocation.lat) && !isNaN(dropLocation.lng) && (
        <Marker
          position={{ lat: dropLocation.lat, lng: dropLocation.lng }}
          label={{ text: "B", color: "white" }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleMapComponent;
