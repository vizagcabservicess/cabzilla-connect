/**
 * DriverTripDetailScreen - Trip detail for driver with Start/End Trip actions
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, Switch, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { driverTripsAPI } from '../services/driverTripsAPI';
import type { DriverTrip } from '../services/driverTripsAPI';
import { OdometerCaptureModal } from '../components/OdometerCaptureModal';
import {
  formatPassengerPhoneForDisplay,
  passengerPhoneToTelHref,
} from '../utils/passengerPhoneDisplay';
import { EndTripPaymentModal } from '../components/EndTripPaymentModal';

const TAB_BAR_HEIGHT = 56;

function formatAmount(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function formatServiceCategory(raw: string): string {
  const s = raw.replace(/[-_]+/g, ' ').trim();
  if (!s) return '—';
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const TRIP_CATEGORY_LABELS: Record<string, string> = {
  outstation: 'Outstation',
  local: 'Local',
  tour: 'Tour',
  airport: 'Airport transfer',
};

const TRIP_MODE_LABELS: Record<string, string> = {
  'one-way': 'One way',
  one_way: 'One way',
  oneway: 'One way',
  'round-trip': 'Round trip',
  round_trip: 'Round trip',
  roundtrip: 'Round trip',
};

function humanizeTripToken(raw: string): string {
  const k = raw.trim().toLowerCase();
  return TRIP_CATEGORY_LABELS[k] || TRIP_MODE_LABELS[k] || formatServiceCategory(raw);
}

function formatOdometerCapturedAt(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  }
  return raw.trim();
}

function odometerDisplayLine(km: number | undefined, at?: string | null): string | null {
  if (km == null || Number.isNaN(km)) return null;
  const t = formatOdometerCapturedAt(at ?? undefined);
  const kmStr = km.toLocaleString('en-IN');
  return t ? `${kmStr} km · ${t}` : `${kmStr} km`;
}

/** Service type (Outstation, Local, …) + mode; not the vehicle model (that is Vehicle type). */
function buildTripTypeDisplay(trip: DriverTrip): string {
  const cat = (trip.tripCategory || '').trim();
  const mode = (trip.tripMode || '').trim();
  if (!cat && !mode) return '—';
  const c = cat ? humanizeTripToken(cat) : '';
  const m = mode ? humanizeTripToken(mode) : '';
  if (c && c !== '—' && m && m !== '—') return `${c} · ${m}`;
  if (c && c !== '—') return c;
  if (m && m !== '—') return m;
  return '—';
}

