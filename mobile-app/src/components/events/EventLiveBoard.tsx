import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EventDateButton } from './EventDateButton';
import { EventTrackMap } from './EventTrackMap';
import { mobileEventAPI, type EventSharePayload, type ShareVehicle, type TrackVehicle } from '../../services/eventDutyAPI';
import { fonts } from '../../theme/colors';

type Chip = 'all' | 'trip' | 'parking' | 'completed' | 'pending';

function placeOf(row: ShareVehicle): 'trip' | 'parking' {
  return row.dutyPlace === 'parking' ? 'parking' : 'trip';
}

function isOpenDuty(row: ShareVehicle): boolean {
  return row.status === 'in_progress' && Boolean(row.openingAt) && !row.closingAt;
}

function chipOf(row: ShareVehicle): Exclude<Chip, 'all'> {
  if (row.status === 'completed' || row.closingAt) return 'completed';
  if (isOpenDuty(row)) return placeOf(row);
  return 'pending';
}

function formatWhen(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function parseIsoDate(iso?: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function shortDay(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso.slice(8);
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function EventLiveBoard({
  token,
  eventId,
  title,
  startDate,
  endDate,
}: {
  token?: string;
  eventId?: number;
  title?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [view, setView] = useState<EventSharePayload | null>(null);
  const [tracks, setTracks] = useState<TrackVehicle[]>([]);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [chip, setChip] = useState<Chip>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  const load = useCallback(async (nextDate?: string, quiet = false) => {
    if (!token && !eventId) return;
    if (!quiet) setLoading(true);
    try {
      const jobs: Array<Promise<void>> = [];
      if (eventId) {
        jobs.push(mobileEventAPI.listTracking(eventId, nextDate).then(setTracks));
      } else if (token) {
        jobs.push(mobileEventAPI.fetchTracking(token, nextDate).then(setTracks).catch(() => setTracks([])));
      }
      if (token) {
        jobs.push(mobileEventAPI.fetchShare(token, nextDate).then((share) => {
          setView(share);
          setDate(share.selectedDate || nextDate);
        }));
      }
      await Promise.all(jobs);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this event');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, token]);

  useEffect(() => {
    if (date || !startDate) return;
    setDate(startDate);
  }, [date, startDate]);

  useEffect(() => {
    if (!date && eventId && startDate) return;
    void load(date);
    const id = setInterval(() => { void load(date, true); }, 15000);
    return () => clearInterval(id);
  }, [date, eventId, load, startDate]);

  const trackByDuty = useMemo(() => {
    const map = new Map<number, TrackVehicle>();
    for (const row of tracks) map.set(row.dutyId, row);
    return map;
  }, [tracks]);

  const rows = useMemo(() => {
    const vehicles = view?.vehicles ?? [];
    if (chip === 'all') return vehicles;
    return vehicles.filter((row) => chipOf(row) === chip);
  }, [chip, view]);

  const askTrip = async (row: ShareVehicle) => {
    if (!token || !row.dutyId) return;
    setBusyId(row.dutyId);
    try {
      await mobileEventAPI.askInTrip(token, row.dutyId);
      Alert.alert('Driver asked', 'When the guest is dropped, the driver taps In Parking.');
      await load(date, true);
    } catch (err) {
      Alert.alert('Could not alert the driver', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const askEnd = async (row: ShareVehicle) => {
    if (!token || !row.dutyId) return;
    setBusyId(row.dutyId);
    try {
      await mobileEventAPI.askEndDuty(token, row.dutyId);
      Alert.alert('Driver asked', 'The driver was asked to end the duty.');
      await load(date, true);
    } catch (err) {
      Alert.alert('Could not alert the driver', err instanceof Error ? err.message : 'Try again');
    } finally {
      setBusyId(null);
    }
  };

  const revokeEnd = (row: ShareVehicle) => {
    if (!token || !row.dutyId) return;
    const dutyId = row.dutyId;
    Alert.alert(
      'Revoke end request?',
      'This trip stays open, and time after the request counts again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setBusyId(dutyId);
            void mobileEventAPI.revokeEndDuty(token, dutyId)
              .then(async () => {
                Alert.alert('End request revoked', 'This trip stays open and time is counting again.');
                await load(date, true);
              })
              .catch((err: unknown) => {
                Alert.alert('Could not revoke', err instanceof Error ? err.message : 'Try again');
              })
              .finally(() => setBusyId(null));
          },
        },
      ],
    );
  };

  if (loading && !view && tracks.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const stats = view?.stats;
  const chips: Array<{ id: Chip; label: string }> = [
    { id: 'all', label: `All ${stats?.totalVehicles ?? 0}` },
    { id: 'trip', label: 'In Trip' },
    { id: 'parking', label: 'In Parking' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending' },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(date, true); }} />}
    >
      <Text style={styles.title}>{title || view?.event.name || 'Live tracking'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.datePick}>
        <EventDateButton
          label="Tracking date"
          value={date || startDate || ''}
          minimumDate={parseIsoDate(startDate)}
          maximumDate={parseIsoDate(endDate)}
          onChange={setDate}
        />
      </View>
      <EventTrackMap vehicles={tracks} focusId={focusId} onSelect={setFocusId} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
        {(view?.dates ?? []).map((day) => (
          <TouchableOpacity key={day} style={[styles.dateChip, day === date && styles.dateChipOn]} onPress={() => setDate(day)}>
            <Text style={[styles.dateText, day === date && styles.dateTextOn]}>{shortDay(day)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
        {chips.map((item) => (
          <TouchableOpacity key={item.id} style={[styles.dateChip, chip === item.id && styles.dateChipOn]} onPress={() => setChip(item.id)}>
            <Text style={[styles.dateText, chip === item.id && styles.dateTextOn]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {rows.map((row) => {
        const track = row.dutyId ? trackByDuty.get(row.dutyId) : undefined;
        const open = isOpenDuty(row);
        const place = placeOf(row);
        return (
          <View key={`${row.dutyId ?? row.vehicleNumber}-${row.dutySlipNo}`} style={[styles.card, focusId === row.dutyId && styles.cardOn]}>
            <TouchableOpacity style={styles.cardTop} onPress={() => { if (row.dutyId) setFocusId(row.dutyId); }}>
              <Text style={styles.vehicle}>{row.vehicleNumber || 'Vehicle'}</Text>
              <Text style={[styles.pill, place === 'parking' ? styles.pillPark : styles.pillTrip]}>
                {open ? (place === 'parking' ? 'In Parking' : 'In Trip') : row.status.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.meta}>{row.driverName || 'Driver'}{row.driverMobile ? ` · ${row.driverMobile}` : ''}</Text>
            <Text style={styles.meta}>{row.vehicleType}{row.dutySlipNo ? ` · ${row.dutySlipNo}` : ''}</Text>
            {row.totalKm != null ? <Text style={styles.meta}>{row.totalKm} km</Text> : null}
            {track?.address || track?.lastGpsAt ? (
              <Text style={styles.gps}>
                {track.address || 'Location shared'}
                {track.lastGpsAt ? ` · ${formatWhen(track.lastGpsAt)}` : ''}
                {track.accuracy ? ` · ±${Math.round(track.accuracy)} m` : ''}
              </Text>
            ) : null}
            {row.parkingAsked && place === 'trip' ? <Text style={styles.asked}>Driver asked to tap In Parking</Text> : null}
            {open && row.dutyId ? (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.primary} disabled={busyId === row.dutyId} onPress={() => { void askTrip(row); }}>
                  <Text style={styles.primaryText}>{place === 'trip' ? 'Ask In Parking' : 'In Trip'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} disabled={busyId === row.dutyId} onPress={() => { void askEnd(row); }}>
                  <Text style={styles.secondaryText}>{row.endRequestedAt ? 'Remind to end' : 'Ask to end'}</Text>
                </TouchableOpacity>
                {row.endRequestedAt ? (
                  <TouchableOpacity style={styles.secondary} disabled={busyId === row.dutyId} onPress={() => revokeEnd(row)}>
                    <Text style={styles.secondaryText}>Revoke end</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
      {!view && tracks.map((row) => (
        <TouchableOpacity key={row.dutyId} style={[styles.card, focusId === row.dutyId && styles.cardOn]} onPress={() => setFocusId(row.dutyId)}>
          <Text style={styles.vehicle}>{row.vehicleNumber || 'Vehicle'}</Text>
          <Text style={styles.meta}>{row.driverName || 'Driver'}{row.driverMobile ? ` · ${row.driverMobile}` : ''}</Text>
          <Text style={styles.gps}>{row.address || (row.lat != null ? 'Location shared' : 'Waiting for phone GPS')}</Text>
        </TouchableOpacity>
      ))}
      {rows.length === 0 && tracks.length === 0 ? <Text style={styles.empty}>No vehicles for this date.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontFamily: fonts.bold, color: '#0f172a', marginBottom: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  datePick: { marginBottom: 8 },
  dateRow: { marginBottom: 8 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0', marginRight: 8 },
  dateChipOn: { backgroundColor: '#2563eb' },
  dateText: { color: '#334155', fontSize: 13, fontFamily: fonts.bold },
  dateTextOn: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardOn: { borderColor: '#2563eb' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  vehicle: { fontSize: 16, fontFamily: fonts.bold, color: '#0f172a', flex: 1 },
  pill: { fontSize: 12, fontFamily: fonts.bold, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  pillTrip: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  pillPark: { backgroundColor: '#fef3c7', color: '#92400e' },
  meta: { color: '#475569', marginTop: 4 },
  gps: { color: '#0f766e', marginTop: 6, fontSize: 13 },
  asked: { color: '#b45309', marginTop: 6, fontSize: 13, fontFamily: fonts.bold },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primary: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  primaryText: { color: '#fff', fontFamily: fonts.bold },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  secondaryText: { color: '#0f172a', fontFamily: fonts.bold },
  empty: { color: '#64748b', marginTop: 20, textAlign: 'center' },
});
