/**
 * Admin Fleet - dynamic fleet management matching web FleetManagementPage
 * Stats, search, filter, add/edit/delete, uses adminAPI
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
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI, AdminFleetVehicle } from '../services/adminAPI';

const STATUS_OPTIONS = ['all', 'Active', 'Maintenance', 'Inactive'] as const;

function formatVehicle(v: AdminFleetVehicle): string {
  const num = v.vehicleNumber ?? v.vehicle_number ?? '—';
  const name = v.name ?? v.model ?? '';
  const year = v.year ?? '';
  return [num, name, year].filter(Boolean).join(' • ');
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Active': return '#dcfce7';
    case 'Maintenance': return '#fef9c3';
    case 'Inactive': return '#f3f4f6';
    default: return colors.gray200;
  }
}

export function AdminFleetScreen() {
  const navigation = useNavigation<any>();
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<AdminFleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const list = await adminAPI.getFleetVehicles(true);
      setVehicles(Array.isArray(list) ? list : []);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    let filtered = [...vehicles];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          (v.vehicleNumber ?? v.vehicle_number ?? '').toLowerCase().includes(term) ||
          (v.name ?? '').toLowerCase().includes(term) ||
          (v.make ?? '').toLowerCase().includes(term) ||
          (v.model ?? '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }
    setFilteredVehicles(filtered);
  }, [vehicles, searchTerm, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const total = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === 'Active').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'Maintenance').length;
  const inactiveCount = vehicles.filter((v) => v.status === 'Inactive').length;

  const handleAdd = () => {
    navigation.navigate('AdminVehicleAdd');
  };

  const handleEdit = (vehicle: AdminFleetVehicle) => {
    navigation.navigate('AdminVehicleEdit', { vehicle });
  };

  const renderVehicle = ({ item }: { item: AdminFleetVehicle }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleEdit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="car-sport-outline" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.vehicleName}>{formatVehicle(item)}</Text>
        <View style={styles.cardMeta}>
          {(item.make || item.model) ? (
            <Text style={styles.cardSub}>
              {[item.make, item.model].filter(Boolean).join(' ')} ({item.year ?? ''})
            </Text>
          ) : null}
          {item.status ? (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Fleet Management</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredVehicles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVehicle}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{total}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.statLabel}>Active</Text>
                  <Text style={styles.statValue}>{activeCount}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fef9c3' }]}>
                  <Text style={styles.statLabel}>Maintenance</Text>
                  <Text style={styles.statValue}>{maintenanceCount}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f3f4f6' }]}>
                  <Text style={styles.statLabel}>Inactive</Text>
                  <Text style={styles.statValue}>{inactiveCount}</Text>
                </View>
              </View>
              <View style={styles.filterRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by number, make, model..."
                  placeholderTextColor={colors.gray600}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                  {STATUS_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                      onPress={() => setStatusFilter(s)}
                    >
                      <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                        {s === 'all' ? 'All' : s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={48} color={colors.gray400} />
              <Text style={styles.emptyText}>
                {searchTerm || statusFilter !== 'all'
                  ? 'No vehicles match your filters'
                  : 'No vehicles in fleet'}
              </Text>
              {!searchTerm && statusFilter === 'all' && (
                <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAdd}>
                  <Text style={styles.emptyAddBtnText}>Add Vehicle</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
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
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  statLabel: { fontSize: 11, color: colors.gray600, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statusScroll: { flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
  filterChipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  listContent: { paddingHorizontal: 16 },
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
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cardSub: { fontSize: 13, color: colors.gray600 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  emptyAddBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
