/**
 * FuelEntryScreen - Driver fuel entry with receipt capture, OCR, payment method
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { driverTripsAPI } from '../services/driverTripsAPI';
import { uploadImage } from '../services/driverTripsAPI';
import { FuelCaptureModal, FuelCaptureResult, ParsedFuelType } from '../components/FuelCaptureModal';
import * as ImagePicker from 'expo-image-picker';
import type { DriverTrip } from '../services/driverTripsAPI';

const PAYMENT_OPTIONS: { value: 'card' | 'customer_advance' | 'company_paid'; label: string }[] = [
  { value: 'card', label: 'Card (**** 1234)' },
  { value: 'customer_advance', label: 'Customer Advance' },
  { value: 'company_paid', label: 'Company Paid' },
];

const FUEL_TYPE_OPTIONS: { value: ParsedFuelType; label: string }[] = [
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' },
  { value: 'Electric', label: 'Electric' },
];

const TAB_BAR_HEIGHT = 56;

function normalizeVehicleNo(s: string): string {
  return s.replace(/\s/g, '').toLowerCase();
}

export function FuelEntryScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialBookingId = params?.bookingId ?? null;
  const scrollBottomPadding = insets.bottom + TAB_BAR_HEIGHT + 32;

  const [vehicles, setVehicles] = useState<{ id: number; vehicleNumber: string; name: string }[]>([]);
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCapture, setShowCapture] = useState(false);

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(initialBookingId);
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'customer_advance' | 'company_paid'>('company_paid');
  const [cardLastFour, setCardLastFour] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<ParsedFuelType>('Petrol');
  const [vehicleLocked, setVehicleLocked] = useState(false);

  const selectedTrip = useMemo(
    () => (bookingId != null ? trips.find((t) => t.id === bookingId) ?? null : null),
    [bookingId, trips]
  );

  const load = useCallback(async () => {
    try {
      const [vList, tList] = await Promise.all([driverTripsAPI.getVehicles(), driverTripsAPI.getTrips()]);
      setVehicles(vList);
      setTrips(tList.filter((t) => t.status === 'in_progress' || t.status === 'assigned'));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!loading && initialBookingId != null && trips.some((t) => t.id === initialBookingId)) {
      setBookingId(initialBookingId);
    }
  }, [loading, initialBookingId, trips]);

  useEffect(() => {
    if (!selectedTrip) {
      setVehicleLocked(false);
      return;
    }
    const fid = selectedTrip.fleetVehicleId;
    if (fid != null && fid > 0 && vehicles.some((v) => v.id === fid)) {
      setVehicleId(fid);
      setVehicleLocked(true);
      return;
    }
    const vn = (selectedTrip.vehicleNumber || '').trim();
    if (!vn) {
      setVehicleLocked(false);
      return;
    }
    const match = vehicles.find((v) => normalizeVehicleNo(v.vehicleNumber) === normalizeVehicleNo(vn));
    if (match) {
      setVehicleId(match.id);
      setVehicleLocked(true);
    } else {
      setVehicleLocked(false);
    }
  }, [selectedTrip, vehicles]);

  const onCaptureResult = async (result: FuelCaptureResult) => {
    setTotalCost(String(result.amount));
    if (result.liters > 0) setQuantity(String(result.liters));
    if (result.fuelStation) setFuelStation(result.fuelStation);
    if (result.fuelType) setFuelType(result.fuelType);
    if (vehicleLocked) return;
    const match = vehicles.find(
      (v) =>
        v.vehicleNumber === result.vehicleNumber ||
        normalizeVehicleNo(v.vehicleNumber) === normalizeVehicleNo(result.vehicleNumber || '')
    );
    if (match) setVehicleId(match.id);
  };

  const handleCaptureReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Camera permission is required');
      return;
    }
    setShowCapture(true);
  };

  const handleCaptureComplete = async (result: FuelCaptureResult) => {
    setShowCapture(false);
    onCaptureResult(result);
    setReceiptUri(result.imageUri);
  };

  const handleManualFallback = (imageUri: string) => {
    setShowCapture(false);
    setReceiptUri(imageUri);
  };

  const handleSubmit = async () => {
    if (!vehicleId) {
      Alert.alert('Validation', 'Please select a vehicle');
      return;
    }
    const q = parseFloat(quantity);
    const t = parseFloat(totalCost);
    if (isNaN(q) || q <= 0 || isNaN(t) || t <= 0) {
      Alert.alert('Validation', 'Quantity and total cost are required');
      return;
    }
    const odo = parseInt(odometer.replace(/\D/g, ''), 10);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Validation', 'Odometer reading is required');
      return;
    }
    if (paymentMethod === 'card' && cardLastFour.replace(/\D/g, '').length !== 4) {
      Alert.alert('Validation', 'Enter last 4 digits of card');
      return;
    }

    setSubmitting(true);
    try {
      let receiptUrl = '';
      if (receiptUri && (receiptUri.startsWith('file') || receiptUri.startsWith('content'))) {
        receiptUrl = await uploadImage(receiptUri);
      }

      await driverTripsAPI.submitFuelEntry({
        vehicleId,
        bookingId: bookingId || undefined,
        quantity: q,
        pricePerUnit: t / q,
        totalCost: t,
        odometer: odo,
        fuelType,
        fuelStation: fuelStation || undefined,
        paymentMethod,
        cardLastFour: paymentMethod === 'card' ? cardLastFour.replace(/\D/g, '').slice(-4) : undefined,
        receiptImageUrl: receiptUrl || undefined,
      });

      Alert.alert('Success', 'Fuel entry saved', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Fuel Entry</Text>
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Fuel Entry</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <TouchableOpacity style={styles.captureBtn} onPress={handleCaptureReceipt}>
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.captureBtnText}>Capture Fuel Bill</Text>
        </TouchableOpacity>

        <Field label="Vehicle *">
          {vehicleLocked && selectedTrip?.vehicleNumber ? (
            <Text style={styles.lockedHint}>Locked to trip vehicle ({selectedTrip.vehicleNumber.trim() || 'assigned'})</Text>
          ) : null}
          <View style={styles.pickerRow}>
            {vehicles.map((v) => {
              const disabled = vehicleLocked && vehicleId !== v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  disabled={disabled}
                  style={[
                    styles.pickerBtn,
                    vehicleId === v.id && styles.pickerBtnActive,
                    disabled && styles.pickerBtnDisabled,
                  ]}
                  onPress={() => {
                    if (!vehicleLocked) setVehicleId(v.id);
                  }}
                >
                  <Text style={[styles.pickerBtnText, vehicleId === v.id && styles.pickerBtnTextActive, disabled && styles.pickerBtnTextDisabled]}>
                    {v.vehicleNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="Link to Trip (optional)">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tripChip, !bookingId && styles.tripChipActive]}
              onPress={() => setBookingId(null)}
            >
              <Text style={[styles.tripChipText, !bookingId && styles.tripChipTextActive]}>None</Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripChip, bookingId === t.id && styles.tripChipActive]}
                onPress={() => setBookingId(t.id)}
              >
                <Text style={[styles.tripChipText, bookingId === t.id && styles.tripChipTextActive]}>{t.bookingNumber}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Quantity (liters) *">
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g., 35"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.gray500}
          />
        </Field>

        <Field label="Total Cost (₹) *">
          <TextInput
            style={styles.input}
            value={totalCost}
            onChangeText={setTotalCost}
            placeholder="e.g., 3150"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.gray500}
          />
        </Field>

        <Field label="Fuel type *">
          <View style={styles.pickerRow}>
            {FUEL_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerBtn, fuelType === opt.value && styles.pickerBtnActive]}
                onPress={() => setFuelType(opt.value)}
              >
                <Text style={[styles.pickerBtnText, fuelType === opt.value && styles.pickerBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Odometer *">
          <TextInput
            style={styles.input}
            value={odometer}
            onChangeText={setOdometer}
            placeholder="e.g., 45230"
            keyboardType="number-pad"
            placeholderTextColor={colors.gray500}
          />
        </Field>

        <Field label="Fuel Station">
          <TextInput
            style={styles.input}
            value={fuelStation}
            onChangeText={setFuelStation}
            placeholder="e.g., HP Petrol"
            placeholderTextColor={colors.gray500}
          />
        </Field>

        <Field label="Payment Method *">
          {PAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.paymentBtn, paymentMethod === opt.value && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(opt.value)}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === opt.value && styles.paymentBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          {paymentMethod === 'card' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={cardLastFour}
              onChangeText={(t) => setCardLastFour(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="Last 4 digits"
              keyboardType="number-pad"
              placeholderTextColor={colors.gray500}
              maxLength={4}
            />
          )}
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Save Fuel Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <FuelCaptureModal
        visible={showCapture}
        onClose={() => setShowCapture(false)}
        onResult={handleCaptureComplete}
        onManualFallback={handleManualFallback}
      />
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 24,
  },
  captureBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 8 },
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
  pickerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff' },
  pickerBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerBtnDisabled: { opacity: 0.38 },
  pickerBtnText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  pickerBtnTextActive: { color: '#fff' },
  pickerBtnTextDisabled: { color: colors.gray500 },
  lockedHint: { fontSize: 12, color: colors.gray600, marginBottom: 8 },
  tripChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff', marginRight: 8 },
  tripChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripChipText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  tripChipTextActive: { color: '#fff' },
  paymentBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff', marginBottom: 8 },
  paymentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentBtnText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  paymentBtnTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.7 },
});
