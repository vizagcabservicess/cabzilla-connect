import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { colors } from '../theme/colors';
import { adminAPI, type AdminDriver, type AdminFleetVehicle } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'ChangeAssignment'>;

const REASONS = [
  { value: 'driver_unavailable', label: 'Driver unavailable' },
  { value: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { value: 'vehicle_replacement', label: 'Vehicle replacement' },
  { value: 'customer_request', label: 'Customer request' },
  { value: 'other', label: 'Other' },
];

type DutyDay = {
  id: number;
  dayIndex: number;
  dutyDate: string;
  status: string;
  segments: Array<{
    status: string;
    driverName: string;
    vehicleNumber: string;
    vehicleModel: string;
    openingKm: number | null;
    closingKm: number | null;
  }>;
};

export function ChangeAssignmentScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const booking = params?.booking as Record<string, unknown> | undefined;
  const bookingId =
    (params?.bookingId as number | undefined) ??
    (typeof booking?.id === 'number' ? booking.id : parseInt(String(booking?.id ?? 0), 10));
  const tripCode = String(booking?.bookingNumber ?? booking?.booking_number ?? bookingId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<DutyDay[]>([]);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [driverId, setDriverId] = useState(0);
  const [vehicleId, setVehicleId] = useState(0);
  const [reason, setReason] = useState('driver_unavailable');
  const [note, setNote] = useState('');
  const [closingKm, setClosingKm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [duty, driverList, vehicleList] = await Promise.all([
          adminAPI.getDutyAssignment(bookingId),
          adminAPI.getDrivers(),
          adminAPI.getFleetVehicles(),
        ]);
        const loaded = duty.days ?? [];
        setDays(loaded);
        const firstOpen = loaded.find((day) => day.status !== 'completed');
        setEffectiveDate(firstOpen?.dutyDate || loaded[0]?.dutyDate || '');
        setDrivers(driverList);
        setVehicles(vehicleList);
      } catch (error) {
        Alert.alert('Duty days', error instanceof Error ? error.message : 'Could not load this trip');
      } finally {
        setLoading(false);
      }
    };
    if (bookingId > 0) void load();
    else setLoading(false);
  }, [bookingId]);

  const selected = days.find((day) => day.dutyDate === effectiveDate);
  const openSegment = selected?.segments.find((segment) => segment.status !== 'completed');
  const needsClosingKm = openSegment?.status === 'in_progress';

  const confirm = async () => {
    if (!effectiveDate || (!driverId && !vehicleId)) {
      Alert.alert('Assignment', 'Choose the day, and a new driver or vehicle.');
      return;
    }
    if (needsClosingKm && !(Number(closingKm) > 0)) {
      Alert.alert('Closing KM', 'Enter the closing KM of the vehicle that is stopping. Do not reuse it on the replacement.');
      return;
    }
    setSaving(true);
    try {
      await adminAPI.changeDutyAssignment({
        bookingId,
        effectiveDate,
        newDriverId: driverId,
        newVehicleId: vehicleId,
        reason,
        note,
        closingKm: needsClosingKm ? Number(closingKm) : null,
      });
      Alert.alert('Assignment updated', 'Completed days were left unchanged.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Assignment', error instanceof Error ? error.message : 'Could not change the assignment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Change Driver / Vehicle</Text>
        <Text style={styles.sub}>Trip ID: {tripCode}</Text>
        {days.map((day) => (
          <TouchableOpacity
            key={day.id}
            style={[styles.card, effectiveDate === day.dutyDate && styles.cardOn, day.status === 'completed' && styles.cardLocked]}
            disabled={day.status === 'completed'}
            onPress={() => setEffectiveDate(day.dutyDate)}
          >
            <Text style={styles.cardTitle}>Day {day.dayIndex} · {day.dutyDate} · {day.status.replace('_', ' ')}</Text>
            {day.segments.map((segment, index) => (
              <Text key={`${day.id}-${index}`} style={styles.meta}>
                {segment.driverName || 'No driver'} · {segment.vehicleNumber || 'No vehicle'}
                {segment.openingKm != null ? ` · Open ${segment.openingKm}` : ''}
                {segment.closingKm != null ? ` · Close ${segment.closingKm}` : ''}
              </Text>
            ))}
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>Reason</Text>
        <View style={styles.row}>
          {REASONS.map((item) => (
            <TouchableOpacity key={item.value} style={[styles.chip, reason === item.value && styles.chipOn]} onPress={() => setReason(item.value)}>
              <Text style={[styles.chipText, reason === item.value && styles.chipTextOn]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>New driver</Text>
        <TouchableOpacity style={[styles.card, driverId === 0 && styles.cardOn]} onPress={() => setDriverId(0)}>
          <Text style={styles.cardTitle}>Keep current driver</Text>
        </TouchableOpacity>
        {drivers.map((driver) => (
          <TouchableOpacity key={driver.id} style={[styles.card, driverId === driver.id && styles.cardOn]} onPress={() => setDriverId(driver.id)}>
            <Text style={styles.cardTitle}>{driver.name}</Text>
            <Text style={styles.meta}>{driver.phone}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.label}>New vehicle</Text>
        <TouchableOpacity style={[styles.card, vehicleId === 0 && styles.cardOn]} onPress={() => setVehicleId(0)}>
          <Text style={styles.cardTitle}>Keep current vehicle</Text>
        </TouchableOpacity>
        {vehicles.map((vehicle) => {
          const id = Number(vehicle.id);
          const number = vehicle.vehicleNumber || vehicle.vehicle_number || 'Vehicle';
          return (
            <TouchableOpacity key={String(vehicle.id)} style={[styles.card, vehicleId === id && styles.cardOn]} onPress={() => setVehicleId(id)}>
              <Text style={styles.cardTitle}>{number}{vehicle.model ? ` · ${vehicle.model}` : ''}</Text>
            </TouchableOpacity>
          );
        })}

        {needsClosingKm ? (
          <>
            <Text style={styles.label}>Closing KM of the vehicle that is stopping</Text>
            <TextInput style={styles.input} value={closingKm} onChangeText={setClosingKm} keyboardType="number-pad" placeholder="Not carried to the next vehicle" />
          </>
        ) : null}
        <Text style={styles.label}>Note</Text>
        <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Optional" />
        <TouchableOpacity style={styles.save} disabled={saving} onPress={() => { void confirm(); }}>
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Confirm Assignment Change'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 13, color: colors.gray600, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginTop: 12, marginBottom: 6 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 10, marginBottom: 8 },
  cardOn: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  cardLocked: { opacity: 0.55 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'capitalize' },
  meta: { fontSize: 12, color: colors.gray600, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  chipTextOn: { color: '#fff' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, padding: 10, color: colors.foreground },
  save: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});
