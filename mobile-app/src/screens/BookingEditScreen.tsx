/**
 * BookingEditScreen - Edit booking details (admin)
 * Matches web: passenger, pickup/drop, date, extra charges, billing summary, discounts, payment
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminAPI } from '../services/adminAPI';
import type { RootStackParamList } from '../navigation/types';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { format } from 'date-fns';

type Route = RouteProp<RootStackParamList, 'BookingEdit'>;

interface ExtraCharge {
  amount: number;
  description: string;
}

const PAYMENT_STATUS_OPTIONS = ['pending', 'partial', 'paid', 'refunded', 'failed'] as const;
const PAYMENT_METHOD_OPTIONS = ['cash', 'card', 'upi', 'net_banking', 'wallet', 'cheque'] as const;
const DISCOUNT_TYPES = ['fixed', 'percentage'] as const;

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BookingEditScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<Route>();
  const booking = params?.booking as Record<string, unknown> | undefined;
  const bookingId =
    (params?.bookingId as number | undefined) ??
    (typeof booking?.id === 'number' ? booking.id : parseInt(String(booking?.id ?? 0), 10));

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date());
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeDesc, setNewChargeDesc] = useState('');
  const [baseAmount, setBaseAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const b = await adminAPI.getBookingById(bookingId);
        const bAny = b as Record<string, unknown>;
        setPickupLocation(String(bAny.pickupLocation ?? bAny.pickup_location ?? ''));
        setDropLocation(String(bAny.dropLocation ?? bAny.drop_location ?? ''));
        setPassengerName(String(bAny.passengerName ?? bAny.passenger_name ?? ''));
        setPassengerPhone(String(bAny.passengerPhone ?? bAny.passenger_phone ?? ''));
        setPassengerEmail(String(bAny.passengerEmail ?? bAny.passenger_email ?? ''));
        setBillingAddress(String(bAny.billingAddress ?? bAny.billing_address ?? ''));
        setAdminNotes(String(bAny.adminNotes ?? bAny.admin_notes ?? ''));
        setPaymentStatus(String(bAny.paymentStatus ?? bAny.payment_status ?? 'pending'));
        setPaymentMethod(String(bAny.paymentMethod ?? bAny.payment_method ?? ''));

        const rawExtra = bAny.extraCharges ?? bAny.extra_charges;
        const charges: ExtraCharge[] = Array.isArray(rawExtra)
          ? rawExtra.map((c: { amount?: number; description?: string }) => ({
              amount: typeof c.amount === 'number' ? c.amount : parseFloat(String(c.amount ?? 0)) || 0,
              description: String(c.description ?? (c as { label?: string }).label ?? ''),
            }))
          : [];
        setExtraCharges(charges);

        const totalNum = typeof bAny.totalAmount === 'number' ? bAny.totalAmount : parseFloat(String(bAny.total_amount ?? 0)) || 0;
        const extraSum = charges.reduce((s, c) => s + c.amount, 0);
        setBaseAmount(Math.max(0, totalNum - extraSum));

        const pd = bAny.pickup_date as string;
        const pt = (bAny.pickup_time ?? bAny.pickupTime) as string | undefined;
        if (pd) {
          const timePart = pt && /^\d{1,2}:\d{2}/.test(String(pt)) ? String(pt).slice(0, 5) : '00:00';
          const dt = pd.includes('T') ? new Date(pd) : new Date(`${pd}T${timePart}:00`);
          if (!isNaN(dt.getTime())) setPickupDate(dt);
        }
      } catch {
        Alert.alert('Error', 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  const extraChargesTotal = useMemo(() => extraCharges.reduce((s, c) => s + c.amount, 0), [extraCharges]);

  const discountAmount = useMemo(() => {
    const v = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') return Math.round((baseAmount * Math.min(100, v)) / 100);
    return Math.max(0, v);
  }, [discountType, discountValue, baseAmount]);

  const totalAmount = useMemo(
    () => Math.max(0, baseAmount + extraChargesTotal - discountAmount),
    [baseAmount, extraChargesTotal, discountAmount]
  );

  const addExtraCharge = () => {
    const amt = parseFloat(newChargeAmount) || 0;
    const desc = newChargeDesc.trim();
    if (amt <= 0 || !desc) return;
    setExtraCharges((prev) => [...prev, { amount: amt, description: desc }]);
    setNewChargeAmount('');
    setNewChargeDesc('');
  };

  const removeExtraCharge = (idx: number) => {
    setExtraCharges((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!bookingId) return;
    if (!passengerName.trim() || !passengerPhone.trim()) {
      Alert.alert('Validation', 'Passenger name and phone are required');
      return;
    }
    setSubmitting(true);
    try {
      const pickupDateStr = format(pickupDate, 'yyyy-MM-dd HH:mm:ss');
      const safeTotal = Number.isFinite(totalAmount) && totalAmount >= 0 ? Math.round(totalAmount) : 0;
      await adminAPI.updateBooking(bookingId, {
        pickupLocation: pickupLocation.trim() || undefined,
        dropLocation: dropLocation.trim() || undefined,
        pickupDate: pickupDateStr,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim() || undefined,
        billingAddress: billingAddress.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
        extraCharges: extraCharges.length > 0 ? extraCharges : [],
        totalAmount: safeTotal,
      });
      Alert.alert('Saved', 'Booking updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err?.message ??
        err?.response?.data?.message ??
        'Failed to update booking';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Booking</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Booking</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Pickup Location</Text>
          <TextInput
            style={styles.input}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholder="Enter pickup address"
            placeholderTextColor={colors.gray600}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Drop Location</Text>
          <TextInput
            style={styles.input}
            value={dropLocation}
            onChangeText={setDropLocation}
            placeholder="Enter drop address"
            placeholderTextColor={colors.gray600}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Date & Time</Text>
          <DateTimePickerComponent
            label=""
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={new Date(2020, 0, 1)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>PASSENGER</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={passengerName}
            onChangeText={setPassengerName}
            placeholder="Passenger name"
            placeholderTextColor={colors.gray600}
          />
          <Text style={[styles.label, { marginTop: 12 }]}>Phone</Text>
          <TextInput
            style={styles.input}
            value={passengerPhone}
            onChangeText={setPassengerPhone}
            placeholder="Phone number"
            placeholderTextColor={colors.gray600}
            keyboardType="phone-pad"
          />
          <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
          <TextInput
            style={styles.input}
            value={passengerEmail}
            onChangeText={setPassengerEmail}
            placeholder="Email (optional)"
            placeholderTextColor={colors.gray600}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Billing Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={billingAddress}
            onChangeText={setBillingAddress}
            placeholder="Billing address (optional)"
            placeholderTextColor={colors.gray600}
            multiline
          />
        </View>

        {/* Extra Charges */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXTRA CHARGES</Text>
          {extraCharges.length > 0 ? (
            extraCharges.map((c, idx) => (
              <View key={idx} style={styles.chargeRow}>
                <View style={styles.chargeInfo}>
                  <Text style={styles.chargeDesc}>{c.description}</Text>
                  <Text style={styles.chargeAmt}>{formatCurrency(c.amount)}</Text>
                </View>
                <TouchableOpacity onPress={() => removeExtraCharge(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.noCharges}>No extra charges added</Text>
          )}
          <View style={styles.addChargeRow}>
            <TextInput
              style={[styles.input, styles.addChargeInput]}
              placeholder="Description"
              placeholderTextColor={colors.gray600}
              value={newChargeDesc}
              onChangeText={setNewChargeDesc}
            />
            <TextInput
              style={[styles.input, styles.addChargeInput, { flex: 0.6 }]}
              placeholder="₹ Amount"
              placeholderTextColor={colors.gray600}
              value={newChargeAmount}
              onChangeText={setNewChargeAmount}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.addBtn, (!newChargeDesc.trim() || !parseFloat(newChargeAmount)) && styles.addBtnDisabled]}
              onPress={addExtraCharge}
              disabled={!newChargeDesc.trim() || !parseFloat(newChargeAmount)}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing & Discounts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PRICING & DISCOUNTS</Text>
          <Text style={styles.label}>Base Amount (₹)</Text>
          <TextInput
            style={styles.input}
            value={baseAmount > 0 ? String(baseAmount) : ''}
            onChangeText={(v) => setBaseAmount(Math.max(0, parseFloat(v) || 0))}
            placeholder="0"
            placeholderTextColor={colors.gray600}
            keyboardType="numeric"
          />
          <View style={[styles.discountRow, { marginTop: 12 }]}>
            <Text style={styles.label}>Discount Type</Text>
            <View style={styles.chipRow}>
              {DISCOUNT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, discountType === t && styles.chipActive]}
                  onPress={() => setDiscountType(t)}
                >
                  <Text style={[styles.chipText, discountType === t && styles.chipTextActive]}>
                    {t === 'fixed' ? 'Fixed (₹)' : 'Percentage (%)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.label}>Discount {discountType === 'percentage' ? 'Percentage' : 'Amount'}</Text>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            placeholder={discountType === 'percentage' ? '0-100' : '0'}
            placeholderTextColor={colors.gray600}
            keyboardType="numeric"
          />
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>PAYMENT DETAILS</Text>
          <Text style={styles.label}>Payment Status</Text>
          <View style={styles.chipRow}>
            {PAYMENT_STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chipSmall, paymentStatus === s && styles.chipActive]}
                onPress={() => setPaymentStatus(s)}
              >
                <Text style={[styles.chipText, paymentStatus === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 12 }]}>Payment Method</Text>
          <View style={styles.chipRow}>
            {PAYMENT_METHOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chipSmall, paymentMethod === m && styles.chipActive]}
                onPress={() => setPaymentMethod(m)}
              >
                <Text style={[styles.chipText, paymentMethod === m && styles.chipTextActive]}>
                  {m.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Admin Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ADMIN NOTES</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={adminNotes}
            onChangeText={setAdminNotes}
            placeholder="Internal notes for this booking..."
            placeholderTextColor={colors.gray600}
            multiline
          />
        </View>

        {/* Billing Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>BILLING SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(baseAmount)}</Text>
          </View>
          {extraChargesTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Extra Charges</Text>
              <Text style={styles.summaryValue}>+{formatCurrency(extraChargesTotal)}</Text>
            </View>
          )}
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>-{formatCurrency(discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray600,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  label: { fontSize: 13, fontWeight: '500', color: colors.gray600, marginBottom: 6 },
  input: {
    backgroundColor: colors.gray50,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    marginBottom: 8,
  },
  chargeInfo: { flex: 1 },
  chargeDesc: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  chargeAmt: { fontSize: 14, color: colors.gray600, marginTop: 2 },
  noCharges: { fontSize: 13, color: colors.gray600, fontStyle: 'italic', marginBottom: 12 },
  addChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addChargeInput: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  chipTextActive: { color: '#fff' },
  discountRow: { marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: colors.gray600 },
  summaryValue: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray200 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  totalValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
