import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { DriverDashboardTrip } from '../types/driverDashboard';

const VIZAG = { lat: 17.6868, lng: 83.2185 };
const FRESH_MS = 30 * 60 * 1000;

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #e2e8f0; touch-action: none; }
  .tag { background: #fff; border: 0; border-radius: 6px; padding: 1px 4px; font: 700 10px sans-serif; }
  .leaflet-tooltip-top:before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  L.Browser.any3d = false;
  const map = L.map('map', { zoomControl: false }).setView([${VIZAG.lat}, ${VIZAG.lng}], 12);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, detectRetina: false }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let userMoved = false;
  let programmatic = false;
  let fittedKey = '';
  function note(kind) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(kind);
  }
  map.on('dragstart', function () { if (!programmatic) userMoved = true; });
  map.on('zoomstart', function (event) { if (!programmatic && event.originalEvent) userMoved = true; });
  const box = document.getElementById('map');
  box.addEventListener('touchstart', function () { note('lock'); }, { passive: true });
  box.addEventListener('touchend', function () { note('unlock'); });
  box.addEventListener('touchcancel', function () { note('unlock'); });
  function fill(tone) {
    if (tone === 'stale') return '#f59e0b';
    if (tone === 'old') return '#94a3b8';
    return '#10b981';
  }
  function frame(rows) {
    const fresh = (rows || []).filter(function (row) { return row.fresh; });
    const chosen = fresh.length ? fresh : (rows || []);
    const bounds = [];
    chosen.forEach(function (row) {
      if (row.lat == null || row.lng == null) return;
      bounds.push([row.lat, row.lng]);
    });
    if (!bounds.length) return;
    const key = chosen.map(function (row) { return row.tripId; }).sort().join(',');
    if (userMoved || key === fittedKey) return;
    fittedKey = key;
    programmatic = true;
    if (bounds.length === 1) map.setView(bounds[0], 16);
    else map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    setTimeout(function () { programmatic = false; map.invalidateSize(); }, 250);
  }
  window.setVehicles = function (rows) {
    layer.clearLayers();
    (rows || []).forEach(function (row) {
      if (row.lat == null || row.lng == null) return;
      const marker = L.circleMarker([row.lat, row.lng], {
        radius: 9, color: '#fff', weight: 2, fillColor: fill(row.tone), fillOpacity: 1
      }).addTo(layer);
      marker.bindTooltip(String(row.label || ''), { permanent: true, direction: 'top', className: 'tag', offset: [0, -8] });
      marker.on('click', function () { note(String(row.tripId)); });
    });
    frame(rows);
    setTimeout(function () { map.invalidateSize(); }, 200);
  };
  window.focusVehicle = function (lat, lng) {
    if (lat == null || lng == null) return;
    programmatic = true;
    userMoved = true;
    map.setView([lat, lng], 16);
    setTimeout(function () { programmatic = false; }, 250);
  };
</script>
</body>
</html>`;

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

type PinTone = 'live' | 'stale' | 'old';

function toneFor(age: number | null): PinTone {
  if (age == null || age <= 3 * 60 * 1000) return 'live';
  if (age <= 20 * 60 * 1000) return 'stale';
  return 'old';
}

function pins(trips: DriverDashboardTrip[]) {
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
  return Array.from(best.values()).map((trip) => {
    const age = trackedAge(trip.liveTrackedAt);
    return {
      tripId: trip.tripId,
      lat: trip.liveLat as number,
      lng: trip.liveLng as number,
      label: (trip.vehicleNumber || trip.tripCode || 'Cab').slice(-4),
      fresh: age == null || age <= FRESH_MS,
      tone: toneFor(age),
    };
  });
}

export function DriverLiveMap({
  trips,
  focusId,
  onSelect,
  onGestureStart,
  onGestureEnd,
}: {
  trips: DriverDashboardTrip[];
  focusId?: number | null;
  onSelect?: (tripId: number) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
}) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const tripsRef = useRef(trips);
  tripsRef.current = trips;
  const onGestureStartRef = useRef(onGestureStart);
  const onGestureEndRef = useRef(onGestureEnd);
  onGestureStartRef.current = onGestureStart;
  onGestureEndRef.current = onGestureEnd;

  const push = () => {
    if (!ready.current) return;
    const payload = JSON.stringify(pins(tripsRef.current));
    webRef.current?.injectJavaScript(`window.setVehicles && window.setVehicles(${payload}); true;`);
  };

  useEffect(() => {
    push();
  }, [trips]);

  useEffect(() => {
    if (!ready.current || focusId == null) return;
    const selected = trips.find((item) => item.tripId === focusId);
    if (!selected) return;
    const plotted = pins(trips);
    const row = plotted.find((item) => item.tripId === selected.tripId)
      ?? plotted.find((item) => {
        const owner = trips.find((trip) => trip.tripId === item.tripId);
        return owner ? vehicleKey(owner) === vehicleKey(selected) : false;
      });
    if (!row) return;
    webRef.current?.injectJavaScript(`window.focusVehicle && window.focusVehicle(${row.lat}, ${row.lng}); true;`);
  }, [focusId, trips]);

  const plotted = pins(trips).length;

  return (
    <View
      style={styles.wrap}
      collapsable={false}
      onTouchStart={() => onGestureStartRef.current?.()}
      onTouchEnd={() => onGestureEndRef.current?.()}
      onTouchCancel={() => onGestureEndRef.current?.()}
    >
      <WebView
        ref={webRef}
        source={{ html: MAP_HTML, baseUrl: 'https://unpkg.com' }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          ready.current = true;
          push();
        }}
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          if (data === 'lock') {
            onGestureStartRef.current?.();
            return;
          }
          if (data === 'unlock') {
            onGestureEndRef.current?.();
            return;
          }
          const id = Number(data);
          if (!Number.isFinite(id)) return;
          onSelect?.(id);
        }}
      />
      <Text style={styles.caption}>
        {plotted > 0
          ? 'Green is a GPS fix from the last few minutes. Amber is older. Drag the map to look closer.'
          : 'No GPS yet. A pin appears after the driver phone gets a GPS fix.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, backgroundColor: '#dbe4ee', borderRadius: 10, overflow: 'hidden' },
  map: { height: 320, backgroundColor: '#dbe4ee' },
  caption: { color: '#64748b', fontSize: 12, margin: 8 },
});
