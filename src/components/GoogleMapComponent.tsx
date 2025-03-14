
import { GoogleMap, LoadScript, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { useState, useCallback, useEffect } from "react";
import { Location } from "@/lib/locationData";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_DEFAULT_API_KEY";

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
}

const GoogleMapComponent = ({ pickupLocation, dropLocation }: GoogleMapComponentProps) => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  const center = pickupLocation ? 
    { lat: pickupLocation.lat, lng: pickupLocation.lng } : 
    { lat: 17.6868, lng: 83.2185 }; // Default to Visakhapatnam

  const directionsCallback = useCallback((result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
    console.log("Directions status:", status);
    
    if (status === 'OK' && result) {
      setDirections(result);
    } else {
      console.error("Directions request failed with status:", status);
    }
  }, []);

  useEffect(() => {
    // Reset directions when locations change
    if (mapLoaded && pickupLocation && dropLocation) {
      setDirections(null);
    }
  }, [pickupLocation, dropLocation, mapLoaded]);

  const onMapLoad = useCallback(() => {
    console.log("Map loaded successfully");
    setMapLoaded(true);
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      onLoad={() => console.log("LoadScript onLoad called")}
      onError={(error) => console.error("LoadScript error:", error)}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
      >
        {pickupLocation && dropLocation && mapLoaded && !directions && (
          <DirectionsService
            options={{
              origin: { lat: pickupLocation.lat, lng: pickupLocation.lng },
              destination: { lat: dropLocation.lat, lng: dropLocation.lng },
              travelMode: google.maps.TravelMode.DRIVING,
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

        {!directions && pickupLocation && (
          <Marker
            position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
            label={{ text: "A", color: "white" }}
          />
        )}

        {!directions && dropLocation && (
          <Marker
            position={{ lat: dropLocation.lat, lng: dropLocation.lng }}
            label={{ text: "B", color: "white" }}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default GoogleMapComponent;
