
import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, DirectionsRenderer, DirectionsService, Marker } from '@react-google-maps/api';
import { Location } from '@/lib/locationData';

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  onDistanceCalculated?: (distance: number, duration: number) => void;
}

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  pickupLocation,
  dropLocation,
  onDistanceCalculated
}) => {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '0.5rem'
  };
  
  const center = {
    lat: (pickupLocation.lat + dropLocation.lat) / 2,
    lng: (pickupLocation.lng + dropLocation.lng) / 2
  };
  
  useEffect(() => {
    if (pickupLocation && dropLocation && mapLoaded) {
      // Reset directions when locations change
      setDirections(null);
    }
  }, [pickupLocation, dropLocation, mapLoaded]);
  
  const directionsCallback = (
    result: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === 'OK' && result) {
      setDirections(result);
      
      // Extract and calculate distance and duration
      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        if (route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          const distance = Math.ceil(leg.distance?.value || 0) / 1000; // Convert to kilometers
          const duration = Math.ceil(leg.duration?.value || 0) / 60; // Convert to minutes
          
          if (onDistanceCalculated) {
            onDistanceCalculated(distance, duration);
          }
        }
      }
    } else {
      setError(`Directions request failed: ${status}`);
      console.error('Directions request failed:', status);
    }
  };
  
  const handleLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
  };
  
  return (
    <div className="map-container w-full relative">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 z-10">
          <div className="text-red-500 text-center p-4">
            {error}
            <p className="text-sm text-gray-600 mt-2">
              Try selecting different locations or refreshing the page.
            </p>
          </div>
        </div>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={10}
        onLoad={handleLoad}
      >
        {mapLoaded && pickupLocation && dropLocation && !directions && (
          <DirectionsService
            options={{
              origin: { lat: pickupLocation.lat, lng: pickupLocation.lng },
              destination: { lat: dropLocation.lat, lng: dropLocation.lng },
              travelMode: google.maps.TravelMode.DRIVING
            }}
            callback={directionsCallback}
          />
        )}
        
        {directions && (
          <DirectionsRenderer
            options={{
              directions: directions,
              suppressMarkers: false
            }}
          />
        )}
        
        {!directions && (
          <>
            {pickupLocation && (
              <Marker
                position={{ lat: pickupLocation.lat, lng: pickupLocation.lng }}
                label={{ text: "A", color: "white" }}
              />
            )}
            {dropLocation && (
              <Marker
                position={{ lat: dropLocation.lat, lng: dropLocation.lng }}
                label={{ text: "B", color: "white" }}
              />
            )}
          </>
        )}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;
