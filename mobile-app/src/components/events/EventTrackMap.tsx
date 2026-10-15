import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { TrackVehicle } from '../../services/eventDutyAPI';
import { fonts } from '../../theme/colors';

const VIZAG = { lat: 17.6868, lng: 83.2185 };

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #e2e8f0; }
  .tag { background: #fff; border: 0; border-radius: 6px; padding: 1px 4px; font: 700 10px sans-serif; box-shadow: none; }
  .leaflet-tooltip-top:before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: true }).setView([${VIZAG.lat}, ${VIZAG.lng}], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  function colorFor(signal) {
    if (signal === 'live') return '#10b981';
    if (signal === 'stale') return '#f59e0b';
    return '#64748b';
  }
  function tell(id) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(String(id));
  }
  window.setVehicles = function (rows) {
    layer.clearLayers();
    const bounds = [];
    (rows || []).forEach(function (row) {
      if (row.lat == null || row.lng == null) return;
      const color = colorFor(row.signal);
      const marker = L.circleMarker([row.lat, row.lng], {
        radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1
      }).addTo(layer);
      marker.bindTooltip(String(row.label || ''), { permanent: true, direction: 'top', className: 'tag', offset: [0, -6] });
      marker.on('click', function () { tell(row.dutyId); });
      bounds.push([row.lat, row.lng]);
    });
    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] });
    setTimeout(function () { map.invalidateSize(); }, 200);
  };
  window.focusVehicle = function (lat, lng) {
    if (lat == null || lng == null) return;
    map.setView([lat, lng], 15);
  };
</script>
</body>
</html>`;

function pins(vehicles: TrackVehicle[]) {
  return vehicles
    .filter((row) => row.lat != null && row.lng != null)
    .map((row) => ({
      dutyId: row.dutyId,
      lat: row.lat,
      lng: row.lng,
      signal: row.signal,
      label: (row.vehicleNumber || 'Cab').slice(-4),
    }));
}

export function EventTrackMap({
  vehicles,
  focusId,
  onSelect,
  fill = false,
}: {
  vehicles: TrackVehicle[];
  focusId?: number | null;
  onSelect?: (dutyId: number) => void;
  fill?: boolean;
}) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  const push = () => {
    if (!ready.current) return;
    const payload = JSON.stringify(pins(vehiclesRef.current));
    webRef.current?.injectJavaScript(`window.setVehicles && window.setVehicles(${payload}); true;`);
  };

  useEffect(() => {
    push();
  }, [vehicles]);

  useEffect(() => {
    if (!ready.current || focusId == null) return;
    const row = vehicles.find((item) => item.dutyId === focusId && item.lat != null && item.lng != null);
    if (!row) return;
    webRef.current?.injectJavaScript(`window.focusVehicle && window.focusVehicle(${row.lat}, ${row.lng}); true;`);
  }, [focusId, vehicles]);

  const plotted = pins(vehicles).length;

  return (
    <View style={fill ? styles.wrapFill : styles.wrap} collapsable={false}>
      <WebView
        ref={webRef}
        source={{ html: MAP_HTML, baseUrl: 'https://unpkg.com' }}
        style={fill ? styles.mapFill : styles.map}
        containerStyle={fill ? styles.mapFill : styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          ready.current = true;
          push();
        }}
        onMessage={(event) => {
          const id = Number(event.nativeEvent.data);
          if (!Number.isFinite(id)) return;
          onSelect?.(id);
        }}
      />
      <Text style={styles.caption}>
        {plotted > 0 ? `${plotted} on the map. Green is live.` : 'Waiting for driver GPS. Pins appear when a duty is open.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, backgroundColor: '#dbe4ee' },
  wrapFill: { flex: 1, minHeight: 360, backgroundColor: '#dbe4ee' },
  map: { height: 280, backgroundColor: '#dbe4ee' },
  mapFill: { flex: 1, minHeight: 360, backgroundColor: '#dbe4ee' },
  caption: { color: '#64748b', fontSize: 12, fontFamily: fonts.regular, marginTop: 6, marginBottom: 4 },
});
