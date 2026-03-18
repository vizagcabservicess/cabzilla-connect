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
import { adminAPI, AdminDriver } from '../services/adminAPI';
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await adminAPI.getDrivers();
        setDrivers(list);
      } catch {
        Alert.alert('Error', 'Failed to load drivers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAssign = async (driver: AdminDriver) => {
    if (!bookingId) return;
    Alert.alert('Assign Driver', `Assign ${driver.name} to this booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Assign',
        onPress: async () => {
          setSubmitting(true);
          try {
            await adminAPI.assignDriver(bookingId, driver.id);
            Alert.alert('Assigned', `${driver.name} assigned to booking`, [
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
            <Text style={styles.hint}>Tap a driver to assign to this booking</Text>
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
