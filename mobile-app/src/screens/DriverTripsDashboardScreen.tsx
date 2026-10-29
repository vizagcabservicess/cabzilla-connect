import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import type { DriverDashboardTrip, DriverFuelRecord, TripStatus } from '../types/driverDashboard';
import { shareBookingDutySlip } from '../lib/bookingDutySlip';
import type { DriverTrip } from '../services/driverTripsAPI';

type ListFilter = '' | 'assigned' | 'in_progress' | 'completed';

const STATS: Array<{
  key: ListFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  iconBackground: string;
}> = [
  { key: 'assigned', label: 'Assigned', icon: 'document-text', color: '#2563eb', background: '#eef4ff', iconBackground: '#dbeafe' },
  { key: 'in_progress', label: 'In Progress', icon: 'play', color: '#d97706', background: '#fff7ed', iconBackground: '#ffedd5' },
  { key: 'completed', label: 'Completed', icon: 'checkmark', color: '#16a34a', background: '#f0fdf4', iconBackground: '#dcfce7' },
  { key: '', label: 'Cancelled', icon: 'close', color: '#dc2626', background: '#fef2f2', iconBackground: '#fee2e2' },
];

function toDriverTrip(item: DriverDashboardTrip): DriverTrip {
  const pickupDateStr = item.startTime ? String(item.startTime) : '';
  let pickupTime = '';
  const timeMatch = pickupDateStr.match(/(\d{1,2}:\d{2})/);
  if (timeMatch) pickupTime = timeMatch[1];
  const cab = (item.cabType ?? '').trim();
  const svc = (item.tripType ?? '').trim();
  const mode = (item.tripMode ?? '').trim();
  const vehicleType = cab || '—';
  return {
    id: item.tripId,
    bookingNumber: item.tripCode,
    pickupLocation: item.pickupLocation,
    dropLocation: item.dropLocation,
    pickupDate: pickupDateStr,
    pickupTime,
    returnDate: item.returnDate ?? null,
    passengerName: item.passengerName ?? '',
    passengerPhone: item.passengerPhone ?? '',
    passengerEmail: '',
    vehicleNumber: item.vehicleNumber ?? '',
    vehicleType,
    tripCategory: svc || undefined,
    tripMode: mode || undefined,
    tripType: vehicleType,
    totalAmount: item.tripAmount,
    advancePaidAmount: item.advancePaidAmount ?? 0,
    driverCollectedAmount: item.driverCollectedAmount ?? null,
    paymentType: item.paymentType ?? null,
    extraCollectedAmount: item.extraCollectedAmount ?? null,
    extraCollectedCategory: item.extraCollectedCategory ?? null,
    status: item.status,
    driverCollectsPayment: item.driverCollectsPayment !== false,
    additionalRequirements: item.additionalRequirements ?? null,
    pickupMapUrl: item.pickupMapUrl,
    pickupLat: item.pickupLat,
    pickupLng: item.pickupLng,
    hourlyPackage: item.hourlyPackage,
    tripTerms: item.tripTerms ?? null,
    driverName: item.driverName ?? null,
    driverPhone: null,
  };
}

