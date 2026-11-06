import { useEffect, useMemo, useRef } from 'react';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { requestGoogleMaps, useGoogleMaps } from '@/providers/GoogleMapsProvider';
import type { DriverDashboardTrip } from '@/types/driverDashboard';

const VIZAG = { lat: 17.6868, lng: 83.2185 };
const FRESH_MS = 30 * 60 * 1000;

function trackedAge(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return null;
  return Date.now() - time;
}

function vehicleKey(trip: DriverDashboardTrip): string {
  const number = (trip.vehicleNumber || '').trim().toLowerCase();
  return number || `trip:${trip.tripId}`;
}

function latestPins(trips: DriverDashboardTrip[]): DriverDashboardTrip[] {
  const best = new Map<string, DriverDashboardTrip>();
  trips.forEach((trip) => {
    if (trip.liveLat == null || trip.liveLng == null) return;
    if (!Number.isFinite(trip.liveLat) || !Number.isFinite(trip.liveLng)) return;
    if (trip.liveLat === 0 && trip.liveLng === 0) return;
    const key = vehicleKey(trip);
    const prev = best.get(key);
    if (!prev) {
      best.set(key, trip);
      return;
    }
    const prevAge = trackedAge(prev.liveTrackedAt);
    const nextAge = trackedAge(trip.liveTrackedAt);
    if (prevAge == null || (nextAge != null && nextAge < prevAge)) best.set(key, trip);
  });
  return Array.from(best.values());
}

function framePins(pins: DriverDashboardTrip[]): DriverDashboardTrip[] {
  const fresh = pins.filter((trip) => {
    const age = trackedAge(trip.liveTrackedAt);
    return age == null || age <= FRESH_MS;
  });
  return fresh.length > 0 ? fresh : pins;
}

export function DriverLiveMap({
  trips,
  selectedId,
  onSelect,
}: {
  trips: DriverDashboardTrip[];
  selectedId: number | null;
  onSelect: (tripId: number | null) => void;
}) {
  const { isLoaded, google } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const points = useMemo(() => latestPins(trips), [trips]);
  const pointsRef = useRef(points);
  const tripsRef = useRef(trips);
  pointsRef.current = points;
  tripsRef.current = trips;

  useEffect(() => {
    requestGoogleMaps();
  }, []);

  const selectedTrip = trips.find((trip) => trip.tripId === selectedId) ?? null;
  const selected = selectedTrip
    ? points.find((trip) => trip.tripId === selectedTrip.tripId)
      ?? points.find((trip) => vehicleKey(trip) === vehicleKey(selectedTrip))
      ?? null
    : null;
  const pointKey = points.map((trip) => trip.tripId).join(',');

  useEffect(() => {
    const map = mapRef.current;
    const current = pointsRef.current;
    if (!map || !google || current.length === 0) return;
    if (selectedId != null) {
      const requested = tripsRef.current.find((trip) => trip.tripId === selectedId);
      const chosen = current.find((trip) => trip.tripId === selectedId)
        ?? (requested ? current.find((trip) => vehicleKey(trip) === vehicleKey(requested)) : undefined);
      if (chosen?.liveLat != null && chosen.liveLng != null) {
        map.panTo({ lat: chosen.liveLat, lng: chosen.liveLng });
        map.setZoom(15);
      }
      return;
    }
    const framed = framePins(current);
    if (framed.length === 1) {
      map.setCenter({ lat: framed[0].liveLat as number, lng: framed[0].liveLng as number });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    framed.forEach((trip) => {
      bounds.extend({ lat: trip.liveLat as number, lng: trip.liveLng as number });
    });
    map.fitBounds(bounds, 48);
  }, [google, pointKey, selectedId]);
  const center = selected
    ? { lat: selected.liveLat as number, lng: selected.liveLng as number }
    : points[0]
      ? { lat: points[0].liveLat as number, lng: points[0].liveLng as number }
      : VIZAG;

  if (!isLoaded || !google) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%', minHeight: 280 }}
      center={center}
      zoom={points.length === 1 ? 14 : 12}
      onLoad={(map) => {
        mapRef.current = map;
        const current = pointsRef.current;
        const framed = framePins(current);
        if (framed.length === 1) {
          map.setCenter({ lat: framed[0].liveLat as number, lng: framed[0].liveLng as number });
          map.setZoom(15);
          return;
        }
        if (framed.length < 2 || !google) return;
        const bounds = new google.maps.LatLngBounds();
        framed.forEach((trip) => {
          bounds.extend({ lat: trip.liveLat as number, lng: trip.liveLng as number });
        });
        map.fitBounds(bounds, 48);
      }}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      }}
    >
      {points.map((trip) => (
        <Marker
          key={trip.tripId}
          position={{ lat: trip.liveLat as number, lng: trip.liveLng as number }}
          title={`${trip.driverName || 'Driver'} · ${trip.vehicleNumber || trip.tripCode}`}
          onClick={() => onSelect(trip.tripId)}
        />
      ))}
      {selected && selected.liveLat != null && selected.liveLng != null ? (
        <InfoWindow
          position={{ lat: selected.liveLat, lng: selected.liveLng }}
          onCloseClick={() => onSelect(null)}
        >
          <div className="max-w-[200px] text-xs leading-snug">
            <div className="font-semibold">{selected.driverName || `Driver #${selected.driverId}`}</div>
            <div>{selected.vehicleNumber || 'No vehicle'}</div>
            <div>{selected.tripCode}</div>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMap>
  );
}
