import { useEffect, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { requestGoogleMaps, useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { bookingAPI } from '@/services/api';

type LiveFix = {
  active: boolean;
  bookingStatus: string;
  driverName: string;
  vehicleNumber: string;
  lat: number | null;
  lng: number | null;
  trackedAt: string | null;
};

const CLOSED = new Set(['completed', 'cancelled']);

export function CustomerLiveCab({ bookingId, status }: { bookingId: number; status: string }) {
  const { isLoaded } = useGoogleMaps();
  const [live, setLive] = useState<LiveFix | null>(null);

  useEffect(() => {
    requestGoogleMaps();
  }, []);

  useEffect(() => {
    if (!bookingId || CLOSED.has(status.toLowerCase())) {
      setLive(null);
      return undefined;
    }
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const next = await bookingAPI.getBookingLiveLocation(bookingId);
        if (stopped) return;
        setLive(next);
        if (CLOSED.has(next.bookingStatus.toLowerCase()) && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch {
        /* the next poll retries */
      }
    };
    void tick();
    timer = setInterval(() => {
      void tick();
    }, 10000);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [bookingId, status]);

  if (!live?.active) return null;
  const point = live.lat != null && live.lng != null ? { lat: live.lat, lng: live.lng } : null;
  const caption = [live.driverName, live.vehicleNumber].filter(Boolean).join(' · ') || 'Your driver is on this trip';

  return (
    <div className="mt-3 space-y-2">
      <div className="text-sm font-medium text-emerald-700">Live cab · {caption}</div>
      {point && isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: 220, borderRadius: 12 }}
          center={point}
          zoom={15}
          options={{ fullscreenControl: false, streetViewControl: false, mapTypeControl: false }}
        >
          <Marker position={point} title={live.vehicleNumber || live.driverName || 'Your cab'} />
        </GoogleMap>
      ) : (
        <p className="text-sm text-muted-foreground">
          {point ? 'Loading the map…' : "Waiting for the driver's GPS."}
        </p>
      )}
      <p className="text-xs text-muted-foreground">The map stops when the trip ends.</p>
    </div>
  );
}
