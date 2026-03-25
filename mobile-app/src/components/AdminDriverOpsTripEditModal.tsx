import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { colors } from '../theme/colors';
import { adminAPI } from '../services/adminAPI';
import type { DriverDashboardTrip, PaymentType } from '../types/driverDashboard';

const PAYMENT_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'self_paid', label: 'Self' },
  { value: 'company_phonepe', label: 'Company PhonePe' },
  { value: 'company_paid', label: 'Company paid' },
  { value: 'agent_booking', label: 'Agent booking' },
  { value: 'corporate_booking', label: 'Corporate' },
];

const STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'started', label: 'Started' },
  { value: 'on_trip', label: 'On trip' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function parseIsoToDate(iso: string | null | undefined): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toMysqlDateTime(d: Date): string {
  return format(d, 'yyyy-MM-dd HH:mm:00');
}

function inferDefaultStatus(trip: DriverDashboardTrip): string {
  const raw = (trip.bookingStatusRaw || '').trim().toLowerCase();
  if (raw) return raw;
  if (trip.status === 'completed') return 'completed';
  if (trip.status === 'in_progress') return 'in_progress';
  return 'assigned';
}

type Props = {
  visible: boolean;
  trip: DriverDashboardTrip | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminDriverOpsTripEditModal({ visible, trip, onClose, onSaved }: Props) {
  const [journeyDate, setJourneyDate] = useState(new Date());
  const [completedDate, setCompletedDate] = useState(new Date());
  const [showJourneyPicker, setShowJourneyPicker] = useState(false);
  const [showCompletedPicker, setShowCompletedPicker] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [status, setStatus] = useState('assigned');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [startOdo, setStartOdo] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [collected, setCollected] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('self_paid');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fuelNote = useMemo(() => {
    if (!trip) return '';
    return `₹${Number(trip.fuelSpend ?? 0).toFixed(0)} (fuel entries for this trip — edit in Fuel Management)`;
  }, [trip]);

  useEffect(() => {
    if (!trip || !visible) return;
    setJourneyDate(parseIsoToDate(trip.startTime));
    setCompletedDate(parseIsoToDate(trip.completedAt || trip.endTime || trip.startTime));
    setDriverName(trip.driverName || '');
    setVehicleNumber(trip.vehicleNumber || '');
    setPickupLocation(trip.pickupLocation || '');
    setDropLocation(trip.dropLocation || '');
    setStatus(inferDefaultStatus(trip));
    setStartOdo(String(trip.startingOdometer ?? ''));
    setEndOdo(String(trip.endingOdometer ?? ''));
    const dist =
      trip.storedDistanceKm != null && trip.storedDistanceKm > 0
        ? trip.storedDistanceKm
        : trip.totalKilometers;
    setDistanceKm(String(dist ?? ''));
    setTotalAmount(String(trip.tripAmount ?? ''));
    setCollected(
      trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
        ? String(trip.driverCollectedAmount)
        : ''
    );
    setPaymentType((trip.paymentType as PaymentType) || 'self_paid');
    setError(null);
  }, [trip, visible]);

  const paymentLabel = PAYMENT_OPTIONS.find((p) => p.value === paymentType)?.label ?? paymentType;
  const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;

  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);
    setError(null);
    try {
      const pickupSql = toMysqlDateTime(journeyDate);
      if (!pickupSql) {
        setError('Journey date & time is required');
        setSaving(false);
        return;
      }
      const payload: Record<string, unknown> = {
        pickupDate: pickupSql,
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        status: status.trim(),
        startOdometer: parseFloat(startOdo) || 0,
        endOdometer: parseFloat(endOdo) || 0,
        distance: parseFloat(distanceKm) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        paymentType: paymentType.trim(),
      };
      const comp = toMysqlDateTime(completedDate);
      payload.completedAt = comp || null;
      const cTrim = collected.trim();
      if (cTrim === '') {
        payload.driverCollectedAmount = null;
      } else {
        payload.driverCollectedAmount = parseFloat(cTrim);
      }
      await adminAPI.updateBooking(trip.tripId, payload);
      onClose();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!trip) return;
    Alert.alert(
      'Delete this trip?',
      `Permanently remove booking ${trip.tripCode ?? trip.tripId}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            setError(null);
            try {
              await adminAPI.deleteBooking(trip.tripId);
              onClose();
              onSaved();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Failed to delete');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.sheetCancel}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.sheetTitle}>Edit trip</Text>
          <View style={{ width: 48 }} />
        </View>
        {trip ? (
          <Text style={styles.sheetSub}>
            {trip.tripCode} · Booking #{trip.tripId}
          </Text>
        ) : null}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.errText}>{error}</Text> : null}

          <Text style={styles.label}>Journey date & time</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowJourneyPicker(true)}>
            <Text style={styles.dateBtnText}>{format(journeyDate, 'dd MMM yyyy, HH:mm')}</Text>
          </TouchableOpacity>
          {showJourneyPicker && (
            <>
              <DateTimePicker
                value={journeyDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowJourneyPicker(false);
                  if (d) setJourneyDate(d);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneMini} onPress={() => setShowJourneyPicker(false)}>
                  <Text style={styles.doneMiniText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <Text style={styles.label}>Driver name</Text>
          <TextInput style={styles.input} value={driverName} onChangeText={setDriverName} />

          <Text style={styles.label}>Vehicle number</Text>
          <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} />

          <Text style={styles.label}>From (pickup)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            multiline
          />

          <Text style={styles.label}>To (drop)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={dropLocation}
            onChangeText={setDropLocation}
            multiline
          />

          <Text style={styles.label}>Status</Text>
          <TouchableOpacity style={styles.pickBtn} onPress={() => setStatusModalOpen(true)}>
            <Text style={styles.pickBtnText}>{statusLabel}</Text>
          </TouchableOpacity>

          <View style={styles.row2}>
            <View style={styles.half}>
              <Text style={styles.label}>Start ODO</Text>
              <TextInput style={styles.input} value={startOdo} onChangeText={setStartOdo} keyboardType="decimal-pad" />
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>End ODO</Text>
              <TextInput style={styles.input} value={endOdo} onChangeText={setEndOdo} keyboardType="decimal-pad" />
            </View>
          </View>

          <Text style={styles.label}>Distance (km)</Text>
          <TextInput style={styles.input} value={distanceKm} onChangeText={setDistanceKm} keyboardType="decimal-pad" />
          <Text style={styles.hint}>Stored on booking; list may show odometer-derived km when higher.</Text>

          <Text style={styles.label}>Trip end (completed at)</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCompletedPicker(true)}>
            <Text style={styles.dateBtnText}>{format(completedDate, 'dd MMM yyyy, HH:mm')}</Text>
          </TouchableOpacity>
          {showCompletedPicker && (
            <>
              <DateTimePicker
                value={completedDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  if (Platform.OS === 'android') setShowCompletedPicker(false);
                  if (d) setCompletedDate(d);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.doneMini} onPress={() => setShowCompletedPicker(false)}>
                  <Text style={styles.doneMiniText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <Text style={styles.hint}>Used with journey start to compute hours in reports.</Text>

          <Text style={styles.label}>Fuel (read only)</Text>
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>{fuelNote}</Text>
          </View>

          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput style={styles.input} value={totalAmount} onChangeText={setTotalAmount} keyboardType="decimal-pad" />

          <Text style={styles.label}>Collected (₹)</Text>
          <TextInput
            style={styles.input}
            value={collected}
            onChangeText={setCollected}
            keyboardType="decimal-pad"
            placeholder="Empty = clear"
            placeholderTextColor={colors.gray500}
          />

          <Text style={styles.label}>Payment</Text>
          <TouchableOpacity style={styles.pickBtn} onPress={() => setPaymentModalOpen(true)}>
            <Text style={styles.pickBtnText}>{paymentLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving || !trip}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerBtn, deleting && styles.btnDisabled]}
            onPress={confirmDelete}
            disabled={!trip || deleting}
          >
            <Text style={styles.dangerBtnText}>{deleting ? 'Deleting…' : 'Delete trip'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal visible={statusModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setStatusModalOpen(false)}>
          <View style={styles.pickList}>
            <Text style={styles.pickListTitle}>Status</Text>
            <ScrollView>
              {STATUS_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={styles.pickRow}
                  onPress={() => {
                    setStatus(o.value);
                    setStatusModalOpen(false);
                  }}
                >
                  <Text style={styles.pickRowText}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={paymentModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPaymentModalOpen(false)}>
          <View style={styles.pickList}>
            <Text style={styles.pickListTitle}>Payment</Text>
            <ScrollView>
              {PAYMENT_OPTIONS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={styles.pickRow}
                  onPress={() => {
                    setPaymentType(o.value);
                    setPaymentModalOpen(false);
                  }}
                >
                  <Text style={styles.pickRowText}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.gray50 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sheetCancel: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  sheetSub: { fontSize: 13, color: colors.gray600, paddingHorizontal: 16, paddingTop: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 11, color: colors.gray500, marginTop: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  dateBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    padding: 12,
  },
  dateBtnText: { fontSize: 15, color: colors.foreground },
  doneMini: { alignSelf: 'flex-end', padding: 8 },
  doneMiniText: { color: colors.primary, fontWeight: '600' },
  pickBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    padding: 12,
  },
  pickBtnText: { fontSize: 15, color: colors.foreground },
  row2: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  readOnlyBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray300,
    borderRadius: 10,
    padding: 12,
  },
  readOnlyText: { fontSize: 14, color: colors.gray700 },
  errText: { color: '#b91c1c', fontSize: 14, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickList: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '55%',
    paddingBottom: 24,
  },
  pickListTitle: { fontSize: 16, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  pickRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  pickRowText: { fontSize: 16, color: colors.foreground },
});
