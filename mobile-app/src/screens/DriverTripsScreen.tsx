/**
 * DriverTripsScreen - Assigned trips list for driver role
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { driverAPI } from '../services/driverAPI';
import { driverTripsAPI, DriverTrip } from '../services/driverTripsAPI';
import type { RootStackParamList } from '../navigation/types';

const TAB_BAR_HEIGHT = 56;

export function DriverTripsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [driverLinked, setDriverLinked] = useState<boolean | null>(null);
  const listBottomPadding = insets.bottom + TAB_BAR_HEIGHT + 32;
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      await driverAPI.getMe();
      setDriverLinked(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not linked') || msg.includes('404')) {
        setDriverLinked(false);
      } else {
        setDriverLinked(null);
        Alert.alert('Error', msg);
      }
      setTrips([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const list = await driverTripsAPI.getTrips();
      setTrips(list);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load trips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return d;
  };

  if (driverLinked === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>My Trips</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="link-outline" size={64} color={colors.gray400} />
          <Text style={styles.emptyTitle}>Account Not Linked</Text>
          <Text style={styles.emptyDesc}>
            Your driver account is not linked. Please contact admin to link your app user to a driver record.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <TouchableOpacity style={styles.fuelBtn} onPress={() => navigation.navigate('FuelEntry')}>
          <Ionicons name="water" size={20} color={colors.primary} />
          <Text style={styles.fuelBtnText}>Add Fuel</Text>
        </TouchableOpacity>
      </View>
      {loading && trips.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, trips.length === 0 && styles.listEmpty, { paddingBottom: listBottomPadding }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={colors.gray400} />
              <Text style={styles.emptyTitle}>No Trips Assigned</Text>
              <Text style={styles.emptyDesc}>You have no assigned or ongoing trips.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('DriverTripDetail', { trip: item })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.bookingNo}>{item.bookingNumber}</Text>
                <View style={[styles.badge, item.status === 'in_progress' && styles.badgeProgress]}>
                  <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={styles.pickup} numberOfLines={1}>{item.pickupLocation}</Text>
              <Text style={styles.drop} numberOfLines={1}>{item.dropLocation || '—'}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.date}>{formatDate(item.pickupDate)} {item.pickupTime}</Text>
                <Text style={styles.passenger}>{item.passengerName}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  fuelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  fuelBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  list: { padding: 16 },
  listEmpty: { flexGrow: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground, marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: colors.gray600, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingNo: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  badge: { backgroundColor: colors.gray200, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeProgress: { backgroundColor: '#dbeafe' },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.foreground, textTransform: 'capitalize' },
  pickup: { fontSize: 14, color: colors.foreground, marginBottom: 4 },
  drop: { fontSize: 14, color: colors.gray600, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: colors.gray600 },
  passenger: { fontSize: 12, color: colors.gray600 },
});
