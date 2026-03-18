/**
 * AdminVehicleFormScreen - Add or Edit fleet vehicle (matches web FleetManagement add/edit)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI, AdminFleetVehicle } from '../services/adminAPI';
import { EditVehicleTypeModal } from '../components/EditVehicleTypeModal';
import type { RootStackParamList } from '../navigation/types';

/** Map fleet vehicle type to API vehicle type ID (matches web vehicles-data) */
function toVehicleTypeId(vehicleType: string, name?: string): string {
  const v = (vehicleType || '').toLowerCase().replace(/\s+/g, '_');
  const n = (name || '').toLowerCase();
  if (n.includes('amaze')) return 'amaze';
  if (n.includes('ertiga')) return 'ertiga';
  if (n.includes('innova') || n.includes('crysta')) return 'innova_crysta';
  if (n.includes('glanza')) return 'toyota_glanza';
  if (n.includes('tempo') || n.includes('traveller')) return 'tempo_traveller';
  if (v === 'tempo') return 'tempo_traveller';
  if (v === 'sedan' || v === 'swift' || v === 'dzire') return 'sedan';
  if (v === 'suv' || v === 'innova') return 'innova_crysta';
  if (v === 'minivan' || v === 'mpv') return 'ertiga';
  return v || 'sedan';
}

type Route = RouteProp<RootStackParamList, 'AdminVehicleAdd' | 'AdminVehicleEdit'>;

const STATUS_OPTIONS = ['Active', 'Maintenance', 'Inactive'] as const;
const FUEL_OPTIONS = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'] as const;
const VEHICLE_TYPES = ['sedan', 'suv', 'hatchback', 'minivan', 'tempo', 'luxury'] as const;

