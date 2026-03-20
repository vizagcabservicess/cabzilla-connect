/**
 * Admin Dashboard - native metrics, trends chart, and recent bookings
 * Matches web admin: KPI cards with trends, Orders & Profits chart, Recent Orders
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { adminAPI, AdminMetrics, MetricsPeriod } from '../services/adminAPI';
import { authAPI } from '../services/authAPI';
import type { UserBooking } from '../services/userBookingsAPI';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDashboard'>;

function formatDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const formatted = `${d}-${mo}-${y}`;
  return timeStr ? `${formatted} • ${timeStr}` : formatted;
}

/** Compute % change from trends: first half vs second half of period */
function computeTrendPercent(trends: Array<{ bookings: number; revenue: number }>): {
  bookingsChange: number | null;
  revenueChange: number | null;
} {
  if (!trends || trends.length < 4) return { bookingsChange: null, revenueChange: null };
  const mid = Math.floor(trends.length / 2);
  const first = trends.slice(0, mid);
  const second = trends.slice(mid);
  const sum = (arr: typeof trends, key: 'bookings' | 'revenue') =>
    arr.reduce((a, t) => a + (t[key] || 0), 0);
  const b1 = sum(first, 'bookings');
  const b2 = sum(second, 'bookings');
  const r1 = sum(first, 'revenue');
  const r2 = sum(second, 'revenue');
  const bookingsChange = b1 > 0 ? Math.round(((b2 - b1) / b1) * 1000) / 10 : null;
  const revenueChange = r1 > 0 ? Math.round(((r2 - r1) / r1) * 1000) / 10 : null;
  return { bookingsChange, revenueChange };
}

const PERIOD_OPTIONS: { label: string; value: MetricsPeriod }[] = [
  { label: '7 days', value: '7days' },
  { label: '30 days', value: '30days' },
  { label: '90 days', value: '90days' },
  { label: '1 year', value: 'year' },
];

const CHART_HEIGHT = 140;
const CHART_BAR_GAP = 4;

