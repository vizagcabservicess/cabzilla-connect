import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, Phone, RefreshCw, Search } from 'lucide-react';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { formatLastSeen, formatServerDateTime, trackSignal } from '@/lib/eventDuty';
import type { EventTrackSignal, EventTrackVehicle } from '@/types/eventDuty';

const VIZAG = { lat: 17.6868, lng: 83.2185 };

const SIGNAL_STYLE: Record<EventTrackSignal, { dot: string }> = {
  live: { dot: 'bg-emerald-500' },
  stale: { dot: 'bg-amber-500' },
  offline: { dot: 'bg-slate-400' },
  none: { dot: 'bg-slate-300' },
};

function signalOf(row: EventTrackVehicle): EventTrackSignal {
  if (row.lat == null || row.lng == null) return 'none';
  return trackSignal(row.lastGpsAt) === 'none' ? row.signal : trackSignal(row.lastGpsAt);
}

export function EventTrackingMap({
  vehicles,
  onRefresh,
  refreshing = false,
}: {
  vehicles: EventTrackVehicle[];
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { isLoaded, error } = useGoogleMaps();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((row) => {
      if (!q) return true;
      return [row.vehicleNumber, row.driverName, row.vehicleType, row.address]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, query]);

  const plotted = rows.filter((row) => row.lat != null && row.lng != null);
  const selected = rows.find((row) => row.dutyId === selectedId) || null;

  useEffect(() => {
    if (!map || !window.google?.maps || plotted.length === 0) return;
    if (selected?.lat != null && selected.lng != null) {
      map.panTo({ lat: selected.lat, lng: selected.lng });
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    plotted.forEach((row) => bounds.extend({ lat: row.lat as number, lng: row.lng as number }));
    map.fitBounds(bounds, 48);
  }, [map, plotted, selected]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[20rem_1fr]">
      <div className="flex max-h-[28rem] flex-col border-b border-slate-100 lg:max-h-[36rem] lg:border-b-0 lg:border-r">
        <p className="px-3 pt-3 text-[11px] text-slate-500">
          Green is live and follows the driver’s phone. Close the driver link on any other phone, or the pin stays there.
        </p>
        <div className="flex items-center gap-2 p-3">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vehicle or driver"
              className="h-9 w-full rounded-full bg-slate-50 pl-8 pr-3 text-sm outline-none"
            />
          </label>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500"
              aria-label="Refresh tracking"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((row) => {
            const signal = signalOf(row);
            const style = SIGNAL_STYLE[signal];
            const active = selectedId === row.dutyId;
            return (
              <button
                key={row.dutyId}
                type="button"
                onClick={() => setSelectedId(row.dutyId)}
                className={`flex w-full items-start gap-2 border-t border-slate-50 px-3 py-2.5 text-left ${active ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{row.vehicleNumber}</div>
                  <div className="truncate text-xs text-slate-500">{row.driverName}</div>
                  <div className="mt-0.5 flex items-start gap-1 text-[11px] text-slate-400">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{row.address || (row.lat != null ? `${row.lat.toFixed(5)}, ${row.lng?.toFixed(5)}` : 'Waiting for phone GPS')}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="max-w-[6.5rem] text-[10px] font-semibold leading-tight text-slate-500">
                    {formatLastSeen(row.lastGpsAt)}
                    {row.accuracy != null && row.accuracy > 0 ? ` · ±${Math.round(row.accuracy)} m` : ''}
                  </div>
                  {row.driverMobile ? (
                    <a href={`tel:${row.driverMobile}`} className="mt-1 inline-flex text-sky-600" onClick={(e) => e.stopPropagation()}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-slate-500">No vehicles to track for this date.</p>
          )}
        </div>
      </div>
      <div className="relative h-64 lg:h-[36rem]">
        {error || !isLoaded ? (
          <div className="flex h-full items-center justify-center bg-slate-50 px-4 text-center text-sm text-slate-500">
            {error ? 'Map could not load. Vehicle list still shows the last phone location.' : 'Loading map…'}
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={selected?.lat != null && selected.lng != null ? { lat: selected.lat, lng: selected.lng } : VIZAG}
            zoom={12}
            onLoad={setMap}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
          >
            {plotted.map((row) => (
              <Marker
                key={row.dutyId}
                position={{ lat: row.lat as number, lng: row.lng as number }}
                title={`${row.vehicleNumber} · ${row.driverName}`}
                label={{ text: row.vehicleNumber.slice(-4), fontSize: '10px', fontWeight: '700' }}
                onClick={() => setSelectedId(row.dutyId)}
              />
            ))}
          </GoogleMap>
        )}
        {selected && (
          <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 p-3 text-xs shadow-md">
            <div className="font-semibold">{selected.vehicleNumber} · {selected.driverName}</div>
            <div className="text-slate-500">{selected.address || 'Location from driver phone'}</div>
            <div className="mt-1 text-slate-400">{formatLastSeen(selected.lastGpsAt)}{selected.lastGpsAt ? ` · ${formatServerDateTime(selected.lastGpsAt)}` : ''}</div>
          </div>
        )}
      </div>
    </div>
  );
}
