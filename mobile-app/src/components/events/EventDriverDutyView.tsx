import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { compressImageForUpload } from '../../utils/compressImageForUpload';
import {
  billableDutyEnd,
  canCloseOdometer,
  dutyClosingTime,
  dutyStatusLabel,
  extractOdometerReading,
  fleetPhoto,
  formatDutyDuration,
  formatReportingTime,
  formatServerDateTime,
  formatServerTime,
  mapsUrl,
} from '../../lib/eventDutyFormat';
import { formatDutyDate, loadDriverMedia, mobileEventAPI, type DriverDuty, type DriverGps, type DriverPortalData, type UploadPart } from '../../services/eventDutyAPI';
import { fonts } from '../../theme/colors';

type TabId = 'details' | 'photos' | 'timeline' | 'map';
type CheckId = 'uniform' | 'towel' | 'vehicle';
type GpsFix = { lat: number; lng: number; accuracy: number | null };

const CHECKS: Array<{ id: CheckId; title: string; hint: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'uniform', title: 'White shirt uniform', hint: 'Wear a clean, neat white shirt', icon: 'shirt-outline' },
  { id: 'towel', title: 'White seat towel', hint: 'Place clean white towels on the seats', icon: 'layers-outline' },
  { id: 'vehicle', title: 'Vehicle ready', hint: 'Licence, Aadhaar and RC', icon: 'car-outline' },
];

const TABS: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'details', label: 'Details', icon: 'list' },
  { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'timeline', label: 'Time', icon: 'time' },
  { id: 'map', label: 'Map', icon: 'map' },
];

function supportDigits(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function finiteGps(gps?: DriverGps | null): { lat: number; lng: number; address?: string | null } | null {
  const lat = Number(gps?.lat);
  const lng = Number(gps?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, address: gps?.address };
}

function kmText(value?: number | null): string {
  return value == null ? '—' : Number(value).toLocaleString('en-IN');
}

function isParkingPrompt(duty: DriverDuty): boolean {
  return Boolean(
    duty.status === 'in_progress'
    && duty.openingAt
    && !duty.closingAt
    && duty.dutyPlace !== 'parking'
    && duty.parkingPromptNonce,
  );
}

async function captureOdometer(): Promise<UploadPart | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera', 'Allow camera access to take the odometer photo.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.85,
  });
  if (result.canceled || !result.assets[0]) return null;
  const uri = await compressImageForUpload(result.assets[0].uri);
  return { uri, name: `odometer-${Date.now()}.jpg`, type: 'image/jpeg' };
}

