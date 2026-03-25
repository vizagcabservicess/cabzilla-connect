/**
 * Admin Drivers List - native list of all drivers
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI, AdminDriver } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDriversList'>;

export function AdminDriversListScreen({ navigation }: Props) {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const list = await adminAPI.getDrivers();
      setDrivers(list);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load());
    return unsubscribe;
  }, [navigation, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const navToAdd = () => navigation.navigate('AdminDriverAdd');
  const navToEdit = (driver: AdminDriver) => navigation.navigate('AdminDriverEdit', { driver });

  const toggleStatus = async (driver: AdminDriver) => {
    if (togglingId) return;
    const newStatus: 'available' | 'offline' = driver.status === 'available' ? 'offline' : 'available';
    setTogglingId(String(driver.id));
    try {
      await adminAPI.updateDriverStatus(driver.id, newStatus);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driver.id ? { ...d, status: newStatus } : d))
      );
    } catch {
      // Error surfaced by API; list will refresh on next load
    } finally {
      setTogglingId(null);
    }
  };

  const renderDriver = ({ item }: { item: AdminDriver }) => (
    <TouchableOpacity style={styles.card} onPress={() => navToEdit(item)} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons name="person-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.driverName}>{item.name}</Text>
        {item.phone ? <Text style={styles.driverPhone}>{item.phone}</Text> : null}
        {item.email ? <Text style={styles.driverEmail}>{item.email}</Text> : null}
        {item.status ? (
          <View style={[styles.statusBadge, item.status === 'available' && styles.statusAvailable]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.toggleBtn}
        onPress={() => toggleStatus(item)}
        disabled={togglingId === String(item.id)}
      >
        {togglingId === String(item.id) ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={item.status === 'available' ? 'moon-outline' : 'checkmark-circle-outline'}
            size={22}
            color={colors.primary}
          />
        )}
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={20} color={colors.gray600} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Drivers</Text>
        <TouchableOpacity onPress={navToAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDriver}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No drivers found</Text>
            </View>
          }
        />
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
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  addBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  driverPhone: { fontSize: 14, color: colors.gray600, marginTop: 2 },
  driverEmail: { fontSize: 12, color: colors.gray600, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  statusAvailable: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  toggleBtn: {
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 38,
  },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
});
