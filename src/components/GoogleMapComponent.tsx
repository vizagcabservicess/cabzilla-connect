
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

  // Validate location objects and provide safe defaults
  const safePickupLocation = pickupLocation && typeof pickupLocation === 'object' 
    ? {
        id: pickupLocation.id || '',
        name: pickupLocation.name || '',
        address: pickupLocation.address || '',
        lat: typeof pickupLocation.lat === 'number' ? pickupLocation.lat : 17.6868,
        lng: typeof pickupLocation.lng === 'number' ? pickupLocation.lng : 83.2185
      }
    : { lat: 17.6868, lng: 83.2185, id: '', name: '', address: '' };
    
  const safeDropLocation = dropLocation && typeof dropLocation === 'object'
    ? {
        id: dropLocation.id || '',
        name: dropLocation.name || '',
        address: dropLocation.address || '', 
        lat: typeof dropLocation.lat === 'number' ? dropLocation.lat : 17.7,
        lng: typeof dropLocation.lng === 'number' ? dropLocation.lng : 83.3
      }
    : { lat: 17.7, lng: 83.3, id: '', name: '', address: '' };

  // Ensure we have valid coordinates for the center
  const center = safePickupLocation && 
                 typeof safePickupLocation.lat === 'number' && 
                 typeof safePickupLocation.lng === 'number' && 
                 !isNaN(safePickupLocation.lat) && 
                 !isNaN(safePickupLocation.lng)
    ? { lat: safePickupLocation.lat, lng: safePickupLocation.lng } 
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
      if (onDistanceCalculated && safePickupLocation && safeDropLocation) {
        // Calculate approximate distance using the Haversine formula
        const R = 6371; // Radius of the earth in km
        
        // Ensure we have valid coordinates
        const pickupLat = typeof safePickupLocation.lat === 'number' ? safePickupLocation.lat : 17.6868;
        const pickupLng = typeof safePickupLocation.lng === 'number' ? safePickupLocation.lng : 83.2185;
        const dropLat = typeof safeDropLocation.lat === 'number' ? safeDropLocation.lat : 17.7;
        const dropLng = typeof safeDropLocation.lng === 'number' ? safeDropLocation.lng : 83.3;
        
        const dLat = (dropLat - pickupLat) * Math.PI / 180;
        const dLon = (dropLng - pickupLng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pickupLat * Math.PI / 180) * Math.cos(dropLat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = Math.round(R * c); // Distance in km
        const duration = Math.round(distance * 2); // Approximate duration in minutes
        
        onDistanceCalculated(distance, duration);
      }
    }
  }, [onDistanceCalculated, safePickupLocation, safeDropLocation, google]);

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
    const isValidPickup = safePickupLocation && 
                         typeof safePickupLocation.lat === 'number' && 
                         typeof safePickupLocation.lng === 'number' &&
                         !isNaN(safePickupLocation.lat) && 
                         !isNaN(safePickupLocation.lng);
                         
    const isValidDrop = safeDropLocation && 
                       typeof safeDropLocation.lat === 'number' && 
                       typeof safeDropLocation.lng === 'number' &&
                       !isNaN(safeDropLocation.lat) && 
                       !isNaN(safeDropLocation.lng);
                       
    return isValidPickup && isValidDrop;
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

      {!directions && safePickupLocation && 
       typeof safePickupLocation.lat === 'number' && 
       typeof safePickupLocation.lng === 'number' && 
       !isNaN(safePickupLocation.lat) && 
       !isNaN(safePickupLocation.lng) && (
        <Marker
          position={{ lat: safePickupLocation.lat, lng: safePickupLocation.lng }}
          label={{ text: "A", color: "white" }}
        />
      )}

      {!directions && safeDropLocation && 
       typeof safeDropLocation.lat === 'number' && 
       typeof safeDropLocation.lng === 'number' && 
       !isNaN(safeDropLocation.lat) && 
       !isNaN(safeDropLocation.lng) && (
        <Marker
          position={{ lat: safeDropLocation.lat, lng: safeDropLocation.lng }}
          label={{ text: "B", color: "white" }}
        />
      )}
    </GoogleMap>
  );
};

export default GoogleMapComponent;
