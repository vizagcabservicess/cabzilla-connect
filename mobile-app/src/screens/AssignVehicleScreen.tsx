/**
 * AssignVehicleScreen - Select and assign fleet vehicle to booking (admin)
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
import { adminAPI, AdminFleetVehicle } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'AssignVehicle'>;

function formatVehicle(v: AdminFleetVehicle): string {
  const num = v.vehicleNumber ?? v.vehicle_number ?? '—';
  const name = v.name ?? v.model ?? '';
  const year = v.year ?? '';
  return [num, name, year].filter(Boolean).join(' • ');
}

export function AssignVehicleScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const booking = params?.booking as Record<string, unknown> | undefined;
  const bookingId =
    (params?.bookingId as number | undefined) ??
    (typeof booking?.id === 'number' ? booking.id : parseInt(String(booking?.id ?? 0), 10));

  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await adminAPI.getFleetVehicles();
        setVehicles(list);
      } catch {
        Alert.alert('Error', 'Failed to load vehicles');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAssign = async (vehicle: AdminFleetVehicle) => {
    if (!bookingId) return;
    const vid = String(vehicle.id);
    Alert.alert('Assign Vehicle', `Assign ${formatVehicle(vehicle)} to this booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: async () => {
          setSubmitting(true);
          try {
            await adminAPI.assignVehicle(bookingId, vid);
            Alert.alert('Assigned', 'Vehicle assigned to booking', [
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

  const renderVehicle = ({ item }: { item: AdminFleetVehicle }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => handleAssign(item)}
      disabled={submitting}
      activeOpacity={0.7}
    >
      <View style={styles.vehicleInfo}>
        <Feather name="truck" size={24} color={colors.primary} />
        <View style={styles.vehicleText}>
          <Text style={styles.vehicleName}>{formatVehicle(item)}</Text>
          {item.status && (
            <Text style={styles.vehicleStatus}>{item.status}</Text>
          )}
        </View>
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
        <Text style={styles.title}>Assign Vehicle</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : vehicles.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="truck" size={48} color={colors.gray200} />
          <Text style={styles.emptyText}>No fleet vehicles available</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderVehicle}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.hint}>Tap a vehicle to assign to this booking</Text>
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
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  vehicleInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  vehicleText: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  vehicleStatus: { fontSize: 12, color: colors.gray600, marginTop: 4 },
});
