/**
 * AddPayrollModal - Add new payroll entry (matches web PayrollEntryForm)
 * Driver, basic salary, pay period, allowances, deductions, payment status.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { adminAPI, AdminDriver } from '../services/adminAPI';

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

interface AllowanceRow {
  type: string;
  amount: string;
}

interface PayrollToEdit {
  id?: string | number;
  driverId?: string | number;
  basicSalary?: number;
  payPeriod?: { startDate?: string; endDate?: string };
  daysWorked?: number;
  daysLeave?: number;
  allowances?: Array<{ type: string; amount: number }>;
  deductions?: Array<{ type: string; amount: number }>;
  paymentStatus?: string;
  paymentDate?: string | null;
}

interface AddPayrollModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDriverId?: string | number;
  payrollToEdit?: PayrollToEdit | null;
}

const DEFAULT_ALLOWANCES: AllowanceRow[] = [
  { type: 'batha', amount: '4000' },
  { type: 'fuel', amount: '3000' },
];
const DEFAULT_DEDUCTIONS: AllowanceRow[] = [{ type: 'pf', amount: '1800' }];

export function AddPayrollModal({ visible, onClose, onSuccess, selectedDriverId, payrollToEdit }: AddPayrollModalProps) {
  const now = new Date();
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [driverId, setDriverId] = useState<string>(selectedDriverId?.toString() ?? '');
  const [basicSalary, setBasicSalary] = useState('15000');
  const [payPeriodStart, setPayPeriodStart] = useState<Date>(startOfMonth(now));
  const [payPeriodEnd, setPayPeriodEnd] = useState<Date>(endOfMonth(now));
  const [daysWorked, setDaysWorked] = useState('22');
  const [daysLeave, setDaysLeave] = useState('8');
  const [allowances, setAllowances] = useState<AllowanceRow[]>(DEFAULT_ALLOWANCES);
  const [deductions, setDeductions] = useState<AllowanceRow[]>(DEFAULT_DEDUCTIONS);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      adminAPI.getDrivers().then(setDrivers).catch(() => setDrivers([]));
      if (payrollToEdit) {
        setDriverId(String(payrollToEdit.driverId ?? ''));
        setBasicSalary(String(payrollToEdit.basicSalary ?? 15000));
        setPayPeriodStart(
          payrollToEdit.payPeriod?.startDate ? parseISO(payrollToEdit.payPeriod.startDate) : startOfMonth(now)
        );
        setPayPeriodEnd(
          payrollToEdit.payPeriod?.endDate ? parseISO(payrollToEdit.payPeriod.endDate) : endOfMonth(now)
        );
        setDaysWorked(String(payrollToEdit.daysWorked ?? 22));
        setDaysLeave(String(payrollToEdit.daysLeave ?? 8));
        setAllowances(
          (payrollToEdit.allowances?.length ?? 0) > 0
            ? payrollToEdit.allowances!.map((a) => ({ type: a.type, amount: String(a.amount) }))
            : DEFAULT_ALLOWANCES
        );
        setDeductions(
          (payrollToEdit.deductions?.length ?? 0) > 0
            ? payrollToEdit.deductions!.map((d) => ({ type: d.type, amount: String(d.amount) }))
            : DEFAULT_DEDUCTIONS
        );
        const status = (payrollToEdit.paymentStatus ?? 'pending') as 'pending' | 'paid';
        setPaymentStatus(status);
        setPaymentDate(
          payrollToEdit.paymentDate ? parseISO(payrollToEdit.paymentDate) : null
        );
      } else {
        if (selectedDriverId) setDriverId(selectedDriverId.toString());
        setBasicSalary('15000');
        setPayPeriodStart(startOfMonth(now));
        setPayPeriodEnd(endOfMonth(now));
        setDaysWorked('22');
        setDaysLeave('8');
        setAllowances(DEFAULT_ALLOWANCES);
        setDeductions(DEFAULT_DEDUCTIONS);
        setPaymentStatus('pending');
        setPaymentDate(null);
      }
    }
  }, [visible, selectedDriverId, payrollToEdit]);

  const totalAllowances = allowances.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const netSalary = (parseFloat(basicSalary) || 0) + totalAllowances - totalDeductions;

  const addAllowance = () => setAllowances([...allowances, { type: '', amount: '0' }]);
  const removeAllowance = (i: number) => setAllowances(allowances.filter((_, idx) => idx !== i));
  const updateAllowance = (i: number, field: 'type' | 'amount', value: string) => {
    const next = [...allowances];
    next[i] = { ...next[i], [field]: value };
    setAllowances(next);
  };

  const addDeduction = () => setDeductions([...deductions, { type: '', amount: '0' }]);
  const removeDeduction = (i: number) => setDeductions(deductions.filter((_, idx) => idx !== i));
  const updateDeduction = (i: number, field: 'type' | 'amount', value: string) => {
    const next = [...deductions];
    next[i] = { ...next[i], [field]: value };
    setDeductions(next);
  };

  const filterValid = (rows: AllowanceRow[]) =>
    rows.filter((r) => r.type?.trim() && !isNaN(parseFloat(r.amount)) && parseFloat(r.amount) > 0);

  const handleSubmit = async () => {
    if (!driverId?.trim()) {
      Alert.alert('Validation', 'Select a driver');
      return;
    }
    const basic = parseFloat(basicSalary);
    if (!Number.isFinite(basic) || basic <= 0) {
      Alert.alert('Validation', 'Enter valid basic salary');
      return;
    }
    const filteredAllowances = filterValid(allowances).map((a) => ({
      type: a.type.trim(),
      amount: parseFloat(a.amount),
    }));
    const filteredDeductions = filterValid(deductions).map((d) => ({
      type: d.type.trim(),
      amount: parseFloat(d.amount),
    }));

    setSaving(true);
    try {
      const driverName = drivers.find((d) => String(d.id) === driverId)?.name ?? 'Driver';
      const payPeriod = {
        startDate: format(payPeriodStart, 'yyyy-MM-dd'),
        endDate: format(payPeriodEnd, 'yyyy-MM-dd'),
      };
      const payload = {
        payPeriod,
        basicSalary: basic,
        allowances: filteredAllowances,
        deductions: filteredDeductions,
        daysWorked: parseInt(daysWorked, 10) || 22,
        daysLeave: parseInt(daysLeave, 10) || 8,
        paymentStatus,
        paymentDate: paymentStatus === 'paid' && paymentDate ? format(paymentDate, 'yyyy-MM-dd') : undefined,
      };

      if (payrollToEdit?.id) {
        await adminExtendedAPI.payrollUpdate(payrollToEdit.id, payload);
        onClose();
        onSuccess();
        Alert.alert('Success', 'Payroll entry updated successfully');
      } else {
        await adminExtendedAPI.payrollCreate({
          driverId,
          ...payload,
          description: `Salary for ${format(payPeriodStart, 'MMM yyyy')} - ${driverName}`,
        });
        onClose();
        onSuccess();
        Alert.alert('Success', 'Payroll entry added successfully');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save payroll entry');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{payrollToEdit?.id ? 'Edit Payroll Entry' : 'Add Payroll Entry'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Driver - read-only when editing */}
            <Text style={styles.label}>Driver *</Text>
            {payrollToEdit?.id ? (
              <Text style={styles.driverReadOnly}>
                {drivers.find((d) => String(d.id) === driverId)?.name ?? '—'}
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.driverScroll}>
                {drivers.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.driverChip, driverId === String(d.id) && styles.driverChipActive]}
                    onPress={() => setDriverId(String(d.id))}
                  >
                    <Text style={[styles.driverChipText, driverId === String(d.id) && styles.driverChipTextActive]}>
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Basic Salary */}
            <Text style={styles.label}>Basic Salary *</Text>
            <TextInput
              style={styles.input}
              value={basicSalary}
              onChangeText={setBasicSalary}
              keyboardType="numeric"
              placeholder="15000"
            />

            {/* Pay Period */}
            <Text style={styles.label}>Pay Period</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateBtnText}>{format(payPeriodStart, 'dd MMM yy')}</Text>
              </TouchableOpacity>
              <Text style={styles.dateSep}>–</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateBtnText}>{format(payPeriodEnd, 'dd MMM yy')}</Text>
              </TouchableOpacity>
            </View>
            {showStartPicker && (
              <DateTimePicker
                value={payPeriodStart}
                mode="date"
                onChange={(_, d) => {
                  setShowStartPicker(false);
                  if (d) setPayPeriodStart(d);
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={payPeriodEnd}
                mode="date"
                onChange={(_, d) => {
                  setShowEndPicker(false);
                  if (d) setPayPeriodEnd(d);
                }}
              />
            )}

            {/* Days Worked / Leave */}
            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Days Worked</Text>
                <TextInput
                  style={styles.input}
                  value={daysWorked}
                  onChangeText={setDaysWorked}
                  keyboardType="numeric"
                  placeholder="22"
                />
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Days Leave</Text>
                <TextInput
                  style={styles.input}
                  value={daysLeave}
                  onChangeText={setDaysLeave}
                  keyboardType="numeric"
                  placeholder="8"
                />
              </View>
            </View>

            {/* Allowances */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Allowances</Text>
                <TouchableOpacity onPress={addAllowance} style={styles.addRowBtn}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addRowText}>Add</Text>
                </TouchableOpacity>
              </View>
              {allowances.map((a, i) => (
                <View key={i} style={styles.rowInput}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    value={a.type}
                    onChangeText={(v) => updateAllowance(i, 'type', v)}
                    placeholder="Type (e.g. batha, fuel)"
                  />
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={a.amount}
                    onChangeText={(v) => updateAllowance(i, 'amount', v)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <TouchableOpacity onPress={() => removeAllowance(i)} style={styles.removeBtn}>
                    <Ionicons name="remove-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.totalText}>Total: {formatAmount(totalAllowances)}</Text>
            </View>

            {/* Deductions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Deductions</Text>
                <TouchableOpacity onPress={addDeduction} style={styles.addRowBtn}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addRowText}>Add</Text>
                </TouchableOpacity>
              </View>
              {deductions.map((d, i) => (
                <View key={i} style={styles.rowInput}>
                  <TextInput
                    style={[styles.input, styles.flex1]}
                    value={d.type}
                    onChangeText={(v) => updateDeduction(i, 'type', v)}
                    placeholder="Type (e.g. pf, esi)"
                  />
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={d.amount}
                    onChangeText={(v) => updateDeduction(i, 'amount', v)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <TouchableOpacity onPress={() => removeDeduction(i)} style={styles.removeBtn}>
                    <Ionicons name="remove-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.totalText}>Total: {formatAmount(totalDeductions)}</Text>
            </View>

            {/* Net Salary */}
            <View style={styles.netBox}>
              <Text style={styles.netLabel}>Net Salary</Text>
              <Text style={styles.netValue}>{formatAmount(netSalary)}</Text>
            </View>

            {/* Payment Status */}
            <Text style={styles.label}>Payment Status</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.statusBtn, paymentStatus === 'pending' && styles.statusBtnActive]}
                onPress={() => setPaymentStatus('pending')}
              >
                <Text style={[styles.statusBtnText, paymentStatus === 'pending' && styles.statusBtnTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, paymentStatus === 'paid' && styles.statusBtnActive]}
                onPress={() => setPaymentStatus('paid')}
              >
                <Text style={[styles.statusBtnText, paymentStatus === 'paid' && styles.statusBtnTextActive]}>
                  Paid
                </Text>
              </TouchableOpacity>
            </View>
            {paymentStatus === 'paid' && (
              <>
                <Text style={styles.label}>Payment Date</Text>
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setShowPaymentDatePicker(true)}
                >
                  <Text style={styles.dateBtnText}>
                    {paymentDate ? format(paymentDate, 'dd MMM yy') : 'Pick date'}
                  </Text>
                </TouchableOpacity>
                {showPaymentDatePicker && (
                  <DateTimePicker
                    value={paymentDate ?? new Date()}
                    mode="date"
                    onChange={(_, d) => {
                      setShowPaymentDatePicker(false);
                      if (d) setPaymentDate(d);
                    }}
                  />
                )}
              </>
            )}

            <View style={{ height: 24 }} />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {payrollToEdit?.id ? 'Update Payroll Entry' : 'Create Payroll Entry'}
                </Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  closeBtn: { padding: 4 },
  scroll: { maxHeight: 500 },
  scrollContent: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  half: { flex: 1 },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateBtnText: { fontSize: 15, color: colors.foreground },
  dateSep: { fontSize: 14, color: colors.gray500 },
  driverScroll: { marginBottom: 8, maxHeight: 44 },
  driverReadOnly: { fontSize: 15, color: colors.foreground, fontWeight: '600', marginBottom: 8 },
  driverChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.gray100,
    borderRadius: 20,
    marginRight: 8,
  },
  driverChipActive: { backgroundColor: colors.primary },
  driverChipText: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  driverChipTextActive: { color: '#fff' },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addRowText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  rowInput: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  flex1: { flex: 1 },
  amountInput: { width: 90 },
  removeBtn: { padding: 4 },
  totalText: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginTop: 4 },
  netBox: {
    backgroundColor: colors.gray100,
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  netLabel: { fontSize: 13, color: colors.gray600 },
  netValue: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBtnActive: { backgroundColor: colors.primary },
  statusBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  statusBtnTextActive: { color: '#fff' },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
