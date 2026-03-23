/**
 * Dashboard - My Bookings in-app (no web redirect when logged in)
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { userBookingsAPI, UserBooking } from '../services/userBookingsAPI';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function locStr(loc: string | { name?: string } | undefined): string {
  if (!loc) return '';
  return typeof loc === 'string' ? loc : loc?.name ?? '';
}

/** Format YYYY-MM-DD or YYYY-MM-DD HH:mm:ss → DD-MM-YYYY for display */
function formatDisplayDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  const formatted = `${d}-${mo}-${y}`;
  return timeStr ? `${formatted} • ${timeStr}` : formatted;
}

export function DashboardScreen({ navigation, route }: Props) {
  const { user, isAuthenticated } = useAuth();
  const params = route.params;
  const viewAsId = params?.viewAs;
  const viewAsName = params?.viewAsName;
  const isViewingAsUser = !!(
    viewAsId &&
    (user?.role === 'admin' || user?.role === 'super_admin')
  );
  const targetUserId = isViewingAsUser ? viewAsId : (user?.id ?? 0);
  const displayName = isViewingAsUser ? viewAsName || `User #${viewAsId}` : user?.name;

  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    if (targetUserId <= 0) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = isViewingAsUser
        ? await userBookingsAPI.getUserBookingsForUser(targetUserId, { viewAs: true })
        : await userBookingsAPI.getUserBookings();
      setBookings(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user, targetUserId, isViewingAsUser]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => loadBookings());
    return unsubscribe;
  }, [navigation, loadBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>My Bookings</Text>
        </View>
        <View style={styles.empty}>
          <Feather name="lock" size={48} color={colors.gray600} />
          <Text style={styles.emptyTitle}>Log in to view your bookings</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.btnText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isViewingAsUser ? `${displayName}'s Bookings` : 'My Bookings'}
        </Text>
      </View>
      {isViewingAsUser && (
        <View style={styles.viewAsBanner}>
          <Feather name="eye" size={16} color={colors.primary} />
          <Text style={styles.viewAsText}>Viewing as {displayName}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Dashboard')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewAsLink}>Back to my dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.btn} onPress={loadBookings}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={48} color={colors.gray600} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySub}>Book a cab from the Home tab</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {bookings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              onPress={() => navigation.navigate('BookingDetail', { booking: b })}
              activeOpacity={0.7}
            >
              <View style={styles.cardRow}>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <Text style={styles.cardRoute} numberOfLines={1}>
                  {b.pickup_location} → {b.drop_location || 'Drop'}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Feather name="calendar" size={14} color={colors.gray600} />
                <Text style={styles.cardDate}>
                  {formatDisplayDate(b.pickup_date, b.pickup_time)}
                </Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardType}>{b.vehicle_type || b.trip_type || 'Taxi'}</Text>
                <View style={styles.cardRight}>
                  <Text style={styles.cardAmount}>₹{b.total_amount ?? 0}</Text>
                  {b.status ? (
                    <View style={[styles.badge, b.status === 'confirmed' && styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>{b.status}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  backBtn: { marginRight: 12, padding: 4 },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: { fontSize: 14, color: colors.gray600, marginBottom: 16, textAlign: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground, marginTop: 12 },
  emptySub: { fontSize: 14, color: colors.gray600, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardRoute: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.foreground },
  cardDate: { fontSize: 13, color: colors.gray600 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  cardType: { fontSize: 13, color: colors.gray600 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardAmount: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 12, fontWeight: '500', color: colors.gray600 },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  viewAsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  viewAsText: { fontSize: 13, color: colors.foreground, flex: 1 },
  viewAsLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
});