export function AdminDashboardScreen({ navigation }: Props) {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [period, setPeriod] = useState<MetricsPeriod>('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>('Admin');

  useEffect(() => {
    authAPI.getStoredUser().then((u) => {
      if (u?.name) setUserName(u.name.split(' ')[0] || 'Admin');
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [metricsRes, bookingsRes] = await Promise.all([
        adminAPI.getAdminMetrics(period),
        adminAPI.getAdminBookings(),
      ]);
      setMetrics(metricsRes);
      setBookings(bookingsRes);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
      setMetrics(null);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  React.useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openAllBookings = () => navigation.navigate('AdminBookingsList');
  const openUpcomingTrips = () => navigation.navigate('AdminUpcomingTrips');
  const openAdminMenu = () => navigation.navigate('AdminMenu');

  const trends = metrics?.trends ?? [];
  const { bookingsChange, revenueChange } = computeTrendPercent(trends);
  const maxBookings = trends.length ? Math.max(...trends.map((t) => t.bookings), 1) : 1;
  const maxRevenue = trends.length ? Math.max(...trends.map((t) => t.revenue), 1) : 1;
  const chartTrends = trends.slice(-14); // last 14 days for chart

  if (loading && !metrics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity onPress={openAdminMenu} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color={colors.foreground} />
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
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity onPress={openAdminMenu} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeTitle}>Dashboard</Text>
          <Text style={styles.welcomeSub}>Welcome back, {userName}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Period picker */}
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.periodBtn, period === opt.value && styles.periodBtnActive]}
              onPress={() => setPeriod(opt.value)}
            >
              <Text style={[styles.periodBtnText, period === opt.value && styles.periodBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI cards with trend indicators */}
        {metrics && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>Total Bookings</Text>
                <View style={styles.statIconWrap}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
              </View>
              <Text style={styles.statValue}>{metrics.totalBookings.toLocaleString()}</Text>
              {bookingsChange != null && (
                <View style={styles.trendRow}>
                  <Ionicons
                    name={bookingsChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={bookingsChange >= 0 ? '#059669' : '#dc2626'}
                  />
                  <Text style={[styles.trendText, { color: bookingsChange >= 0 ? '#059669' : '#dc2626' }]}>
                    {bookingsChange >= 0 ? '+' : ''}{bookingsChange}%
                  </Text>
                  <Text style={styles.trendVs}>vs. earlier in period</Text>
                </View>
              )}
            </View>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>Total Revenue</Text>
                <View style={[styles.statIconWrap, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="cash-outline" size={20} color="#059669" />
                </View>
              </View>
              <Text style={styles.statValue}>₹{Math.round(metrics.totalRevenue).toLocaleString()}</Text>
              {revenueChange != null && (
                <View style={styles.trendRow}>
                  <Ionicons
                    name={revenueChange >= 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={revenueChange >= 0 ? '#059669' : '#dc2626'}
                  />
                  <Text style={[styles.trendText, { color: revenueChange >= 0 ? '#059669' : '#dc2626' }]}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </Text>
                  <Text style={styles.trendVs}>vs. earlier in period</Text>
                </View>
              )}
            </View>
            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>Active Drivers</Text>
                <View style={[styles.statIconWrap, { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="people-outline" size={20} color="#7c3aed" />
                </View>
              </View>
              <Text style={styles.statValue}>{metrics.activeDrivers}</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAmber]}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statLabel}>Vehicles</Text>
                <View style={[styles.statIconWrap, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="car-outline" size={20} color="#d97706" />
                </View>
              </View>
              <Text style={styles.statValue}>{metrics.activeVehicles}</Text>
            </View>
          </View>
        )}

        {/* Orders & Profits chart */}
        {chartTrends.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Orders & Profits</Text>
                <Text style={styles.chartSub}>Daily performance</Text>
              </View>
            </View>
            <View style={styles.chartArea}>
              <View style={styles.chartBars}>
                {chartTrends.map((t, i) => (
                  <View key={t.date} style={styles.chartBarWrap}>
                    <View
                      style={[
                        styles.chartBarOrders,
                        { height: Math.max(4, (t.bookings / maxBookings) * (CHART_HEIGHT * 0.5)) },
                      ]}
                    />
                    <View
                      style={[
                        styles.chartBarProfit,
                        { height: Math.max(4, (t.revenue / maxRevenue) * (CHART_HEIGHT * 0.5)) },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.chartLegendDot, { backgroundColor: colors.primary }]} />
                  <Text style={styles.chartLegendText}>Orders</Text>
                </View>
                <View style={styles.chartLegendItem}>
                  <View style={[styles.chartLegendDot, { backgroundColor: '#a78bfa' }]} />
                  <Text style={styles.chartLegendText}>Profit</Text>
                </View>
              </View>
            </View>
            <View style={[styles.chartLabels, { gap: CHART_BAR_GAP }]}>
              {chartTrends.map((t) => (
                <View key={t.date} style={styles.chartLabelWrap}>
                  <Text style={styles.chartLabel} numberOfLines={1}>
                    {t.date.slice(5).replace('-', '/')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Revenue by trip type */}
        {metrics?.revenueByTripType && metrics.revenueByTripType.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue by trip type</Text>
            <View style={styles.revenueList}>
              {metrics.revenueByTripType.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.revenueRow}>
                  <Text style={styles.revenueLabel}>{r.tripType || 'Other'}</Text>
                  <Text style={styles.revenueValue}>₹{Math.round(r.revenue).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Orders */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.gray200} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {bookings.slice(0, 10).map((b) => (
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
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(b.status) }]}>
                    <Text style={styles.statusText}>{b.status || '—'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.fullAdminBtn} onPress={openAllBookings} activeOpacity={0.8}>
          <Ionicons name="list-outline" size={20} color={colors.primary} />
          <Text style={styles.fullAdminText}>View all bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.upcomingTripsBtn} onPress={openUpcomingTrips} activeOpacity={0.8}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.fullAdminText}>Upcoming trips</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function statusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return '#d1fae5';
    case 'completed':
      return '#dbeafe';
    case 'cancelled':
      return '#fee2e2';
    default:
      return colors.gray200;
  }
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 16;
const CHART_BAR_WIDTH = Math.max(8, (SCREEN_WIDTH - PAD * 2 - 40) / 14 - CHART_BAR_GAP);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  menuBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  welcomeRow: { marginBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: colors.foreground },
  welcomeSub: { fontSize: 14, color: colors.gray600, marginTop: 4 },
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
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodBtnText: { fontSize: 14, fontWeight: '500', color: colors.gray600 },
  periodBtnTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  statCardBlue: {},
  statCardGreen: {},
  statCardPurple: {},
  statCardAmber: {},
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginTop: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  trendText: { fontSize: 13, fontWeight: '600' },
  trendVs: { fontSize: 11, color: colors.gray600 },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  chartHeader: { marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  chartSub: { fontSize: 12, color: colors.gray600, marginTop: 2 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 32 },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: CHART_BAR_GAP,
    flex: 1,
  },
  chartBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: CHART_HEIGHT,
  },
  chartBarOrders: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 4,
    minWidth: 4,
  },
  chartBarProfit: {
    flex: 1,
    backgroundColor: '#a78bfa',
    borderRadius: 4,
    minWidth: 4,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginLeft: 12 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chartLegendDot: { width: 10, height: 10, borderRadius: 5 },
  chartLegendText: { fontSize: 12, color: colors.gray600 },
  chartLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chartLabelWrap: { flex: 1 },
  chartLabel: {
    fontSize: 9,
    color: colors.gray600,
    textAlign: 'center',
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  revenueList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  revenueLabel: { fontSize: 14, color: colors.foreground },
  revenueValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
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
  fullAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  upcomingTripsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  fullAdminText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
