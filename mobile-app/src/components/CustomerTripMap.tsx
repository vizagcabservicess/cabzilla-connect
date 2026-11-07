import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #e2e8f0; }
  .tag { background: #fff; border: 0; border-radius: 8px; padding: 2px 6px; font: 700 12px sans-serif; }
  .leaflet-tooltip-top:before { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: false }).setView([17.6868, 83.2185], 13);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  let marker = null;
  let tip = null;
  window.showCab = function (lat, lng, label) {
    if (marker) map.removeLayer(marker);
    marker = L.circleMarker([lat, lng], {
      radius: 10, color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1
    }).addTo(map);
    tip = marker.bindTooltip(label || 'Your cab', { permanent: true, direction: 'top', className: 'tag', offset: [0, -8] });
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
    setTimeout(function () { map.invalidateSize(); }, 150);
  };
</script>
</body>
</html>`;

export function CustomerTripMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const webRef = useRef<WebView>(null);
  const ready = useRef(false);
  const point = useRef({ lat, lng, label });
  point.current = { lat, lng, label };

  const push = () => {
    if (!ready.current) return;
    const current = point.current;
    const safeLabel = JSON.stringify(current.label);
    webRef.current?.injectJavaScript(
      `window.showCab && window.showCab(${current.lat}, ${current.lng}, ${safeLabel}); true;`,
    );
  };

  useEffect(() => {
    push();
  }, [lat, lng, label]);

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        source={{ html: MAP_HTML, baseUrl: 'https://unpkg.com' }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        onLoadEnd={() => {
          ready.current = true;
          push();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  map: { flex: 1, backgroundColor: '#e2e8f0' },
});