export function DriverTripDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const paramTrip = params?.trip as DriverTrip | undefined;
  const scrollBottomPadding = insets.bottom + TAB_BAR_HEIGHT + 32;
  const [tripDetail, setTripDetail] = useState<DriverTrip | null>(paramTrip ?? null);
  const [status, setStatus] = useState<'assigned' | 'in_progress' | 'completed'>(
    (paramTrip?.status as 'assigned' | 'in_progress' | 'completed') ?? 'assigned'
  );
  const [loading, setLoading] = useState(false);
  const [odometerModal, setOdometerModal] = useState<'start' | 'end' | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const trackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trip = tripDetail ?? paramTrip;

  useFocusEffect(
    useCallback(() => {
      if (!trip?.id) return;
      let cancelled = false;
      (async () => {
        try {
          const t = await driverTripsAPI.getTripById(trip.id);
          if (!cancelled) {
            setTripDetail(t);
            setStatus(t.status);
          }
        } catch {
          /* keep cached trip */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [trip?.id])
  );

  if (!paramTrip && !tripDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.error}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.error}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  const currentStatus = status || trip.status;

  const formatDate = (d: string) => {
    if (!d) return '';
    const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return d;
  };

  const handleStartTrip = () => {
    setOdometerModal('start');
  };

  const handleEndTrip = () => {
    setOdometerModal('end');
  };

  const onOdometerSuccess = async () => {
    if (odometerModal === 'start') {
      setLoading(true);
      try {
        await driverTripsAPI.updateTripStatus(trip.id, 'in_progress');
        setStatus('in_progress');
        try {
          const t = await driverTripsAPI.getTripById(trip.id);
          setTripDetail(t);
        } catch {
          /* ignore */
        }
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start trip');
      } finally {
        setLoading(false);
      }
    } else if (odometerModal === 'end') {
      setOdometerModal(null);
      try {
        const t = await driverTripsAPI.getTripById(trip.id);
        setTripDetail(t);
      } catch {
        /* ignore */
      }
      setPaymentModalVisible(true);
    }
  };

  const onEndTripPaymentConfirm = async (collectedAmount: number, paymentType: string) => {
    setPaymentModalVisible(false);
    setLoading(true);
    try {
      await driverTripsAPI.updateTripStatus(trip.id, 'completed', { collectedAmount, paymentType });
      setStatus('completed');
      Alert.alert('Trip Completed', 'The trip has been marked as completed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end trip');
      setPaymentModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!liveTracking || currentStatus !== 'in_progress' || !trip?.id) return;
    const sendLocation = async () => {
      try {
        const { status: permStatus } = await Location.getForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          const { status: req } = await Location.requestForegroundPermissionsAsync();
          if (req !== 'granted') return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await driverTripsAPI.submitLocation(trip.id, loc.coords.latitude, loc.coords.longitude);
      } catch {
        // Ignore per-tick errors
      }
    };
    sendLocation();
    const id = setInterval(sendLocation, 20000);
    trackingIntervalRef.current = id;
    return () => {
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    };
  }, [liveTracking, currentStatus, trip?.id]);

  const callPassenger = () => {
    const href = passengerPhoneToTelHref(trip.passengerPhone, trip.passengerCountryCode);
    if (href) Linking.openURL(href).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>{trip.bookingNumber}</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        showsVerticalScrollIndicator={true}
      >
        <InfoRow icon="location" label="Pickup" value={trip.pickupLocation} />
        <InfoRow icon="navigate" label="Drop" value={trip.dropLocation || '—'} />
        <InfoRow icon="calendar" label="Date & Time" value={`${formatDate(trip.pickupDate)} ${trip.pickupTime}`} />
        <InfoRow icon="person" label="Passenger" value={trip.passengerName} />
        <View style={styles.row}>
          <Ionicons name="call" size={20} color={colors.gray500} style={styles.rowIcon} />
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Phone</Text>
            <TouchableOpacity onPress={callPassenger}>
              <Text style={[styles.rowValue, styles.link]}>
                {formatPassengerPhoneForDisplay(trip.passengerPhone, trip.passengerCountryCode) || '—'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <InfoRow icon="car" label="Vehicle" value={trip.vehicleNumber || '—'} />
        <InfoRow
          icon="speedometer-outline"
          label="Vehicle type"
          value={trip.vehicleType || trip.tripType || '—'}
        />
        <InfoRow icon="map-outline" label="Trip type" value={buildTripTypeDisplay(trip)} />
        <InfoRow icon="wallet" label="Trip Amount" value={formatAmount(trip.totalAmount ?? 0)} />
        {(trip.advancePaidAmount ?? 0) > 0 && (
          <InfoRow icon="card" label="Advance Amount" value={formatAmount(trip.advancePaidAmount ?? 0)} />
        )}
        <InfoRow icon="pricetag" label="Status" value={currentStatus.replace('_', ' ')} />
        {odometerDisplayLine(trip.startOdometer, trip.startOdometerAt) != null && (
          <InfoRow
            icon="speedometer-outline"
            label="Odometer (start)"
            value={odometerDisplayLine(trip.startOdometer, trip.startOdometerAt) ?? '—'}
            onPress={
              trip.startOdometerImageUrl && /^https?:\/\//i.test(trip.startOdometerImageUrl)
                ? () => Linking.openURL(trip.startOdometerImageUrl!).catch(() => {})
                : undefined
            }
          />
        )}
        {odometerDisplayLine(trip.endOdometer, trip.endOdometerAt) != null && (
          <InfoRow
            icon="speedometer-outline"
            label="Odometer (end)"
            value={odometerDisplayLine(trip.endOdometer, trip.endOdometerAt) ?? '—'}
            onPress={
              trip.endOdometerImageUrl && /^https?:\/\//i.test(trip.endOdometerImageUrl)
                ? () => Linking.openURL(trip.endOdometerImageUrl!).catch(() => {})
                : undefined
            }
          />
        )}

        {currentStatus === 'in_progress' && (
          <>
          <TouchableOpacity
            style={styles.fuelLinkBtn}
            onPress={() => navigation.navigate('FuelEntry', { bookingId: trip.id })}
          >
            <Ionicons name="water" size={20} color={colors.primary} />
            <Text style={styles.fuelLinkText}>Add Fuel for this Trip</Text>
          </TouchableOpacity>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>Live Tracking</Text>
            <Switch
              value={liveTracking}
              onValueChange={setLiveTracking}
              trackColor={{ false: colors.gray300, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          </>
        )}

        {currentStatus === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.startBtn, loading && styles.btnDisabled]}
            onPress={handleStartTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {currentStatus === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.endBtn, loading && styles.btnDisabled]}
            onPress={handleEndTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>End Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <OdometerCaptureModal
        visible={odometerModal !== null}
        onClose={() => setOdometerModal(null)}
        mode="trip"
        bookingId={trip.id}
        readingType={odometerModal === 'start' ? 'start' : 'end'}
        onSuccess={onOdometerSuccess}
      />
      <EndTripPaymentModal
        visible={paymentModalVisible}
        suggestedAmount={trip.totalAmount ?? 0}
        onConfirm={onEndTripPaymentConfirm}
        onCancel={() => setPaymentModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Ionicons name={icon as any} size={20} color={colors.gray500} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, onPress && styles.link]}>{value}</Text>
        {onPress ? (
          <Text style={[styles.rowHint, styles.link]}>Open photo</Text>
        ) : null}
      </View>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  scroll: { flex: 1 },
  content: { padding: 16 },
  error: { fontSize: 16, color: colors.gray600, textAlign: 'center', marginTop: 32 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: '#fff', padding: 12, borderRadius: 10 },
  rowIcon: { marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.gray600, marginBottom: 2 },
  rowValue: { fontSize: 15, color: colors.foreground },
  rowHint: { fontSize: 12, marginTop: 4 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
  },
  startBtn: { backgroundColor: '#16a34a' },
  endBtn: { backgroundColor: '#2563eb' },
  btnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  trackingLabel: { fontSize: 15, fontWeight: '500', color: colors.foreground },
  fuelLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    marginBottom: 16,
  },
  fuelLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
