/**
 * Admin Payments — mirrors web Payment Management (payments.php + summary).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';

function formatAmount(n: number) {
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatAmountDetail(n: number) {
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PaymentRow {
  id?: string | number;
  bookingId?: string | number;
  bookingNumber?: string;
  booking_number?: string;
  customerName?: string;
  amount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  payment_status?: string;
  paymentMethod?: string;
  payment_method?: string;
  dueDate?: string;
  due_date?: string;
}

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'upi', label: 'UPI' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'cheque', label: 'Cheque' },
  { id: 'razorpay', label: 'Razorpay' },
  { id: 'other', label: 'Other' },
];

const STATUS_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'partial', label: 'Partial' },
  { id: 'paid', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
] as const;

function rowStatus(p: PaymentRow): string {
  return String(p.paymentStatus ?? p.payment_status ?? '').toLowerCase();
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDueDate(raw: string | undefined): Date | null {
  if (!raw || raw === '—') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function AdminPaymentsScreen() {
  const navigation = useNavigation<any>();
  const [rawPayments, setRawPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusChip, setStatusChip] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateAmount, setUpdateAmount] = useState<string>('');
  const [updateMethod, setUpdateMethod] = useState<string>('cash');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await adminExtendedAPI.paymentsList({
        search: debouncedSearch || undefined,
        date_field: 'pickup_date',
        status: statusChip === 'all' ? undefined : statusChip,
      });
      const list = res?.payments ?? [];
      setRawPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRawPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusChip]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Server applies status when chip !== 'all'; keep client filter as a safety net (API / cache mismatches).
  const filtered = rawPayments.filter((p) => {
    if (statusChip === 'all') return true;
    return rowStatus(p) === statusChip;
  });

  const totalAmount = filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPaid = filtered
    .filter((p) => ['paid', 'partial'].includes(rowStatus(p)))
    .reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
  const totalPendingBalance = filtered
    .filter((p) => ['pending', 'partial'].includes(rowStatus(p)))
    .reduce((s, p) => s + (Number(p.remainingAmount) || 0), 0);
  const pendingBookings = filtered.filter((p) => ['pending', 'partial'].includes(rowStatus(p))).length;

  const todayStart = startOfToday();
  const totalOverdue = filtered
    .filter((p) => {
      const st = rowStatus(p);
      if (st === 'paid' || st === 'cancelled') return false;
      const due = parseDueDate(String(p.dueDate ?? p.due_date ?? ''));
      return due != null && due < todayStart;
    })
    .reduce((s, p) => s + (Number(p.remainingAmount) || 0), 0);

  const countByStatus = filtered.reduce(
    (acc, p) => {
      const st = rowStatus(p);
      if (st === 'pending') acc.pending += 1;
      else if (st === 'partial') acc.partial += 1;
      else if (st === 'paid') acc.paid += 1;
      else if (st === 'cancelled') acc.cancelled += 1;
      return acc;
    },
    { pending: 0, partial: 0, paid: 0, cancelled: 0 }
  );

  const openUpdateModal = (p: PaymentRow) => {
    setSelectedPayment(p);
    const amt = Number(p.amount ?? 0);
    setUpdateAmount(amt > 0 ? String(amt) : '');
    setUpdateMethod(String((p.paymentMethod ?? p.payment_method) || 'cash'));
    setUpdateNotes('');
    setUpdateModalVisible(true);
  };

  const handlePaymentUpdate = async () => {
    if (!selectedPayment) return;
    const id = Number(selectedPayment.id ?? selectedPayment.bookingId ?? 0);
    if (id <= 0) return;
    const amount = parseFloat(updateAmount || '0');
    const total = Number(selectedPayment.amount ?? 0);
    if (amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid paid amount.');
      return;
    }
    setUpdating(true);
    try {
      const status: 'paid' | 'partial' = amount >= total - 0.01 ? 'paid' : 'partial';
      await adminExtendedAPI.paymentUpdate(id, status, amount, updateMethod, updateNotes.trim() || undefined);
      setUpdateModalVisible(false);
      setSelectedPayment(null);
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update payment');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Payments</Text>
        <TouchableOpacity
          style={styles.digestBtn}
          onPress={async () => {
            setSendingDigest(true);
            try {
              const r = await adminExtendedAPI.sendPendingPaymentsWhatsApp();
              Alert.alert(
                'WhatsApp Sent',
                `Pending payments digest sent to ${r?.sent_count ?? 0} admin(s).\n${(r?.bookings_count ?? 0)} bookings in list.`
              );
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send');
            } finally {
              setSendingDigest(false);
            }
          }}
          disabled={sendingDigest}
        >
          {sendingDigest ? (
            <ActivityIndicator size="small" color="#25D366" />
          ) : (
            <>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={styles.digestBtnText}>Daily digest</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

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
        <>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total revenue</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalAmount)}</Text>
              <Text style={styles.summarySub}>{formatAmountDetail(totalPaid)} collected</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pending payments</Text>
              <Text style={[styles.summaryValue, styles.pendingVal]}>{formatAmount(totalPendingBalance)}</Text>
              <Text style={styles.summarySub}>{pendingBookings} pending bookings</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Overdue</Text>
              <Text style={[styles.summaryValue, styles.overdueVal]}>{formatAmount(totalOverdue)}</Text>
              <Text style={styles.summarySub}>Requires attention</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Payment status</Text>
              <Text style={styles.summaryValue}>{countByStatus.paid}</Text>
              <Text style={styles.summarySub}>
                Paid · Partial ({countByStatus.partial}) · Pending ({countByStatus.pending})
              </Text>
            </View>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={20} color={colors.gray500} />
            <TextInput
              style={styles.searchInput}
              placeholder="Booking number, name, phone..."
              placeholderTextColor={colors.gray500}
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={20} color={colors.gray500} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {STATUS_CHIPS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, statusChip === c.id && styles.chipActive]}
                onPress={() => setStatusChip(c.id)}
              >
                <Text style={[styles.chipText, statusChip === c.id && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="card-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No payments match filters</Text>
            </View>
          ) : (
            filtered.map((p, i) => {
              const id = Number(p.id ?? p.bookingId ?? 0);
              const bookingNo = String(p.bookingNumber ?? p.booking_number ?? '—');
              const customer = String(p.customerName ?? '—');
              const due = String(p.dueDate ?? p.due_date ?? '—');
              const method = String(p.paymentMethod ?? p.payment_method ?? '').trim() || '—';
              const st = rowStatus(p);
              return (
                <TouchableOpacity
                  key={p.id != null ? String(p.id) : `pay-${i}`}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (id > 0) {
                      navigation.navigate('BookingDetail', {
                        booking: { id, bookingNumber: bookingNo },
                        source: 'admin',
                      });
                    }
                  }}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="card-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{bookingNo}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {customer} • {due}
                    </Text>
                    <View style={styles.amountsRow}>
                      <Text style={styles.amtLine}>Total {formatAmountDetail(Number(p.amount) || 0)}</Text>
                      <Text style={styles.amtLine}>Paid {formatAmountDetail(Number(p.paidAmount) || 0)}</Text>
                      <Text style={styles.amtLine}>
                        {(Number(p.remainingAmount) ?? 0) <= 0 ? 'Settled ✓' : `Due ${formatAmountDetail(Number(p.remainingAmount) || 0)}`}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{st || '—'}</Text>
                      </View>
                      <Text style={styles.methodText} numberOfLines={1}>
                        {method}
                      </Text>
                    </View>
                  </View>
                  {id > 0 ? (
                    <View style={styles.cardActions}>
                      {(st === 'pending' || st === 'partial') && (
                        <TouchableOpacity
                          style={styles.markPaidBtn}
                          onPress={() => openUpdateModal(p)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil" size={18} color="#15803d" />
                          <Text style={styles.markPaidBtnText}>Mark paid</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('BookingDetail', {
                            booking: { id, bookingNumber: bookingNo },
                            source: 'admin',
                          })
                        }
                      >
                        <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
        </>
      )}

      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setUpdateModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Mark as Paid</Text>
                {selectedPayment && (
                  <>
                    <Text style={styles.modalSub}>
                      {selectedPayment.bookingNumber ?? selectedPayment.booking_number} •{' '}
                      {selectedPayment.customerName ?? '—'}
                    </Text>
                    <Text style={styles.modalTotal}>
                      Total: {formatAmountDetail(Number(selectedPayment.amount) || 0)}
                    </Text>
                    <Text style={styles.modalLabel}>Paid amount (₹)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={updateAmount}
                      onChangeText={setUpdateAmount}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={styles.modalLabel}>Payment method</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodRow}>
                      {PAYMENT_METHODS.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.methodChip, updateMethod === m.id && styles.methodChipActive]}
                          onPress={() => setUpdateMethod(m.id)}
                        >
                          <Text style={[styles.methodChipText, updateMethod === m.id && styles.methodChipTextActive]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={styles.modalLabel}>Notes (optional)</Text>
                    <TextInput
                      style={[styles.modalInput, styles.modalNotes]}
                      value={updateNotes}
                      onChangeText={setUpdateNotes}
                      placeholder="Any details..."
                      placeholderTextColor={colors.gray400}
                      multiline
                    />
                    <View style={styles.modalFooter}>
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUpdateModalVisible(false)}>
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalSubmitBtn, updating && styles.modalSubmitDisabled]}
                        onPress={handlePaymentUpdate}
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.modalSubmitText}>
                            {parseFloat(updateAmount || '0') >= (Number(selectedPayment.amount) || 0) - 0.01
                              ? 'Mark as Paid'
                              : 'Mark as Partial'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
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
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  digestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
  },
  digestBtnText: { fontSize: 13, fontWeight: '600', color: '#15803d' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  summaryLabel: { fontSize: 12, color: colors.gray600, fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginTop: 4 },
  pendingVal: { color: '#dc2626' },
  overdueVal: { color: '#ea580c' },
  summarySub: { fontSize: 11, color: colors.gray600, marginTop: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground, paddingVertical: 10 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, paddingRight: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  chipTextActive: { color: '#fff' },
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
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  amountsRow: { marginTop: 8, gap: 2 },
  amtLine: { fontSize: 13, color: colors.gray700, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground, textTransform: 'capitalize' },
  methodText: { flex: 1, fontSize: 12, color: colors.gray600 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
  },
  markPaidBtnText: { fontSize: 12, fontWeight: '600', color: '#15803d' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalWrapper: { maxHeight: '90%' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  modalSub: { fontSize: 14, color: colors.gray600, marginTop: 4 },
  modalTotal: { fontSize: 16, fontWeight: '600', color: colors.foreground, marginTop: 8 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginTop: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.foreground,
    marginTop: 6,
  },
  modalNotes: { minHeight: 60, textAlignVertical: 'top' },
  methodRow: { marginTop: 6, marginBottom: 4 },
  methodChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  methodChipActive: { backgroundColor: colors.primary },
  methodChipText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  methodChipTextActive: { color: '#fff' },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.gray200,
  },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  modalSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#15803d',
    minWidth: 140,
    alignItems: 'center',
  },
  modalSubmitDisabled: { opacity: 0.7 },
  modalSubmitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
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
