/**
 * Admin Expenses - view & add expense entries (mirrors web ExpensesPage + ExpenseEntryForm)
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { adminAPI, AdminFleetVehicle } from '../services/adminAPI';

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

interface ExpenseEntry {
  id?: string | number;
  date?: string;
  description?: string;
  amount?: number;
  category?: string;
  vehicleId?: string | number;
  vehicleNumber?: string;
  [key: string]: unknown;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface ExpenseSummary {
  totalAmount?: number;
  byCategory?: { category: string; amount: number }[];
  byMonth?: { month: string; amount: number }[];
  byPaymentMethod?: { method: string; amount: number }[];
}

const PERIOD_OPTIONS = [
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
] as const;

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'UPI', 'Cheque'];

export function AdminExpensesScreen() {
  const navigation = useNavigation<any>();
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<(typeof PERIOD_OPTIONS)[number]['id']>('month');
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Bank Transfer');
  const [formVendor, setFormVendor] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [vehicles, setVehicles] = useState<AdminFleetVehicle[]>([]);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseEntry | undefined>(undefined);

  const getDateRange = useCallback(() => {
    if (periodType === 'month') {
      const now = new Date();
      return {
        from_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        to_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    }
    if (periodType === 'lastMonth') {
      const now = new Date();
      const last = subMonths(now, 1);
      return {
        from_date: format(startOfMonth(last), 'yyyy-MM-dd'),
        to_date: format(endOfMonth(last), 'yyyy-MM-dd'),
      };
    }
    return {
      from_date: format(startDate, 'yyyy-MM-dd'),
      to_date: format(endDate, 'yyyy-MM-dd'),
    };
  }, [periodType, startDate, endDate]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const range = getDateRange();
      const params: { from_date?: string; to_date?: string; category?: string } = {
        from_date: range.from_date,
        to_date: range.to_date,
      };
      if (categoryFilter) params.category = categoryFilter; // backend matches category name

      const [list, cats, sum] = await Promise.all([
        adminExtendedAPI.expensesList(params),
        adminExtendedAPI.expensesCategories(),
        adminExtendedAPI.expensesSummary(range),
      ]);

      setEntries(Array.isArray(list) ? list : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setSummary(sum ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setEntries([]);
      setCategories([]);
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange, categoryFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const totalAmount = summary?.totalAmount ?? entries.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  const getCategoryName = (catIdOrName: string | undefined) => {
    if (!catIdOrName) return '—';
    const c = categories.find((x) => x.id === catIdOrName || x.name === catIdOrName);
    return c?.name ?? catIdOrName;
  };

  const openAddModal = () => {
    setExpenseToEdit(undefined);
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date());
    setFormCategory(categories[0]?.name ?? '');
    setFormPaymentMethod('Bank Transfer');
    setFormVendor('');
    setFormNotes('');
    setFormVehicleId('');
    setShowAddModal(true);
    adminAPI.getFleetVehicles().then(setVehicles).catch(() => setVehicles([]));
  };

  const openEditModal = (entry: ExpenseEntry) => {
    setExpenseToEdit(entry);
    setFormDescription(String(entry.description ?? ''));
    setFormAmount(String(entry.amount ?? ''));
    setFormDate(entry.date ? new Date(entry.date) : new Date());
    setFormCategory(String(entry.category ?? categories[0]?.name ?? ''));
    setFormPaymentMethod(String((entry as { paymentMethod?: string }).paymentMethod ?? 'Bank Transfer'));
    setFormVendor(String((entry as { vendor?: string }).vendor ?? ''));
    setFormNotes(String((entry as { notes?: string }).notes ?? ''));
    setFormVehicleId(entry.vehicleId != null ? String(entry.vehicleId) : '');
    setShowAddModal(true);
    adminAPI.getFleetVehicles().then(setVehicles).catch(() => setVehicles([]));
  };

  const handleSaveExpense = async () => {
    const desc = formDescription.trim();
    const amt = parseFloat(formAmount.replace(/,/g, ''));
    if (!desc || desc.length < 3) {
      Alert.alert('Validation', 'Description must be at least 3 characters');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      Alert.alert('Validation', 'Enter a valid amount');
      return;
    }
    const cat = formCategory || categories[0]?.name;
    if (!cat) {
      Alert.alert('Validation', 'Select a category');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: desc,
        amount: amt,
        date: format(formDate, 'yyyy-MM-dd'),
        category: cat,
        paymentMethod: formPaymentMethod,
        vehicleId: formVehicleId.trim() || (expenseToEdit?.id ? '' : undefined),
        vendor: formVendor.trim() || undefined,
        notes: formNotes.trim() || undefined,
        status: 'pending',
      };
      if (expenseToEdit?.id) {
        await adminExtendedAPI.expensesUpdate(expenseToEdit.id, payload);
        Alert.alert('Success', 'Expense updated successfully');
      } else {
        await adminExtendedAPI.expensesAdd(payload);
        Alert.alert('Success', 'Expense added successfully');
      }
      setShowAddModal(false);
      setExpenseToEdit(undefined);
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e instanceof Error ? e.message : 'Failed to save expense');
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (entry: ExpenseEntry) => {
    if (!entry.id) return;
    Alert.alert(
      'Delete Expense',
      `Delete "${entry.description ?? 'this expense'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminExtendedAPI.expensesDelete(entry.id!);
              setShowAddModal(false);
              setExpenseToEdit(undefined);
              load();
              Alert.alert('Success', 'Expense deleted');
            } catch (e: unknown) {
              const msg =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (e instanceof Error ? e.message : 'Failed to delete');
              Alert.alert('Error', msg);
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
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Date range & filters */}
      <View style={styles.filters}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodBtn, periodType === p.id && styles.periodBtnActive]}
              onPress={() => setPeriodType(p.id)}
            >
              <Text style={[styles.periodText, periodType === p.id && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {periodType === 'custom' && (
          <View style={styles.rangeRow}>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.rangeText}>{format(startDate, 'dd MMM yy')}</Text>
            </TouchableOpacity>
            <Text style={styles.rangeSep}>–</Text>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.rangeText}>{format(endDate, 'dd MMM yy')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {categories.length > 0 && (
          <View style={styles.categoryRow}>
            <TouchableOpacity
              style={[styles.categoryChip, !categoryFilter && styles.categoryChipActive]}
              onPress={() => setCategoryFilter('')}
            >
              <Text style={[styles.categoryChipText, !categoryFilter && styles.categoryChipTextActive]}>All</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryChip, categoryFilter === c.name && styles.categoryChipActive]}
                onPress={() => setCategoryFilter(categoryFilter === c.name ? '' : c.name)}
              >
                <Text style={[styles.categoryChipText, categoryFilter === c.name && styles.categoryChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowStartPicker(false);
            if (d) setStartDate(d);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowEndPicker(false);
            if (d) setEndDate(d);
          }}
        />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray600} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Summary card */}
          {entries.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalAmount)}</Text>
            </View>
          )}

          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No expense entries</Text>
              <Text style={styles.emptyHint}>Try a different date range or category</Text>
              <TouchableOpacity style={styles.addBtnEmpty} onPress={openAddModal}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnEmptyText}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          ) : (
            entries.map((e, i) => {
              const desc = String(e.description ?? 'Expense');
              const dateStr = (e.date ?? '') as string;
              const cat = getCategoryName((e.category ?? '') as string);
              const amt = Number(e.amount ?? 0);
              const vehicleNum = e.vehicleNumber ?? (e as { vehicle_number?: string }).vehicle_number ?? '';
              const subParts = [dateStr, cat].filter(Boolean);
              if (vehicleNum) subParts.push(vehicleNum);
              const subText = subParts.join(' • ');
              return (
                <TouchableOpacity
                  key={e.id ? String(e.id) : `exp-${i}`}
                  style={styles.card}
                  onPress={() => openEditModal(e)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="cash-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{desc}</Text>
                    <Text style={styles.cardSub}>{subText}</Text>
                    <Text style={styles.amount}>{formatAmount(amt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => !saving && setShowAddModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{expenseToEdit?.id ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => !saving && setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Fuel, Office Rent"
                value={formDescription}
                onChangeText={setFormDescription}
                placeholderTextColor={colors.gray400}
              />
              <Text style={styles.fieldLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formAmount}
                onChangeText={setFormAmount}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.gray400}
              />
              <Text style={styles.fieldLabel}>Date *</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFormDatePicker(true)}>
                <Text style={styles.dateBtnText}>{format(formDate, 'dd MMM yyyy')}</Text>
              </TouchableOpacity>
              {showFormDatePicker && (
                <DateTimePicker
                  value={formDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, d) => {
                    setShowFormDatePicker(false);
                    if (d) setFormDate(d);
                  }}
                />
              )}
              <Text style={styles.fieldLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryOption, formCategory === c.name && styles.categoryOptionActive]}
                    onPress={() => setFormCategory(c.name)}
                  >
                    <Text style={[styles.categoryOptionText, formCategory === c.name && styles.categoryOptionTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.categoryOption, formPaymentMethod === m && styles.categoryOptionActive]}
                    onPress={() => setFormPaymentMethod(m)}
                  >
                    <Text style={[styles.categoryOptionText, formPaymentMethod === m && styles.categoryOptionTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.fieldLabel}>Vehicle (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                <TouchableOpacity
                  style={[styles.categoryOption, !formVehicleId && styles.categoryOptionActive]}
                  onPress={() => setFormVehicleId('')}
                >
                  <Text style={[styles.categoryOptionText, !formVehicleId && styles.categoryOptionTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {vehicles.map((v) => {
                  const label = v.vehicleNumber ?? v.vehicle_number ?? v.name ?? String(v.id);
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.categoryOption, formVehicleId === String(v.id) && styles.categoryOptionActive]}
                      onPress={() => setFormVehicleId(String(v.id))}
                    >
                      <Text
                        style={[styles.categoryOptionText, formVehicleId === String(v.id) && styles.categoryOptionTextActive]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.fieldLabel}>Vendor (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Vendor name"
                value={formVendor}
                onChangeText={setFormVendor}
                placeholderTextColor={colors.gray400}
              />
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Additional notes"
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
                placeholderTextColor={colors.gray400}
              />
              <View style={styles.modalActions}>
                {expenseToEdit?.id && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteExpense(expenseToEdit)}
                    disabled={saving}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                  onPress={handleSaveExpense}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {expenseToEdit?.id ? 'Update Expense' : 'Save Expense'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, flex: 1 },
  addBtn: { padding: 4 },
  filters: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  periodTextActive: { color: '#fff' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  rangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  rangeText: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  rangeSep: { fontSize: 14, color: colors.gray500 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: 20,
  },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryChipText: { fontSize: 12, color: colors.gray600, fontWeight: '500' },
  categoryChipTextActive: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.primary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: '#dc2626', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.gray400, marginTop: 4 },
  addBtnEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  addBtnEmptyText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  modalScroll: { padding: 16, maxHeight: 400 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  dateBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  dateBtnText: { fontSize: 16, color: colors.foreground },
  categoryPicker: { marginBottom: 8 },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.gray100,
    borderRadius: 8,
    marginRight: 8,
  },
  categoryOptionActive: { backgroundColor: colors.primary },
  categoryOptionText: { fontSize: 14, color: colors.gray600, fontWeight: '500' },
  categoryOptionTextActive: { color: '#fff' },
  modalActions: { marginTop: 24, marginBottom: 32, gap: 12 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
  },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
