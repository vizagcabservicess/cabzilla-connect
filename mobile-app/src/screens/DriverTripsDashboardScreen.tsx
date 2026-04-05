import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import type { DriverDashboardTrip, TripStatus } from '../types/driverDashboard';
import type { DriverTrip } from '../services/driverTripsAPI';

const STATUS_COLORS: Record<TripStatus, string> = {
  assigned: '#2563eb',
  in_progress: '#f59e0b',
  completed: '#16a34a',
};

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
    passengerName: item.passengerName ?? '',
    passengerPhone: item.passengerPhone ?? '',
    passengerEmail: '',
    vehicleNumber: item.vehicleNumber ?? '',
    vehicleType,
    tripCategory: svc || undefined,
    tripMode: mode || undefined,
    tripType: vehicleType,
    totalAmount: item.tripAmount,
    status: item.status,
    additionalRequirements: null,
    driverName: item.driverName ?? null,
    driverPhone: null,
  };
}

export function DriverTripsDashboardScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trips, setTrips] = useState<DriverDashboardTrip[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | TripStatus>('');

  const load = useCallback(async () => {
    try {
      // Do not pass status — server would return only that bucket and summary chips would all go to 0 except one.
      const data = await driverDashboardAPI.getDashboard({
        search: search.trim() || undefined,
        tripLimit: 100,
      });
      setTrips(data.trips.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const displayTrips = useMemo(() => {
    if (!status) return trips;
    return trips.filter((t) => t.status === status);
  }, [trips, status]);

  const stats = useMemo(() => ({
    assigned: trips.filter((t) => t.status === 'assigned').length,
    inProgress: trips.filter((t) => t.status === 'in_progress').length,
    completed: trips.filter((t) => t.status === 'completed').length,
  }), [trips]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <TouchableOpacity style={styles.fabInline} onPress={() => navigation.navigate('FuelEntry')}>
          <Ionicons name="water" size={18} color="#fff" />
          <Text style={styles.fabInlineText}>Add Fuel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricRow}>
        <Metric label="Assigned" value={stats.assigned} color={STATUS_COLORS.assigned} />
        <Metric label="In Progress" value={stats.inProgress} color={STATUS_COLORS.in_progress} />
        <Metric label="Completed" value={stats.completed} color={STATUS_COLORS.completed} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Trip ID / Driver ID"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.gray500}
          onSubmitEditing={load}
        />
      </View>

      <View style={styles.filters}>
        {(['', 'assigned', 'in_progress', 'completed'] as const).map((s) => (
          <TouchableOpacity key={s || 'all'} style={[styles.filterChip, status === s && styles.filterChipActive]} onPress={() => setStatus(s)}>
            <Text style={[styles.filterChipText, status === s && styles.filterChipTextActive]}>{s ? s.replace('_', ' ') : 'all'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={displayTrips}
          keyExtractor={(item) => `trip-${item.tripId}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DriverTripDetail', { trip: toDriverTrip(item) })}>
              <View style={styles.cardTop}>
                <Text style={styles.tripCode}>{item.tripCode}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              {item.pickupLocation.trim() === item.dropLocation.trim() ? (
                <Text style={styles.route}>{item.pickupLocation}</Text>
              ) : (
                <>
                  <Text style={styles.route}>{item.pickupLocation}</Text>
                  <Text style={styles.routeSecondary}>{item.dropLocation}</Text>
                </>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Km: {item.totalKilometers.toFixed(1)}</Text>
                <Text style={styles.meta}>Hours: {item.totalDurationHours.toFixed(1)}</Text>
                <Text style={styles.amount}>₹{item.tripAmount.toFixed(0)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No trips found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  fabInline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  fabInlineText: { color: '#fff', fontWeight: '600' },
  metricRow: { flexDirection: 'row', gap: 8, padding: 12 },
  metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.gray200 },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  metricLabel: { fontSize: 12, color: colors.gray600 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  searchWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: 10, color: colors.foreground },
  filters: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.foreground, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, padding: 12, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tripCode: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  route: { fontSize: 14, color: colors.foreground, marginBottom: 2 },
  routeSecondary: { fontSize: 13, color: colors.gray600, marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: colors.gray600 },
  amount: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  empty: { color: colors.gray600, textAlign: 'center', marginTop: 24 },
});
