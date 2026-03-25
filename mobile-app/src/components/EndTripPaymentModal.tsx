/**
 * Collected fare + payment channel before marking trip completed (driver app).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';

export type DriverEndTripPaymentType =
  | 'company_phonepe'
  | 'self_paid'
  | 'agent_booking'
  | 'corporate_booking';

const OPTIONS: { value: DriverEndTripPaymentType; label: string }[] = [
  { value: 'company_phonepe', label: 'Received — company PhonePe' },
  { value: 'self_paid', label: 'Self (collected by driver)' },
  { value: 'agent_booking', label: 'Agent booking' },
  { value: 'corporate_booking', label: 'Corporate' },
];

interface Props {
  visible: boolean;
  suggestedAmount: number;
  onConfirm: (collectedAmount: number, paymentType: DriverEndTripPaymentType) => void;
  onCancel: () => void;
}

export function EndTripPaymentModal({ visible, suggestedAmount, onConfirm, onCancel }: Props) {
  const [amountText, setAmountText] = useState('');
  const [paymentType, setPaymentType] = useState<DriverEndTripPaymentType>('self_paid');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      const s = Number.isFinite(suggestedAmount) && suggestedAmount > 0 ? Math.round(suggestedAmount) : 0;
      setAmountText(s > 0 ? String(s) : '');
      setPaymentType('self_paid');
      setError('');
    }
  }, [visible, suggestedAmount]);

  const submit = () => {
    const digits = amountText.replace(/[^\d.]/g, '');
    const n = parseFloat(digits);
    if (!Number.isFinite(n) || n < 0) {
      setError('Enter a valid collected amount');
      return;
    }
    setError('');
    onConfirm(Math.round(n * 100) / 100, paymentType);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Payment details</Text>
            <Text style={styles.desc}>How much did you collect and how was it received?</Text>

            <Text style={styles.label}>Collected amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amountText}
              onChangeText={(t) => {
                setAmountText(t.replace(/[^\d.]/g, ''));
                setError('');
              }}
              keyboardType="decimal-pad"
              placeholder="e.g. 11810"
              placeholderTextColor={colors.gray500}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={[styles.label, styles.labelSpaced]}>Payment status</Text>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, paymentType === opt.value && styles.optionActive]}
                onPress={() => setPaymentType(opt.value)}
              >
                <View style={[styles.radio, paymentType === opt.value && styles.radioOn]} />
                <Text style={[styles.optionText, paymentType === opt.value && styles.optionTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.primaryBtn} onPress={submit}>
              <Text style={styles.primaryBtnText}>Complete trip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  scrollContent: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
  desc: { fontSize: 14, color: colors.gray600, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 6 },
  labelSpaced: { marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.gray50,
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 8,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.gray400,
  },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { flex: 1, fontSize: 14, color: colors.foreground },
  optionTextActive: { fontWeight: '600' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: colors.gray600, fontSize: 15, fontWeight: '500' },
});
