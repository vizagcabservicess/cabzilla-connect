/**
 * Admin Bookings List - native full bookings list for admin
 * Replaces WebView "Open full admin panel" with native admin experience
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI } from '../services/adminAPI';
import type { UserBooking } from '../services/userBookingsAPI';
import {
  formatBookingStatus,
  getEffectiveBookingStatus,
  tripStatusBadgeBackground,
} from '../utils/bookingStatusDisplay';

function formatDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const formatted = `${d}-${mo}-${y}`;
  return timeStr ? `${formatted} • ${timeStr}` : formatted;
}

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Admin created', value: 'admin_created' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function AdminBookingsListScreen() {
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await adminAPI.getAdminBookings();
      setBookings(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load bookings';
      setError(msg);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = statusFilter
    ? bookings.filter(
        (b) =>
          getEffectiveBookingStatus(b).toLowerCase() === statusFilter.toLowerCase()
      )
    : bookings;

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>All Bookings</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AdminUpcomingTrips')}
            style={styles.headerLink}
          >
            <Text style={styles.headerLinkText}>Upcoming</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>All Bookings</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminUpcomingTrips')}
          style={styles.headerLink}
          accessibilityLabel="Upcoming trips"
        >
          <Text style={styles.headerLinkText}>Upcoming</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Status filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((opt) => (
            <TouchableOpacity
              key={opt.value || 'all'}
              style={[styles.filterBtn, statusFilter === opt.value && styles.filterBtnActive]}
              onPress={() => setStatusFilter(opt.value)}
            >
              <Text style={[styles.filterBtnText, statusFilter === opt.value && styles.filterBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.gray200} />
            <Text style={styles.emptyText}>
              {statusFilter ? `No ${statusFilter} bookings` : 'No bookings yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {filtered.map((b) => {
              const rowStatus = getEffectiveBookingStatus(b);
              return (
              <TouchableOpacity
                key={b.id}
                style={styles.bookingCard}
                onPress={() => navigation.navigate('BookingDetail', { booking: b, source: 'admin' })}
                activeOpacity={0.7}
              >
                <View style={styles.bookingRow}>
                  <Text style={styles.bookingLoc} numberOfLines={1}>
                    {b.pickup_location} → {b.drop_location || '—'}
                  </Text>
                  <Text style={styles.bookingAmount}>₹{b.total_amount ?? 0}</Text>
                </View>
                <View style={styles.bookingMeta}>
                  <Text style={styles.bookingDate}>{formatDate(b.pickup_date, b.pickup_time)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: tripStatusBadgeBackground(rowStatus) }]}>
                    <Text style={styles.statusText}>{formatBookingStatus(rowStatus)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  headerLink: { paddingVertical: 6, paddingHorizontal: 4 },
  headerLinkText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 14, color: '#dc2626' },
  filterScroll: { marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBtnText: { fontSize: 14, fontWeight: '500', color: colors.gray600 },
  filterBtnTextActive: { color: '#fff' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 8 },
  bookingList: { gap: 10 },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingLoc: { flex: 1, fontSize: 14, color: colors.foreground, marginRight: 8 },
  bookingAmount: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  bookingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  bookingDate: { fontSize: 12, color: colors.gray600 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
});
