/**
 * AdminDriverFormScreen - Add or Edit driver (matches web DriverManagement add/edit)
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { adminAPI, AdminDriver } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDriverAdd' | 'AdminDriverEdit'>;

const STATUS_OPTIONS = ['available', 'busy', 'offline'] as const;

export function AdminDriverFormScreen({ route, navigation }: Props) {
  const { params } = route;
  const driver = (params as { driver?: AdminDriver } | undefined)?.driver;
  const isEdit = !!driver;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('available');
  const [location, setLocation] = useState('Visakhapatnam');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (driver) {
      setName(String(driver.name ?? ''));
      setPhone(String(driver.phone ?? ''));
      setEmail(String(driver.email ?? ''));
      setLicenseNo(String((driver as { license_no?: string }).license_no ?? ''));
      setVehicleType(String(driver.vehicle ?? ''));
      setVehicleNumber(String(driver.vehicleNumber ?? (driver as { vehicle_id?: string }).vehicle_id ?? ''));
      const s = (driver.status ?? 'available') as string;
      setStatus(s === 'available' || s === 'busy' || s === 'offline' ? s : 'available');
      setLocation(String((driver as { location?: string }).location ?? 'Visakhapatnam'));
    }
  }, [driver]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) return 'Phone number must be at least 10 digits';
    if (!licenseNo.trim()) return 'License number is required';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation', err);
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    if (phoneDigits.length !== 10) {
      Alert.alert('Validation', 'Phone number must be exactly 10 digits');
      return;
    }
    setSubmitting(true);
    try {
      // Backend requires non-empty email; use unique placeholder when empty
      const emailVal = email.trim();
      const emailToSend = emailVal || `driver-${phoneDigits}@vizagtaxihub.com`;

      const payload = {
        name: name.trim(),
        phone: phoneDigits,
        email: emailToSend,
        license_no: licenseNo.trim(),
        vehicle: vehicleType.trim(),
        vehicle_id: vehicleNumber.trim(),
        vehicleNumber: vehicleNumber.trim(),
        status,
        location: location.trim() || 'Visakhapatnam',
      };
      if (isEdit && driver?.id != null) {
        await adminAPI.updateDriver(driver.id, payload);
        Alert.alert('Success', 'Driver updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await adminAPI.createDriver(payload);
        Alert.alert('Success', 'Driver added successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e) {
      let msg = 'Failed to save driver';
      if (e instanceof Error) msg = e.message;
      const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
      if (err?.response?.data) {
        const d = err.response.data;
        msg = d?.message || (Array.isArray(d?.errors) ? d.errors.join(', ') : msg);
      }
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!driver?.id) return;
    Alert.alert(
      'Delete Driver',
      'Are you sure you want to delete this driver? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await adminAPI.deleteDriver(driver.id);
              Alert.alert('Deleted', 'Driver has been deleted', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete driver');
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
        <Text style={styles.title}>{isEdit ? 'Edit Driver' : 'Add Driver'}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <FormField label="Driver Name *" value={name} onChangeText={setName} placeholder="e.g., Kumar N" />
          <FormField label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="e.g., 9346588593" keyboardType="phone-pad" />
          <FormField label="Email" value={email} onChangeText={setEmail} placeholder="e.g., driver@example.com" keyboardType="email-address" />
          <FormField label="License Number *" value={licenseNo} onChangeText={setLicenseNo} placeholder="e.g., DL-1234567890" />
          <FormField label="Vehicle Type" value={vehicleType} onChangeText={setVehicleType} placeholder="e.g., Sedan, SUV" />
          <FormField label="Vehicle Number" value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g., AP31AB1234" />
          <FormField label="Location" value={location} onChangeText={setLocation} placeholder="e.g., Visakhapatnam" />

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

          <TouchableOpacity style={[styles.saveBtn, submitting && styles.saveBtnDisabled]} onPress={handleSave} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Add Driver'}</Text>
              </>
            )}
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={[styles.deleteBtn, submitting && styles.saveBtnDisabled]} onPress={handleDelete} disabled={submitting}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete Driver</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray600}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  keyboard: { flex: 1 },
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
});
