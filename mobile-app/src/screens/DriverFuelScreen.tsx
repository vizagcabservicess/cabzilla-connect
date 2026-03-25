import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import type { DriverFuelRecord } from '../types/driverDashboard';

export function DriverFuelScreen() {
  const navigation = useNavigation<any>();
  const [records, setRecords] = useState<DriverFuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalFuel, setTotalFuel] = useState(0);
  const [refills, setRefills] = useState(0);
  const [efficiency, setEfficiency] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await driverDashboardAPI.getDashboard({ fuelLimit: 50, tripLimit: 10 });
      setRecords(data.fuelRecords.items);
      setTotalFuel(data.summary.totalFuelSpend);
      setRefills(data.summary.numberOfRefills);
      setEfficiency(data.summary.fuelEfficiencyKmPerLitre);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Fuel</Text>
      </View>
      <View style={styles.metrics}>
        <Metric title="Total Fuel Spend" value={`₹${totalFuel.toFixed(0)}`} />
        <Metric title="Refills" value={String(refills)} />
        <Metric title="Fuel Efficiency" value={`${efficiency.toFixed(2)} km/l`} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.amount}>₹{item.fuelAmount.toFixed(0)}</Text>
                <Text style={styles.qty}>{item.fuelQuantityLitres.toFixed(2)} L</Text>
              </View>
              <Text style={styles.meta}>{item.dateTime ? new Date(item.dateTime).toLocaleString() : '—'}</Text>
              <Text style={styles.meta}>
                Vehicle: {(item.vehicleNumber || '').trim() || '—'}
              </Text>
              <Text style={styles.meta}>Linked Trip: {item.linkedTripId ?? 'None'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No fuel records.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FuelEntry')}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  metrics: { flexDirection: 'row', gap: 8, padding: 12 },
  metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.gray200, padding: 10 },
  metricTitle: { fontSize: 11, color: colors.gray600, marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, padding: 12, marginBottom: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  qty: { fontSize: 14, fontWeight: '600', color: colors.primary },
  meta: { fontSize: 12, color: colors.gray600 },
  empty: { marginTop: 30, textAlign: 'center', color: colors.gray600 },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 5 },
});