export function EventDriverDutyView({
  data,
  token,
  duty,
  manyDuties,
  onBackToList,
  onReload,
  onParked,
  onSeen,
}: {
  data: DriverPortalData;
  token: string;
  duty: DriverDuty;
  manyDuties: boolean;
  onBackToList: () => void;
  onReload: () => Promise<void> | void;
  onParked: (dutyId: number) => void;
  onSeen: (dutyId: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('details');
  const [mode, setMode] = useState<'start' | 'end' | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [parkingBusy, setParkingBusy] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState('');
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);
  const [alerts, setAlerts] = useState<'granted' | 'denied' | 'undetermined' | null>(null);

  const status = (duty.status || '').toLowerCase();
  const running = Boolean(duty.openingAt) && !duty.closingAt;
  const inProgress = status === 'in_progress' || running;
  const showStart = status === 'not_started' || status === 'scheduled' || Boolean(duty.needsOpeningReupload);
  const showEnd = (status === 'in_progress' && !duty.needsOpeningReupload) || Boolean(duty.needsClosingReupload);
  const openDuty = status === 'in_progress' && !duty.closingAt;
  const faceId = data.documents && !Array.isArray(data.documents) ? Number(data.documents.driver_photo?.id || 0) : 0;
  const mapGps = finiteGps(duty.openingGps) || finiteGps(duty.closingGps);
  const locationName = duty.openingGps?.address || duty.closingGps?.address || '—';
  const pickup = duty.reportingLocation || data.assignment.reportingLocation || data.event.reportingLocation || '—';
  const reportingTime = duty.reportingTime || data.assignment.reportingTime || data.event.defaultReportingTime || '';
  const support = data.event.supportMobile || '9966363662';
  const startedClock = formatServerTime(duty.openingAt);
  const totalTime = formatDutyDuration(duty.openingAt, billableDutyEnd(duty.closingAt, duty.endRequestedAt), now, duty.pausedSeconds) || '—';
  const promptKey = isParkingPrompt(duty) ? `${duty.id}:${duty.parkingPromptNonce}` : '';
  const showParkingPopup = Boolean(promptKey) && !mode && dismissedPrompt !== promptKey;
  const showParkingBar = Boolean(promptKey) && !mode && !showParkingPopup;
  const askedToEnd = Boolean(openDuty && duty.endRequestedAt && !mode);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    void Notifications.getPermissionsAsync().then((current) => {
      if (current.granted) setAlerts('granted');
      else if (current.status === 'denied') setAlerts('denied');
      else setAlerts('undetermined');
    }).catch(() => setAlerts('denied'));
  }, []);

  useEffect(() => {
    if (!askedToEnd || duty.endRequestSeenAt) return;
    let cancelled = false;
    void mobileEventAPI.ackEndNotice(token, duty.id).then(() => {
      if (!cancelled) onSeen(duty.id);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [askedToEnd, duty.endRequestSeenAt, duty.id, onSeen, token]);

  const markParking = async (dutyId: number) => {
    if (parkingBusy) return;
    setParkingBusy(true);
    try {
      await mobileEventAPI.markParking(token, dutyId);
      onParked(dutyId);
      Alert.alert('In Parking', 'Marked In Parking');
    } catch (err) {
      Alert.alert('In Parking', err instanceof Error ? err.message : 'Could not mark In Parking');
    } finally {
      setParkingBusy(false);
    }
  };

  const allowAlerts = async () => {
    const next = await Notifications.requestPermissionsAsync();
    setAlerts(next.granted ? 'granted' : 'denied');
  };

  const footerPad = Math.max(insets.bottom, 10);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {mode ? (
        <DutyCapture
          mode={mode}
          token={token}
          duty={duty}
          data={data}
          pickup={pickup}
          reportingTime={reportingTime}
          locationName={locationName}
          support={support}
          onClose={() => setMode(null)}
          onDone={async () => {
            setMode(null);
            await onReload();
          }}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {manyDuties ? (
              <TouchableOpacity style={styles.back} onPress={onBackToList}>
                <Ionicons name="chevron-back" size={18} color="#2563eb" />
                <Text style={styles.backText}>All duties</Text>
              </TouchableOpacity>
            ) : null}
            <Hero
              token={token}
              photoId={faceId}
              name={data.assignment.driverName || 'Driver'}
              mobile={data.assignment.driverMobile || ''}
              support={support}
              type={data.assignment.vehicleTypeLabel}
              number={duty.vehicleNumber || data.assignment.vehicleNumber || '—'}
              status={duty.status}
              inProgress={inProgress}
              since={startedClock}
              dateLabel={formatDutyDate(duty.dutyDate)}
              eventName={data.event.name}
            />
            {duty.needsOpeningReupload ? (
              <Text style={styles.reupload}>VTH asked you to take the opening odometer photo again.</Text>
            ) : null}
            {duty.needsClosingReupload ? (
              <Text style={styles.reupload}>VTH asked you to take the closing odometer photo again.</Text>
            ) : null}
            {showEnd && alerts === 'undetermined' ? (
              <TouchableOpacity style={styles.alertBtn} onPress={() => { void allowAlerts(); }}>
                <Text style={styles.alertTitle}>Allow duty alerts</Text>
                <Text style={styles.alertBody}>So a trip or end-duty message still reaches you if the app is in the background.</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.segment}>
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <TouchableOpacity key={item.id} style={[styles.seg, active && styles.segOn]} onPress={() => setTab(item.id)}>
                    <Ionicons name={item.icon} size={16} color={active ? '#2563eb' : '#94a3b8'} />
                    <Text style={[styles.segText, active && styles.segTextOn]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {tab === 'details' ? (
              <DetailsTab
                duty={duty}
                pickup={pickup}
                reportingTime={reportingTime}
                locationName={locationName}
                inProgress={inProgress}
                token={token}
                mapGps={mapGps}
                totalTime={totalTime}
                onPhoto={setPreview}
              />
            ) : null}
            {tab === 'photos' ? (
              <View style={styles.stack}>
                <PhotoCard title="Opening Photo" at={duty.openingAt} token={token} mediaId={duty.openingPhotoId} onPhoto={setPreview} />
                <PhotoCard title="Closing Photo" at={duty.closingAt} token={token} mediaId={duty.closingPhotoId} onPhoto={setPreview} />
              </View>
            ) : null}
            {tab === 'timeline' ? (
              <Timeline
                duty={duty}
                locationName={locationName}
                totalTime={totalTime}
              />
            ) : null}
            {tab === 'map' ? <MapTab gps={mapGps} label={locationName !== '—' ? locationName : pickup} /> : null}
          </ScrollView>
          {(showParkingBar || askedToEnd) ? (
            <View style={styles.bannerStack}>
              {showParkingBar ? (
                <TouchableOpacity style={styles.parkBar} disabled={parkingBusy} onPress={() => { void markParking(duty.id); }}>
                  <Text style={styles.parkBarText}>When you drop the guest, tap In Parking.</Text>
                  <Text style={styles.parkChip}>{parkingBusy ? '…' : 'In Parking'}</Text>
                </TouchableOpacity>
              ) : null}
              {askedToEnd ? (
                <View style={styles.endBar}>
                  <Text style={styles.endBarText}>
                    Please end your duty now. Time after {formatServerTime(duty.endRequestedAt)} is not counted.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {(showStart || showEnd) ? (
            <View style={[styles.footer, { paddingBottom: footerPad }]}>
              {showEnd ? (
                <TouchableOpacity style={styles.endBtn} onPress={() => setMode('end')}>
                  <Text style={styles.footerText}>End Duty</Text>
                </TouchableOpacity>
              ) : null}
              {showStart ? (
                <TouchableOpacity style={styles.startBtn} onPress={() => setMode('start')}>
                  <Text style={styles.footerText}>Start Duty</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </>
      )}
      {showParkingPopup ? (
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalKicker}>In Trip</Text>
            <Text style={styles.modalTitle}>You are on a trip</Text>
            <Text style={styles.modalBody}>When you drop the guest, tap In Parking. The event manager will see it on the vehicle list.</Text>
            <TouchableOpacity style={styles.parkBtn} disabled={parkingBusy} onPress={() => { void markParking(duty.id); }}>
              <Text style={styles.footerText}>{parkingBusy ? 'Saving…' : 'In Parking'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={parkingBusy} onPress={() => setDismissedPrompt(promptKey)}>
              <Text style={styles.dismiss}>Guest not dropped yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.previewWrap}>
          <TouchableOpacity onPress={() => setPreview(null)}><Text style={styles.previewClose}>Close</Text></TouchableOpacity>
          {preview ? <Image source={{ uri: preview.url }} style={styles.previewImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Hero({
  token, photoId, name, mobile, support, type, number, status, inProgress, since, dateLabel, eventName,
}: {
  token: string;
  photoId: number;
  name: string;
  mobile: string;
  support: string;
  type: string;
  number: string;
  status: string;
  inProgress: boolean;
  since: string;
  dateLabel: string;
  eventName: string;
}) {
  const [showVehicle, setShowVehicle] = useState(true);
  const done = status === 'completed';
  const tone = inProgress ? '#d97706' : done ? '#0284c7' : '#64748b';
  const wash = inProgress ? '#fffbeb' : done ? '#f0f9ff' : '#f8fafc';
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <DutyMedia token={token} mediaId={photoId} style={styles.face} fallback={<Text style={styles.faceLetter}>{name.slice(0, 1).toUpperCase()}</Text>} />
        <View style={styles.flex}>
          <Text style={styles.heroName} numberOfLines={2}>{name}</Text>
          <Text style={styles.heroMeta} numberOfLines={1}>{type}{number && number !== '—' ? `  ${number}` : ''}</Text>
          {mobile ? (
            <TouchableOpacity onPress={() => { void Linking.openURL(`tel:${mobile}`); }}>
              <Text style={styles.phone}>{mobile}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {showVehicle ? (
          <Image source={{ uri: fleetPhoto(type) }} style={styles.vehicleThumb} resizeMode="contain" onError={() => setShowVehicle(false)} />
        ) : null}
      </View>
      <View style={styles.heroActions}>
        <View style={[styles.statusBar, { backgroundColor: wash }]}>
          <Text style={[styles.statusText, { color: tone }]}>{dutyStatusLabel(status)}</Text>
          <Text style={styles.since}>{since ? `since ${since}` : dateLabel}</Text>
        </View>
        <View style={styles.supportRow}>
          <TouchableOpacity style={[styles.supportBtn, styles.whatsappBtn]} onPress={() => { void Linking.openURL(`https://wa.me/91${supportDigits(support)}`); }}>
            <Ionicons name="logo-whatsapp" size={16} color="#059669" />
            <Text style={styles.supportLabel}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.supportBtn, styles.callBtn]} onPress={() => { void Linking.openURL(`tel:+91${supportDigits(support)}`); }}>
            <Ionicons name="call" size={16} color="#2563eb" />
            <Text style={[styles.supportLabel, styles.callLabel]}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
      {eventName ? <Text style={styles.eventName} numberOfLines={1}>{eventName}</Text> : null}
    </View>
  );
}

function DetailsTab({
  duty, pickup, reportingTime, locationName, inProgress, token, mapGps, totalTime, onPhoto,
}: {
  duty: DriverDuty;
  pickup: string;
  reportingTime: string;
  locationName: string;
  inProgress: boolean;
  token: string;
  mapGps: { lat: number; lng: number } | null;
  totalTime: string;
  onPhoto: (photo: { url: string; title: string }) => void;
}) {
  const closing = dutyClosingTime(duty.closingAt, duty.endRequestedAt);
  const fields: Array<{ label: string; value: string; accent?: string }> = [
    { label: 'Pickup location', value: pickup },
    { label: 'Reporting time', value: formatReportingTime(reportingTime) || reportingTime || '—' },
    { label: 'Reporting location', value: pickup },
    { label: 'Location name', value: locationName },
    { label: 'Duty status', value: inProgress ? 'Duty in progress' : dutyStatusLabel(duty.status), accent: inProgress ? '#059669' : undefined },
    { label: 'Started at', value: formatServerDateTime(duty.openingAt) },
    { label: 'Closing time', value: formatServerDateTime(closing) },
    { label: 'Odometer uploaded', value: formatServerDateTime(duty.closingAt) },
    { label: 'Opening KM', value: kmText(duty.openingKm) },
    { label: 'Closing KM', value: kmText(duty.closingKm) },
    { label: 'Total KM', value: kmText(duty.totalKm) },
    { label: 'Total time', value: totalTime },
  ];
  return (
    <View style={styles.stack}>
      <View style={styles.fieldCard}>
        {fields.map((field) => (
          <Field key={field.label} label={field.label} value={field.value} accent={field.accent} />
        ))}
      </View>
      {(duty.openingPhotoId || mapGps) ? (
        <View style={styles.cardPad}>
          <View style={styles.photoHead}>
            <View style={styles.dateLeft}>
              <Ionicons name="camera-outline" size={16} color="#3b82f6" />
              <Text style={styles.photoTitle}>Opening Photo</Text>
            </View>
            <Text style={styles.photoTime}>{formatServerDateTime(duty.openingAt)}</Text>
          </View>
          <View style={styles.photoGrid}>
            <DutyMedia
              token={token}
              mediaId={duty.openingPhotoId}
              style={styles.photo}
              boxStyle={styles.photoBox}
              onOpen={(url) => onPhoto({ url, title: 'Opening odometer' })}
              emptyLabel="No photo"
            />
            {mapGps ? (
              <TouchableOpacity style={styles.mapLink} onPress={() => { void Linking.openURL(mapsUrl(mapGps.lat, mapGps.lng)); }}>
                <Ionicons name="map-outline" size={16} color="#2563eb" />
                <Text style={styles.mapLinkText}>View on Map</Text>
              </TouchableOpacity>
            ) : <View style={styles.photoBox}><Text style={styles.empty}>No GPS</Text></View>}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, accent ? { color: accent } : null]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

function PhotoCard({
  title, at, token, mediaId, onPhoto,
}: {
  title: string;
  at?: string | null;
  token: string;
  mediaId?: number | null;
  onPhoto: (photo: { url: string; title: string }) => void;
}) {
  return (
    <View style={styles.cardPad}>
      <View style={styles.photoHead}>
        <Text style={styles.photoTitle}>{title}</Text>
        <Text style={styles.photoTime}>{at ? formatServerDateTime(at) : '—'}</Text>
      </View>
      <DutyMedia
        token={token}
        mediaId={mediaId}
        style={styles.bigPhoto}
        resizeMode="contain"
        onOpen={(url) => onPhoto({ url, title })}
        emptyLabel="Not uploaded yet"
      />
    </View>
  );
}

function DutyMedia({
  token, mediaId, style, boxStyle, resizeMode, onOpen, fallback, emptyLabel,
}: {
  token: string;
  mediaId?: number | null;
  style: StyleProp<ImageStyle>;
  boxStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
  onOpen?: (uri: string) => void;
  fallback?: ReactNode;
  emptyLabel?: string;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'miss'>(mediaId ? 'loading' : 'miss');

  useEffect(() => {
    if (!mediaId) {
      setUri(null);
      setPhase('miss');
      return;
    }
    let cancelled = false;
    setPhase('loading');
    void loadDriverMedia(token, mediaId).then((next) => {
      if (cancelled) return;
      setUri(next);
      setPhase(next ? 'ready' : 'miss');
    });
    return () => { cancelled = true; };
  }, [token, mediaId]);

  if (phase === 'loading') {
    return <View style={[boxStyle || styles.face, styles.mediaWait]}><ActivityIndicator color="#2563eb" /></View>;
  }
  if (uri) {
    const image = <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
    if (!onOpen) return image;
    return <TouchableOpacity style={boxStyle} onPress={() => onOpen(uri)}>{image}</TouchableOpacity>;
  }
  if (fallback) return <View style={[styles.face, styles.faceFallback, boxStyle]}>{fallback}</View>;
  return <View style={[styles.photoMissing, boxStyle]}><Text style={styles.empty}>{emptyLabel || 'No photo'}</Text></View>;
}

function Timeline({ duty, locationName, totalTime }: { duty: DriverDuty; locationName: string; totalTime: string }) {
  const closing = dutyClosingTime(duty.closingAt, duty.endRequestedAt);
  const items: Array<{ title: string; detail: string }> = [
    { title: 'Duty date', detail: formatDutyDate(duty.dutyDate) },
  ];
  if (duty.openingAt) items.push({ title: 'Duty started', detail: formatServerDateTime(duty.openingAt) });
  if (duty.openingKm != null) items.push({ title: 'Opening KM', detail: kmText(duty.openingKm) });
  if (locationName && locationName !== '—') items.push({ title: 'Reporting location', detail: locationName });
  if (closing) items.push({ title: 'Closing time', detail: formatServerDateTime(closing) });
  if (duty.closingAt) items.push({ title: 'Odometer uploaded', detail: formatServerDateTime(duty.closingAt) });
  if (duty.totalKm != null) items.push({ title: 'Total KM', detail: kmText(duty.totalKm) });
  items.push({ title: 'Total time', detail: totalTime });
  return (
    <View style={styles.cardPad}>
      {items.map((item) => (
        <View key={item.title} style={styles.timeItem}>
          <View style={styles.timeDot} />
          <Text style={styles.timeTitle}>{item.title}</Text>
          <Text style={styles.timeDetail}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

function MapTab({ gps, label }: { gps: { lat: number; lng: number } | null; label: string }) {
  return (
    <View style={styles.card}>
      {gps ? <PinMap lat={gps.lat} lng={gps.lng} /> : <View style={styles.mapEmpty}><Text style={styles.empty}>Waiting for GPS</Text></View>}
      <Text style={styles.mapCaption}>{label || 'Waiting for GPS'}</Text>
    </View>
  );
}

function PinMap({ lat, lng }: { lat: number; lng: number }) {
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity style={styles.mapEmpty} onPress={() => { void Linking.openURL(mapsUrl(lat, lng)); }}>
        <Text style={styles.mapLinkText}>View on Map</Text>
      </TouchableOpacity>
    );
  }
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;height:100%;background:#e2e8f0}</style></head><body><div id="map"></div><script>
const map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
L.circleMarker([${lat},${lng}],{radius:9,color:'#fff',weight:2,fillColor:'#2563eb',fillOpacity:1}).addTo(map);
</script></body></html>`;
  return (
    <View style={styles.mapFrame}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.mapWeb} />
      <TouchableOpacity style={styles.mapFloat} onPress={() => { void Linking.openURL(mapsUrl(lat, lng)); }}>
        <Ionicons name="map-outline" size={12} color="#2563eb" />
        <Text style={styles.mapFloatText}>View on Map</Text>
      </TouchableOpacity>
    </View>
  );
}

function DutyCapture({
  mode, token, duty, data, pickup, reportingTime, locationName, support, onClose, onDone,
}: {
  mode: 'start' | 'end';
  token: string;
  duty: DriverDuty;
  data: DriverPortalData;
  pickup: string;
  reportingTime: string;
  locationName: string;
  support: string;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const insets = useSafeAreaInsets();
  const starting = mode === 'start';
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({ uniform: false, towel: false, vehicle: false });
  const [photo, setPhoto] = useState<UploadPart | null>(null);
  const [km, setKm] = useState('');
  const [ocr, setOcr] = useState<number | null>(null);
  const [ocrState, setOcrState] = useState<'idle' | 'reading' | 'found' | 'missed'>('idle');
  const [gps, setGps] = useState<GpsFix | null>(null);
  const [busy, setBusy] = useState(false);
  const missing = CHECKS.filter((item) => !checks[item.id]);
  const ready = Boolean(photo) && (starting ? missing.length === 0 : true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!cancelled) setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    })();
    return () => { cancelled = true; };
  }, []);

  const takePhoto = async () => {
    const next = await captureOdometer();
    if (!next) return;
    setPhoto(next);
    setOcrState('reading');
    setOcr(null);
    try {
      const res = await mobileEventAPI.driverOcr(token, next);
      const reading = extractOdometerReading(res.text) ?? (res.reading ?? null);
      if (reading) {
        setOcr(reading);
        setKm(String(reading));
        setOcrState('found');
      } else {
        setOcrState('missed');
      }
    } catch {
      setOcrState('missed');
    }
  };

  const readGps = async (): Promise<GpsFix | null> => {
    if (gps) return gps;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    setGps(fix);
    return fix;
  };

  const submit = async () => {
    const photoLabel = starting ? 'opening odometer photo' : 'closing odometer photo';
    if (starting && missing.length && !photo) {
      Alert.alert('Start duty', 'Please accept all the checks and take the odometer photo.');
      return;
    }
    if (starting && missing.length) {
      const names = missing.map((item) => item.title.toLowerCase()).join(', ');
      Alert.alert('Start duty', missing.length === CHECKS.length
        ? 'Please accept all the checks before starting duty.'
        : `Please accept: ${names}.`);
      return;
    }
    if (!photo) {
      Alert.alert('Odometer', `Please take the ${photoLabel}.`);
      return;
    }
    const reading = Number(km);
    if (!reading) {
      Alert.alert('Odometer', 'Enter the kilometres shown on the odometer');
      return;
    }
    if (!starting && duty.openingKm != null && !canCloseOdometer(duty.openingKm, reading)) {
      Alert.alert('Odometer', 'Closing KM cannot normally be lower than opening KM. Contact VTH if this is an error.');
      return;
    }
    const fix = await readGps();
    if (data.gpsRequired && !fix) {
      Alert.alert('Location', 'Location permission is required for this event.');
      return;
    }
    const fields: Record<string, string> = {
      dutyId: String(duty.id),
      [starting ? 'openingKm' : 'closingKm']: String(reading),
    };
    if (fix) {
      fields.lat = String(fix.lat);
      fields.lng = String(fix.lng);
      if (fix.accuracy != null) fields.accuracy = String(fix.accuracy);
    }
    setBusy(true);
    try {
      if (starting) await mobileEventAPI.driverStartDuty(token, fields, photo);
      else await mobileEventAPI.driverEndDuty(token, fields, photo);
      Alert.alert('Duty', starting ? 'Duty started' : 'Duty completed');
      await onDone();
    } catch (err) {
      Alert.alert('Duty', err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const reportBy = formatReportingTime(reportingTime) || reportingTime;
  const steps: Array<{ label: string; state: 'done' | 'now' | 'later' }> = starting
    ? [{ label: 'Checks', state: 'now' }, { label: 'Start', state: 'later' }, { label: 'End', state: 'later' }]
    : [{ label: 'Checks', state: 'done' }, { label: 'Start', state: 'done' }, { label: 'End', state: 'now' }];
  const summary: Array<{ label: string; value: string }> = [
    { label: 'Date', value: formatDutyDate(duty.dutyDate) },
    { label: 'Event', value: data.event.name || '—' },
    { label: 'Pickup location', value: pickup || '—' },
    { label: 'Report by', value: reportBy || '—' },
    { label: 'Reporting location', value: pickup || '—' },
    { label: 'Location name', value: locationName && locationName !== '—' ? locationName : 'Not provided' },
  ];
  return (
    <View style={styles.flex}>
      <View style={styles.captureBar}>
        <TouchableOpacity onPress={onClose} style={styles.captureBack} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.captureTitle}>{starting ? 'Start duty' : 'End duty'}</Text>
        <TouchableOpacity onPress={() => { void Linking.openURL(`tel:${support}`); }} style={styles.captureBack} accessibilityLabel="Call support">
          <Ionicons name="call" size={18} color="#059669" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.stepRow}>
          {steps.map((step) => (
            <View key={step.label} style={styles.stepItem}>
              <View style={[styles.stepDot, step.state === 'later' ? styles.stepLater : styles.stepNow]} />
              <Text style={[styles.stepText, step.state === 'now' && styles.stepTextNow]}>{step.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.captureLead}>{data.assignment.vehicleTypeLabel} · {duty.vehicleNumber || data.assignment.vehicleNumber}</Text>
        {starting ? (
          <View style={styles.stack}>
            <Text style={styles.section}>Before you go</Text>
            {CHECKS.map((item) => {
              const on = checks[item.id];
              return (
                <TouchableOpacity key={item.id} style={styles.check} onPress={() => setChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}>
                  <View style={[styles.checkMark, on && styles.checkMarkOn]}>
                    {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.checkTitle}>{item.title}</Text>
                    <Text style={styles.muted}>{item.hint}</Text>
                  </View>
                  <Ionicons name={item.icon} size={18} color="#94a3b8" />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.captureSub}>Photograph the odometer, then confirm the closing kilometres.</Text>
        )}
        <Text style={styles.section}>{starting ? 'Opening kilometres' : 'Closing kilometres'}</Text>
        <TouchableOpacity style={styles.shutter} onPress={() => { void takePhoto(); }}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.odoPreview} />
          ) : (
            <View style={styles.shutterEmpty}>
              <Ionicons name="camera" size={28} color="#2563eb" />
              <Text style={styles.shutterText}>Take odometer photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {photo ? (
          <TouchableOpacity onPress={() => { void takePhoto(); }}>
            <Text style={styles.retake}>Retake photo</Text>
          </TouchableOpacity>
        ) : null}
        {ocrState === 'reading' ? <Text style={styles.ocrLine}>Reading the photo…</Text> : null}
        {ocrState === 'found' && ocr != null ? <Text style={styles.ocrLine}>Read {ocr.toLocaleString('en-IN')} km. You can edit it.</Text> : null}
        {ocrState === 'missed' ? <Text style={styles.ocrLine}>Type the kilometres from the photo.</Text> : null}
        <TextInput
          value={km}
          onChangeText={(value) => setKm(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          placeholder="Kilometres"
          placeholderTextColor="#94a3b8"
          style={styles.kmInput}
        />
        <View style={styles.fieldCard}>
          {summary.map((field) => (
            <Field key={field.label} label={field.label} value={field.value} />
          ))}
        </View>
        <Text style={styles.noteText}>Start and end odometer photos are required. A missing reading can change the kilometre total.</Text>
        {data.gpsRequired && !gps ? <Text style={styles.waitGps}>Waiting for location…</Text> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity style={[styles.flowBtn, ready ? styles.flowReady : styles.flowLocked]} disabled={busy} onPress={() => { void submit(); }}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={[styles.footerText, !ready && styles.flowLockedText]}>{starting ? 'Start duty' : 'End duty'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f3f6fb' },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 28, gap: 12 },
  stack: { gap: 8 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 15 },
  hero: { backgroundColor: '#fff', borderRadius: 20, padding: 14, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroName: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 20 },
  heroMeta: { marginTop: 2, color: '#475569', fontFamily: fonts.medium, fontSize: 14 },
  vehicleThumb: { width: 72, height: 48 },
  heroActions: { gap: 8 },
  supportRow: { flexDirection: 'row', gap: 8 },
  supportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  whatsappBtn: { backgroundColor: '#ecfdf5' },
  callBtn: { backgroundColor: '#eff6ff' },
  supportLabel: { color: '#059669', fontFamily: fonts.semiBold, fontSize: 14 },
  callLabel: { color: '#2563eb' },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  fieldCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { flexGrow: 1, flexBasis: '46%', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  fieldLabel: { color: '#64748b', fontFamily: fonts.medium, fontSize: 11 },
  fieldValue: { marginTop: 3, color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 14 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepItem: { flex: 1, gap: 6 },
  stepDot: { height: 4, borderRadius: 2 },
  stepNow: { backgroundColor: '#2563eb' },
  stepLater: { backgroundColor: '#dbe3ee' },
  stepText: { fontFamily: fonts.semiBold, fontSize: 12, color: '#94a3b8' },
  stepTextNow: { color: '#2563eb' },
  noteText: { color: '#92400e', backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  eventName: { color: '#64748b', fontFamily: fonts.medium, fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: '#e8eef6', borderRadius: 14, padding: 4 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 10, paddingVertical: 8 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontSize: 11, color: '#94a3b8', fontFamily: fonts.semiBold },
  segTextOn: { color: '#2563eb' },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  cardPad: { backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  face: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e2e8f0' },
  mediaWait: { alignItems: 'center', justifyContent: 'center' },
  faceFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  faceLetter: { fontFamily: fonts.bold, color: '#1d4ed8', fontSize: 20 },
  phone: { marginTop: 2, color: '#2563eb', fontFamily: fonts.medium, fontSize: 14 },
  muted: { color: '#64748b', fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  since: { color: '#64748b', fontFamily: fonts.medium, fontSize: 13 },
  reupload: { textAlign: 'center', color: '#b45309', fontFamily: fonts.medium, fontSize: 12 },
  alertBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  alertTitle: { fontFamily: fonts.semiBold, color: '#1e293b', fontSize: 14 },
  alertBody: { marginTop: 2, color: '#64748b', fontFamily: fonts.regular, fontSize: 12 },
  dateLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  photoTitle: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 14 },
  photoTime: { color: '#94a3b8', fontSize: 11, fontFamily: fonts.regular },
  photoGrid: { flexDirection: 'row', gap: 8 },
  photoBox: { flex: 1, height: 112, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  bigPhoto: { width: '100%', height: 208, backgroundColor: '#f8fafc', borderRadius: 12 },
  photoMissing: { height: 112, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#94a3b8', fontFamily: fonts.regular, fontSize: 12 },
  mapLink: { flex: 1, height: 112, borderRadius: 12, backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', gap: 4 },
  mapLinkText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 12 },
  timeItem: { borderLeftWidth: 2, borderLeftColor: '#dbeafe', paddingLeft: 14, paddingBottom: 14, marginLeft: 6 },
  timeDot: { position: 'absolute', left: -7, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' },
  timeTitle: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontFamily: fonts.medium },
  timeDetail: { color: '#1e293b', fontFamily: fonts.medium, fontSize: 14, marginTop: 2 },
  mapFrame: { height: 288 },
  mapWeb: { flex: 1, backgroundColor: '#e2e8f0' },
  mapEmpty: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  mapCaption: { paddingHorizontal: 14, paddingVertical: 12, color: '#475569', fontFamily: fonts.regular, fontSize: 14 },
  mapFloat: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  mapFloatText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 10 },
  bannerStack: { paddingHorizontal: 16, gap: 8, paddingTop: 4 },
  parkBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  parkBarText: { flex: 1, color: '#fff', fontFamily: fonts.semiBold, fontSize: 13 },
  parkChip: { backgroundColor: '#fff', color: '#d97706', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4, fontFamily: fonts.bold, fontSize: 11 },
  endBar: { backgroundColor: '#f59e0b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  endBarText: { color: '#fff', textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 13 },
  footer: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', gap: 10 },
  endBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  startBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  footerText: { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },
  modalWrap: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  modalKicker: { color: '#2563eb', fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  modalTitle: { marginTop: 4, fontFamily: fonts.bold, fontSize: 18, color: '#0f172a' },
  modalBody: { marginTop: 8, color: '#475569', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  parkBtn: { marginTop: 16, height: 48, borderRadius: 12, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  dismiss: { textAlign: 'center', marginTop: 12, color: '#64748b', fontFamily: fonts.semiBold, paddingVertical: 8 },
  previewWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 16 },
  previewClose: { color: '#fff', fontFamily: fonts.semiBold, marginBottom: 12 },
  previewImage: { width: '100%', height: '70%', backgroundColor: '#fff', borderRadius: 12 },
  captureBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  captureBack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  captureTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 17, color: '#0f172a' },
  captureLead: { fontFamily: fonts.bold, fontSize: 22, color: '#0f172a' },
  captureSub: { color: '#64748b', fontFamily: fonts.regular, fontSize: 14, marginTop: -4 },
  section: { marginTop: 8, fontFamily: fonts.bold, fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14 },
  checkMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkMarkOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkTitle: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 16 },
  shutter: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', minHeight: 180 },
  shutterEmpty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  shutterText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 16 },
  retake: { textAlign: 'center', color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 15 },
  ocrLine: { color: '#64748b', fontFamily: fonts.regular, fontSize: 13 },
  odoPreview: { height: 200, width: '100%' },
  kmInput: { height: 56, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, fontSize: 28, fontFamily: fonts.bold, color: '#0f172a' },
  waitGps: { textAlign: 'center', color: '#94a3b8', fontFamily: fonts.regular, fontSize: 12 },
  flowBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  flowReady: { backgroundColor: '#2f6bff' },
  flowLocked: { backgroundColor: '#d6e6ff' },
  flowLockedText: { color: '#7eabf5' },
});