export function AdminVehicleFormScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const vehicle = (params as { vehicle?: AdminFleetVehicle })?.vehicle;
  const isEdit = !!vehicle;

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [name, setName] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState<'Active' | 'Maintenance' | 'Inactive'>('Active');
  const [fuelType, setFuelType] = useState('Petrol');
  const [vehicleType, setVehicleType] = useState('sedan');
  const [capacity, setCapacity] = useState('4');
  const [luggageCapacity, setLuggageCapacity] = useState('2');
  const [emi, setEmi] = useState('');
  const [lastService, setLastService] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [lastServiceOdometer, setLastServiceOdometer] = useState('');
  const [nextServiceDue, setNextServiceDue] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [nextServiceOdometer, setNextServiceOdometer] = useState('');
  const [showLastServicePicker, setShowLastServicePicker] = useState(false);
  const [showNextServicePicker, setShowNextServicePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(String(vehicle.vehicleNumber ?? vehicle.vehicle_number ?? ''));
      setName(String(vehicle.name ?? ''));
      setMake(String(vehicle.make ?? ''));
      setModel(String(vehicle.model ?? ''));
      setYear(String(vehicle.year ?? new Date().getFullYear()));
      setStatus((vehicle.status as 'Active' | 'Maintenance' | 'Inactive') ?? 'Active');
      const v = vehicle as unknown as Record<string, unknown>;
      setFuelType(String(v?.fuelType ?? 'Petrol'));
      setVehicleType(String(v?.vehicleType ?? v?.cabTypeId ?? 'sedan'));
      setCapacity(String((v?.capacity as number) ?? 4));
      setLuggageCapacity(String((v?.luggageCapacity as number) ?? 2));
      const emiVal = v?.emi;
      setEmi(emiVal != null && emiVal !== '' ? String(emiVal) : '');
      const ls = v?.lastService as string | undefined;
      setLastService(ls ? new Date(ls) : new Date());
      setLastServiceOdometer(String((v?.lastServiceOdometer as number) ?? ''));
      const ns = v?.nextServiceDue as string | undefined;
      setNextServiceDue(ns ? new Date(ns) : (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 3);
        return d;
      })());
      setNextServiceOdometer(String((v?.nextServiceOdometer as number) ?? ''));
    }
  }, [vehicle]);

  const handleSave = async () => {
    const vNum = vehicleNumber.trim();
    if (!vNum) {
      Alert.alert('Validation', 'Vehicle number is required');
      return;
    }
    const makeVal = make.trim();
    if (!makeVal) {
      Alert.alert('Validation', 'Make is required');
      return;
    }
    const modelVal = model.trim();
    if (!modelVal) {
      Alert.alert('Validation', 'Model is required');
      return;
    }
    setSubmitting(true);
    try {
      const lastServiceStr = format(lastService, 'yyyy-MM-dd');
      const nextServiceStr = format(nextServiceDue, 'yyyy-MM-dd');
      const emiNum = emi.trim() ? parseFloat(emi) : undefined;
      const payload: Partial<AdminFleetVehicle> & Record<string, unknown> = {
        vehicleNumber: vNum,
        name: name.trim() || vNum,
        make: makeVal,
        model: modelVal,
        year: parseInt(year, 10) || new Date().getFullYear(),
        status,
        fuelType,
        vehicleType,
        cabTypeId: vehicleType,
        capacity: parseInt(capacity, 10) || 4,
        luggageCapacity: parseInt(luggageCapacity, 10) || 2,
        lastService: lastServiceStr,
        nextServiceDue: nextServiceStr,
        lastServiceOdometer: lastServiceOdometer.trim() ? parseInt(lastServiceOdometer, 10) : 0,
        nextServiceOdometer: nextServiceOdometer.trim() ? parseInt(nextServiceOdometer, 10) : 5000,
        ...(emiNum != null && !Number.isNaN(emiNum) ? { emi: emiNum } : {}),
      };
      if (isEdit && vehicle?.id != null) {
        await adminAPI.updateFleetVehicle(vehicle.id, payload);
        Alert.alert('Success', 'Vehicle updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await adminAPI.createFleetVehicle(payload);
        Alert.alert('Success', 'Vehicle added successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!vehicle?.id) return;
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to delete this vehicle? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await adminAPI.deleteFleetVehicle(vehicle.id);
              Alert.alert('Deleted', 'Vehicle has been deleted', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete vehicle');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FormField label="Vehicle Number *" value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g., AP31AB1234" />
        <FormField label="Display Name" value={name} onChangeText={setName} placeholder="e.g., Fleet Car 01" />
        <FormField label="Make *" value={make} onChangeText={setMake} placeholder="e.g., Toyota" />
        <FormField label="Model *" value={model} onChangeText={setModel} placeholder="e.g., Innova Crysta" />
        <FormField label="Year" value={year} onChangeText={setYear} placeholder="e.g., 2023" keyboardType="number-pad" />

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.pickerRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerBtn, status === s && styles.pickerBtnActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.pickerBtnText, status === s && styles.pickerBtnTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Fuel Type</Text>
          <View style={styles.pickerRow}>
            {FUEL_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.pickerBtn, fuelType === f && styles.pickerBtnActive]}
                onPress={() => setFuelType(f)}
              >
                <Text style={[styles.pickerBtnText, fuelType === f && styles.pickerBtnTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.pickerRow}>
            {VEHICLE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.pickerBtn, vehicleType === t && styles.pickerBtnActive]}
                onPress={() => setVehicleType(t)}
              >
                <Text style={[styles.pickerBtnText, vehicleType === t && styles.pickerBtnTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <FormField label="Seating Capacity" value={capacity} onChangeText={setCapacity} placeholder="4" keyboardType="number-pad" />
        <FormField label="Luggage Capacity" value={luggageCapacity} onChangeText={setLuggageCapacity} placeholder="2" keyboardType="number-pad" />
        <FormField label="Vehicle EMI (₹)" value={emi} onChangeText={setEmi} placeholder="Optional" keyboardType="number-pad" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Service Information</Text>
        </View>
        <View style={styles.serviceRow}>
          <Text style={styles.label}>Last Service Date</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowLastServicePicker(true)}>
            <Text style={styles.inputText}>{format(lastService, 'yyyy-MM-dd')}</Text>
          </TouchableOpacity>
          {showLastServicePicker && (
            <>
              <DateTimePicker
                value={lastService}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (d) setLastService(d);
                  if (Platform.OS === 'android') setShowLastServicePicker(false);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowLastServicePicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        <FormField label="Last Service Odometer (km)" value={lastServiceOdometer} onChangeText={setLastServiceOdometer} placeholder="0" keyboardType="number-pad" />
        <View style={styles.serviceRow}>
          <Text style={styles.label}>Next Service Due</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowNextServicePicker(true)}>
            <Text style={styles.inputText}>{format(nextServiceDue, 'yyyy-MM-dd')}</Text>
          </TouchableOpacity>
          {showNextServicePicker && (
            <>
              <DateTimePicker
                value={nextServiceDue}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (d) setNextServiceDue(d);
                  if (Platform.OS === 'android') setShowNextServicePicker(false);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneBtn} onPress={() => setShowNextServicePicker(false)}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        <FormField label="Next Service Odometer (km)" value={nextServiceOdometer} onChangeText={setNextServiceOdometer} placeholder="5000" keyboardType="number-pad" />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Type Details</Text>
          <Text style={styles.sectionHint}>Amenities, inactive dates, inclusions, exclusions (matches web Edit Vehicle)</Text>
        </View>
        <TouchableOpacity
          style={styles.vehicleTypeBtn}
          onPress={() => setShowVehicleTypeModal(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.vehicleTypeBtnText}>Edit amenities & inactive dates</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.gray600} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} onPress={handleSave} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Vehicle'}</Text>
            </>
          )}
        </TouchableOpacity>

        {isEdit && (
          <TouchableOpacity style={[styles.deleteBtn, submitting && styles.saveBtnDisabled]} onPress={handleDelete} disabled={submitting}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteBtnText}>Delete Vehicle</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <EditVehicleTypeModal
        visible={showVehicleTypeModal}
        vehicleId={toVehicleTypeId(vehicleType, name)}
        vehicleName={name || vehicleType}
        onClose={() => setShowVehicleTypeModal(false)}
      />
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray600}
        keyboardType={keyboardType}
        editable={editable}
      />
    </View>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  fieldRow: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  inputDisabled: { backgroundColor: colors.gray100, color: colors.gray600 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: '#fff',
  },
  pickerBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerBtnText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  pickerBtnTextActive: { color: '#fff' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  sectionHeader: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  sectionHint: { fontSize: 12, color: colors.gray600, marginBottom: 10 },
  vehicleTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    backgroundColor: `${colors.primary}10`,
  },
  vehicleTypeBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  serviceRow: { marginBottom: 16 },
  inputText: { fontSize: 15, color: colors.foreground },
  doneBtn: { marginTop: 8, padding: 8, alignItems: 'flex-end' },
  doneText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
});
