import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

const DEFAULT_CENTER = { lat: 17.6868, lng: 83.2185 };

type CarpoolRouteMapProps = {
  pickup: string;
  drop: string;
  className?: string;
  height?: number;
  onRouteMeta?: (meta: { durationText: string }) => void;
};

function routeAddress(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  if (/visakhapatnam|vizag|andhra/i.test(trimmed)) return trimmed;
  return `${trimmed}, Visakhapatnam, Andhra Pradesh`;
}

export function CarpoolRouteMap({ pickup, drop, className, height = 160, onRouteMeta }: CarpoolRouteMapProps) {
  const { isLoaded, google } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const requestId = useRef(0);

  const mapContainerStyle = {
    width: '100%',
    height: `${height}px`,
  };

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      if (google?.maps) {
        setDirectionsService(new google.maps.DirectionsService());
        map.setOptions({ disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative' });
      }
    },
    [google],
  );

  useEffect(() => {
    if (!directionsService || !google?.maps) return;

    const origin = routeAddress(pickup);
    const destination = routeAddress(drop);
    if (!origin || !destination) {
      setDirections(null);
      return;
    }

    const id = ++requestId.current;
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (id !== requestId.current) return;
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const durationText = result.routes[0]?.legs[0]?.duration?.text?.trim();
          if (durationText) onRouteMeta?.({ durationText });
        } else {
          setDirections(null);
        }
      },
    );
  }, [directionsService, google, pickup, drop, onRouteMeta]);

  if (!isLoaded || !google) {
    return (
      <div
        className={className}
        style={{ height }}
        aria-hidden
      >
        <div className="flex h-full items-center justify-center bg-gray-100">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={DEFAULT_CENTER}
        zoom={11}
        onLoad={handleMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: false,
          fullscreenControl: false,
          streetViewControl: false,
        }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: '#008744',
                strokeWeight: 4,
                strokeOpacity: 0.85,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