function cleanPlace(raw: string): string {
  return raw
    .replace(/\s*\(-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function prettyDay(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function prettyClock(raw: string | null | undefined): string {
  if (!raw) return '';
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '';
  let hour = Number(match[1]);
  if (Number.isNaN(hour) || (hour === 0 && match[2] === '00')) return '';
  const suffix = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${match[2]} ${suffix}`;
}

function packageLengthLabel(item: DriverDashboardTrip): string | null {
  const blob = `${item.dropLocation} ${item.tripType ?? ''} ${(item.tripTerms?.notes ?? []).join(' ')}`;
  const named = blob.match(/(?:^|[^A-Za-z0-9])(\d{1,2})\s*d(?:ays?)?(?:\s*\/\s*(\d{1,2})\s*n(?:ights?)?)?(?![A-Za-z])/i);
  if (named) {
    const days = Number(named[1]);
    const nights = named[2] ? Number(named[2]) : Math.max(0, days - 1);
    if (days >= 2 && days <= 31) {
      return `${days} ${days === 1 ? 'Day' : 'Days'} / ${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
    }
  }
  const dates = (item.tripTerms?.duty_dates ?? []).filter((date) => date.trim() !== '');
  if (dates.length >= 2) {
    const nights = dates.length - 1;
    return `${dates.length} Days / ${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
  }
  return null;
}

function vehicleParts(item: DriverDashboardTrip): { number: string; type: string } {
  return {
    number: (item.vehicleNumber ?? '').trim(),
    type: (item.cabType ?? '').trim(),
  };
}

function money(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function DriverTripsDashboardScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<DriverDashboardTrip[]>([]);
  const [fuelByTrip, setFuelByTrip] = useState<Record<number, { litres: number; spend: number }>>({});
  const [slipBusyId, setSlipBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ListFilter>('');

  const load = useCallback(async () => {
    try {
      const data = await driverDashboardAPI.getDashboard({
        tripLimit: 100,
        fuelLimit: 100,
      });
      setTrips(data.trips.items.filter((trip) => trip.status === 'assigned' || trip.status === 'in_progress' || trip.status === 'completed'));
      setFuelByTrip(fuelTotalsByTrip(data.fuelRecords.items));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const searched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return trips;
    return trips.filter((trip) =>
      trip.tripCode.toLowerCase().includes(query)
      || trip.pickupLocation.toLowerCase().includes(query)
      || trip.dropLocation.toLowerCase().includes(query)
      || (trip.passengerName ?? '').toLowerCase().includes(query)
      || (trip.vehicleNumber ?? '').toLowerCase().includes(query)
    );
  }, [trips, search]);

  const counts = useMemo(() => ({
    all: searched.length,
    assigned: searched.filter((trip) => trip.status === 'assigned').length,
    inProgress: searched.filter((trip) => trip.status === 'in_progress').length,
    completed: searched.filter((trip) => trip.status === 'completed').length,
    cancelled: 0,
  }), [searched]);

  const displayTrips = useMemo(() => {
    if (!status) return searched;
    return searched.filter((trip) => trip.status === status);
  }, [searched, status]);

  const openTrip = (item: DriverDashboardTrip) => {
    navigation.navigate('DriverTripDetail', { trip: toDriverTrip(item) });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Trips</Text>
          <Text style={styles.subtitle}>Trips assigned by admin</Text>
        </View>
        <TouchableOpacity style={styles.fuelBtn} onPress={() => navigation.navigate('FuelEntry')}>
          <Ionicons name="water-outline" size={16} color={colors.primary} />
          <Text style={styles.fuelBtnText}>Add Fuel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricRow}>
        {STATS.map((stat) => {
          const value = stat.label === 'Cancelled'
            ? counts.cancelled
            : stat.key === 'assigned'
              ? counts.assigned
              : stat.key === 'in_progress'
                ? counts.inProgress
                : stat.key === 'completed'
                  ? counts.completed
                  : counts.cancelled;
          const selected = stat.key !== '' && status === stat.key;
          return (
            <TouchableOpacity
              key={stat.label}
              style={[styles.metricCard, { backgroundColor: stat.background }, selected && styles.metricCardSelected]}
              onPress={() => { if (stat.key) setStatus(status === stat.key ? '' : stat.key); }}
              disabled={stat.label === 'Cancelled'}
            >
              <View style={[styles.metricIcon, { backgroundColor: stat.iconBackground }]}>
                <Ionicons name={stat.icon} size={14} color={stat.color} />
              </View>
              <Text style={styles.metricValue}>{value}</Text>
              <Text style={styles.metricLabel} numberOfLines={1}>{stat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.gray400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Trip ID, Location, Guest Name..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.gray400}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="options-outline" size={18} color={colors.gray500} />
        )}
      </View>

      <View style={styles.filters}>
        {([
          { key: '' as ListFilter, label: 'All', count: counts.all },
          { key: 'assigned' as ListFilter, label: 'Assigned', count: counts.assigned },
          { key: 'in_progress' as ListFilter, label: 'In Progress', count: counts.inProgress },
          { key: 'completed' as ListFilter, label: 'Completed', count: counts.completed },
        ]).map((chip) => {
          const active = status === chip.key;
          return (
            <TouchableOpacity key={chip.label} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatus(chip.key)}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]} numberOfLines={1}>
                {chip.label}
              </Text>
              <Text style={[styles.filterCount, active && styles.filterChipTextActive]}>{chip.count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={displayTrips}
          keyExtractor={(item) => `trip-${item.tripId}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <TripCard
              item={item}
              fuel={fuelLabel(item, fuelByTrip[item.tripId])}
              slipBusy={slipBusyId === item.tripId}
              onOpen={() => openTrip(item)}
              onSlip={() => {
                setSlipBusyId(item.tripId);
                void shareBookingDutySlip(item.tripId, item.tripCode).finally(() => setSlipBusyId(null));
              }}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No trips found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function TripCard({
  item,
  fuel,
  slipBusy,
  onOpen,
  onSlip,
}: {
  item: DriverDashboardTrip;
  fuel: string;
  slipBusy: boolean;
  onOpen: () => void;
  onSlip: () => void;
}) {
  const pickup = cleanPlace(item.pickupLocation) || '—';
  const drop = cleanPlace(item.dropLocation);
  const samePlace = drop !== '' && drop.toLowerCase() === pickup.toLowerCase();
  const when = prettyDay(item.startTime);
  const pickupTime = prettyClock(item.startTime);
  const lengthLabel = packageLengthLabel(item);
  const vehicle = vehicleParts(item);
  const collects = item.driverCollectsPayment !== false;
  const statusColor = item.status === 'in_progress' ? '#d97706' : item.status === 'completed' ? '#16a34a' : '#2563eb';
  const statusLabel = item.status === 'in_progress' ? 'In Progress' : item.status === 'completed' ? 'Completed' : 'Assigned';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.75}>
        <View style={styles.cardTop}>
          <Text style={styles.tripCode} numberOfLines={1}>{item.tripCode}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
        </View>
        {when ? (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.gray500} />
            <Text style={styles.dateText}>
              {when}{pickupTime ? `  ·  ${pickupTime}` : ''}{lengthLabel ? `  ·  ${lengthLabel}` : ''}
            </Text>
          </View>
        ) : null}
        <View style={styles.placeRow}>
          <Ionicons name="location" size={14} color="#2563eb" />
          <Text style={styles.placeText}>{pickup}</Text>
        </View>
        {drop && !samePlace ? (
          <View style={styles.placeRow}>
            <Ionicons name="location" size={14} color="#dc2626" />
            <Text style={styles.placeText}>{drop}</Text>
          </View>
        ) : null}
        <View style={styles.metrics}>
          <MetricPill icon="speedometer-outline" value={item.totalKilometers.toFixed(1)} label="KM" />
          <MetricPill icon="time-outline" value={item.totalDurationHours.toFixed(1)} label="Hours" />
          <MetricPill icon="water-outline" value={fuel} label="Fuel" />
          <MetricPill icon="cash-outline" value={collects ? money(item.tripAmount) : '—'} label={collects ? 'Total Fare' : 'Do not collect'} />
        </View>
      </TouchableOpacity>
      <View style={styles.advanceRow}>
        <View style={styles.advanceLine}>
          <Ionicons name="receipt-outline" size={15} color={colors.gray500} />
          <Text style={styles.advanceLabel}>Advance: </Text>
          <Text style={styles.advanceValue}>{money(item.advancePaidAmount ?? 0)}</Text>
        </View>
        <TouchableOpacity style={styles.slipBtn} disabled={slipBusy} onPress={onSlip}>
          <Ionicons name="document-text-outline" size={15} color={colors.primary} />
          <Text style={styles.slipBtnText}>{slipBusy ? 'Opening…' : 'Duty slip'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.vehicleRow}>
        <View style={styles.vehicleIcon}>
          <Ionicons name="car" size={16} color={colors.primary} />
        </View>
        <View style={styles.vehicleText}>
          <Text style={styles.vehicleName}>{vehicle.number || vehicle.type || 'Not assigned'}</Text>
          {vehicle.number && vehicle.type ? <Text style={styles.vehicleCaption}>{vehicle.type}</Text> : null}
        </View>
        {item.status !== 'completed' ? (
          <TouchableOpacity style={styles.startBtn} onPress={onOpen}>
            <Ionicons name="play" size={14} color="#fff" />
            <Text style={styles.startBtnText}>{item.status === 'in_progress' ? 'Continue' : 'Start Trip'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function MetricPill({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.metricPill}>
      <Ionicons name={icon} size={14} color={colors.gray500} />
      <Text style={styles.metricPillValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricPillLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function fuelTotalsByTrip(records: DriverFuelRecord[]): Record<number, { litres: number; spend: number }> {
  const byTrip: Record<number, { litres: number; spend: number }> = {};
  for (const record of records) {
    if (record.linkedTripId == null || record.linkedTripId <= 0) continue;
    const current = byTrip[record.linkedTripId] ?? { litres: 0, spend: 0 };
    current.litres += record.fuelQuantityLitres;
    current.spend += record.fuelAmount;
    byTrip[record.linkedTripId] = current;
  }
  return byTrip;
}

function fuelLabel(trip: DriverDashboardTrip, fallback?: { litres: number; spend: number }): string {
  const litres = (trip.fuelLitres ?? 0) > 0 ? (trip.fuelLitres ?? 0) : (fallback?.litres ?? 0);
  const spend = (trip.fuelSpend ?? 0) > 0 ? (trip.fuelSpend ?? 0) : (fallback?.spend ?? 0);
  if (litres > 0 && spend > 0) return `${litres.toFixed(1)} L`;
  if (litres > 0) return `${litres.toFixed(1)} L`;
  if (spend > 0) return `₹${spend.toFixed(0)}`;
  return '—';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  fuelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  fuelBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  metricRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  metricCard: { flex: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'flex-start', gap: 2 },
  metricCardSelected: { borderWidth: 1, borderColor: colors.primary },
  metricIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  metricLabel: { fontSize: 10, color: colors.gray600, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14, padding: 0 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  filterChip: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 4, paddingVertical: 6 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: '#374151', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  filterCount: { color: '#111827', fontSize: 13, fontWeight: '800', marginTop: 2 },
  filterChipTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 110 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e8edf5', padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  tripCode: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.foreground },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dateText: { fontSize: 13, color: colors.gray600 },
  placeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  placeText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.foreground, lineHeight: 20 },
  metrics: { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  metricPill: { flex: 1, alignItems: 'center', gap: 2 },
  metricPillValue: { fontSize: 13, fontWeight: '800', color: colors.foreground },
  metricPillLabel: { fontSize: 10, color: colors.gray500 },
  advanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  advanceLine: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  advanceLabel: { fontSize: 13, color: colors.gray600, marginLeft: 6 },
  advanceValue: { fontSize: 14, fontWeight: '800', color: '#16a34a' },
  slipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#dbe3ef', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff' },
  slipBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, backgroundColor: '#f4f7fb', borderRadius: 12, padding: 8 },
  vehicleIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#e8eefc', alignItems: 'center', justifyContent: 'center' },
  vehicleText: { flex: 1 },
  vehicleCaption: { fontSize: 11, color: colors.gray500 },
  vehicleName: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  empty: { color: colors.gray600, textAlign: 'center', marginTop: 24 },
});
