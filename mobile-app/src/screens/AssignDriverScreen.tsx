/**
 * AssignDriverScreen - Select and assign driver to booking (admin)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI, AdminDriver, AdminFleetVehicle } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'AssignDriver'>;

export function AssignDriverScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const booking = params?.booking as Record<string, unknown> | undefined;
  const bookingId =
    (params?.bookingId as number | undefined) ??
    (typeof booking?.id === 'number' ? booking.id : parseInt(String(booking?.id ?? 0), 10));

  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [driverList, vehicleList] = await Promise.all([
          adminAPI.getDrivers(),
          adminAPI.getFleetVehicles(true),
        ]);
        setDrivers(driverList);
        const active = vehicleList.filter((item) => String(item.status ?? 'Active').toLowerCase() === 'active');
        setVehicles(active.length > 0 ? active : vehicleList);
        const currentPlate = String(booking?.vehicleNumber ?? booking?.vehicle_number ?? '').replace(/\s+/g, '').toUpperCase();
        const currentFleet = String(booking?.fleetVehicleId ?? booking?.fleet_vehicle_id ?? booking?.vehicleId ?? '');
        const match = vehicleList.find((item) => {
          const plate = String(item.vehicleNumber ?? item.vehicle_number ?? '').replace(/\s+/g, '').toUpperCase();
          return (currentPlate !== '' && plate === currentPlate) || (currentFleet !== '' && String(item.id) === currentFleet);
        });
        if (match) setVehicleId(String(match.id));
      } catch {
        Alert.alert('Error', 'Failed to load drivers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [booking]);

  const handleAssign = async (driver: AdminDriver) => {
    if (!bookingId) return;
    const vehicle = vehicles.find((item) => String(item.id) === vehicleId);
    if (!vehicle) {
      Alert.alert('Select a vehicle', 'Choose the fleet vehicle first. The website saves the driver and vehicle together.');
      return;
    }
    const plate = String(vehicle.vehicleNumber ?? vehicle.vehicle_number ?? '').trim();
    Alert.alert('Assign Driver', `Assign ${driver.name} with ${plate || 'this vehicle'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: async () => {
          setSubmitting(true);
          try {
            await adminAPI.assignDriverAndVehicle(
              bookingId,
              { id: driver.id, name: driver.name, phone: driver.phone },
              { id: vehicle.id, vehicleNumber: plate }
            );
            Alert.alert('Assigned', `${driver.name} and ${plate} are saved on this booking`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to assign');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const renderDriver = ({ item }: { item: AdminDriver }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => handleAssign(item)}
      disabled={submitting}
      activeOpacity={0.7}
    >
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{item.name}</Text>
        <Text style={styles.driverPhone}>{item.phone}</Text>
        {item.status && (
          <View style={[styles.statusBadge, item.status === 'available' && styles.statusAvailable]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={colors.gray600} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Assign Driver</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="users" size={48} color={colors.gray200} />
          <Text style={styles.emptyText}>No drivers available</Text>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDriver}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={styles.hint}>Select the fleet vehicle, then tap the driver. Both are saved together, the same way as the website.</Text>
              {vehicles.map((item) => {
                const id = String(item.id);
                const plate = String(item.vehicleNumber ?? item.vehicle_number ?? 'Vehicle');
                const selected = id === vehicleId;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.vehicleChip, selected && styles.vehicleChipSelected]}
                    onPress={() => setVehicleId(id)}
                  >
                    <Text style={[styles.vehicleChipText, selected && styles.vehicleChipTextSelected]}>
                      {plate} · {item.name || item.model || 'Fleet'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.hint}>Drivers</Text>
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
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.gray600, marginTop: 12 },
  list: { padding: 16 },
  hint: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: 16,
  },
  vehicleChip: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  vehicleChipSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  vehicleChipText: { fontSize: 14, color: colors.foreground },
  vehicleChipTextSelected: { color: colors.primary, fontWeight: '700' },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  driverPhone: { fontSize: 14, color: colors.gray600, marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  statusAvailable: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
});
