import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Location } from '@/lib/locationData';
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { toast } from "sonner";

import { GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";

interface GoogleMapComponentProps {
  pickupLocation: Location;
  dropLocation: Location;
  tripType: string;
  waypoints?: Location[];
  /** Outstation one-way: route drop then return to pickup (garage-to-garage). */
  returnToPickup?: boolean;
  onDistanceCalculated?: (distance: number, duration: number) => void;
  mapHeight?: string;
}

// Vizag default coordinates as fallback
const DEFAULT_LAT = 17.6868;
const DEFAULT_LNG = 83.2185;

// Cache for directions results
const directionsCache = new Map<string, google.maps.DirectionsResult>();

const generateCacheKey = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints: Array<{ lat: number; lng: number }>,
  returnToPickup: boolean
): string => {
  const via = waypoints.map((point) => `${point.lat},${point.lng}`).join('|');
  const prefix = returnToPickup ? 'garage:' : '';
  return via
    ? `${prefix}${origin.lat},${origin.lng}_${via}_${destination.lat},${destination.lng}`
    : `${prefix}${origin.lat},${origin.lng}_${destination.lat},${destination.lng}`;
};

const GoogleMapComponent = ({ 
  pickupLocation, 
  dropLocation,
  tripType,
  waypoints = [],
  returnToPickup = false,
  onDistanceCalculated,
  mapHeight = '400px',
}: GoogleMapComponentProps) => {
  const { isLoaded, google } = useGoogleMaps();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapKey] = useState(() => Date.now()); // Stable key for map instance
  const distanceCalculated = useRef<boolean>(false);
  
  // Map container style
  const mapContainerStyle = useMemo(
    () => ({
      width: '100%',
      height: mapHeight,
      position: 'relative' as const,
    }),
    [mapHeight]
  );
  
  // Use the location's actual coordinates; only fall back to default for invalid (0,0) or missing
  const getValidCoordinates = (location: any): { lat: number; lng: number } => {
    if (!location) return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
    const hasValid =
      typeof location.lat === 'number' && !isNaN(location.lat) &&
      typeof location.lng === 'number' && !isNaN(location.lng) &&
      !(location.lat === 0 && location.lng === 0);
    return hasValid
      ? { lat: location.lat, lng: location.lng }
      : { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  };

  const pickupCoords = getValidCoordinates(pickupLocation);
  const dropCoords = getValidCoordinates(dropLocation);
  const waypointKey = waypoints
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|');
  const waypointCoords = useMemo(
    () => waypoints.map((stop) => getValidCoordinates(stop)),
    // getValidCoordinates is stable in this render; key captures lat/lng changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [waypointKey]
  );

  // Check if coords are valid for routing (not 0,0 or identical invalid points)
  const hasValidCoords = (loc: any) =>
    loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' &&
    !isNaN(loc.lat) && !isNaN(loc.lng) && (loc.lat !== 0 || loc.lng !== 0);
  const samePoint =
    !returnToPickup &&
    Math.abs(pickupCoords.lat - dropCoords.lat) < 1e-6 &&
    Math.abs(pickupCoords.lng - dropCoords.lng) < 1e-6;
  
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
      const cacheKey = generateCacheKey(pickupCoords, dropCoords, waypointCoords, returnToPickup);

      // Check cache first
      if (directionsCache.has(cacheKey)) {
        console.log("Using cached directions");
        setDirections(directionsCache.get(cacheKey)!);
        return;
      }

      // Same point or invalid coords: show map with markers only, report 0 km
      if (samePoint || (!hasValidCoords(pickupLocation) && !hasValidCoords(dropLocation))) {
        setDirections(null);
        if (onDistanceCalculated) onDistanceCalculated(0, 0);
        distanceCalculated.current = true;
        return;
      }

      try {
        const routeWaypoints = returnToPickup
          ? [...waypointCoords, dropCoords]
          : waypointCoords;
        console.log("Calculating directions between:", pickupCoords, dropCoords, {
          returnToPickup,
        });

        const results = await directionsService.route({
          origin: pickupCoords,
          destination: returnToPickup ? pickupCoords : dropCoords,
          waypoints: routeWaypoints.map((coords) => ({
            location: coords,
            stopover: true,
          })),
          optimizeWaypoints: false,
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
  }, [map, directionsService, pickupCoords, dropCoords, waypointKey, google, tripType, samePoint, pickupLocation, dropLocation, onDistanceCalculated, returnToPickup, waypointCoords]);
  
  // Reset the calculated flag when locations or tripType change
  useEffect(() => {
    distanceCalculated.current = false;
  }, [pickupLocation, dropLocation, tripType, waypointKey, returnToPickup]);
  
  // Add this after the main useEffect for fetching directions
  useEffect(() => {
    if (directions && onDistanceCalculated) {
      const legs = directions.routes[0]?.legs ?? [];
      if (legs.length > 0) {
        const distanceValue = Math.round(
          legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) / 1000
        );
        const durationValue = Math.round(
          legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0) / 60
        );
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
        
        {waypoints.map((stop, index) => (
          <Marker
            key={`stop-${stop.id || index}`}
            position={waypointCoords[index]}
            label={{
              text: String(index + 1),
              color: "white",
              fontWeight: "bold"
            }}
            title={stop.name || `Stop ${index + 1}`}
          />
        ))}

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
