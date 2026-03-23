/**
 * Admin Payment Tracking - dynamic payment tracking matching web logic
 * Date filters: All, Today, Week, Month, Year, Range (custom)
 * Status filters: All, Pending, Paid, Completed (completed maps to paid)
 * Bookings payment view (same API as web Payments). Date: trip vs booked-on toggle.
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
  Modal,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';

function formatAmount(n: number) {
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return format(d, 'dd MMM yy');
  } catch {
    return s;
  }
}

interface PaymentItem {
  id?: string | number;
  booking_number?: string;
  bookingNumber?: string;
  amount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: string;
  payment_status?: string;
  date?: string;
  dueDate?: string;
  createdAt?: string;
  customerName?: string;
  [key: string]: unknown;
}

type PeriodType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Range' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'partial', label: 'Partial' },
  { id: 'paid', label: 'Paid' },
  { id: 'completed', label: 'Completed' },
] as const;

function getDateParams(periodType: PeriodType, start?: Date, end?: Date): { from_date?: string; to_date?: string } {
  const today = new Date();
  if (periodType === 'all') {
    return {}; // No date filter = all time
  }
  if (periodType === 'today') {
    const d = format(today, 'yyyy-MM-dd');
    return { from_date: d, to_date: d };
  }
  if (periodType === 'week') {
    return { from_date: format(subDays(today, 7), 'yyyy-MM-dd'), to_date: format(today, 'yyyy-MM-dd') };
  }
  if (periodType === 'month') {
    return {
      from_date: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'),
      to_date: format(today, 'yyyy-MM-dd'),
    };
  }
  if (periodType === 'year') {
    return {
      from_date: format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd'),
      to_date: format(today, 'yyyy-MM-dd'),
    };
  }
  if (periodType === 'custom' && start && end) {
    return { from_date: format(start, 'yyyy-MM-dd'), to_date: format(end, 'yyyy-MM-dd') };
  }
  return { from_date: format(subDays(today, 30), 'yyyy-MM-dd'), to_date: format(today, 'yyyy-MM-dd') };
}

/** Map mobile status to API: completed -> paid */
function mapStatusForApi(status: string): string | undefined {
  if (status === 'all') return undefined;
  if (status === 'completed') return 'paid';
  return status;
}

function rowPaymentStatus(p: PaymentItem): string {
  return String(p.paymentStatus ?? p.payment_status ?? '').toLowerCase();
}

/** Match web PaymentManagement: same status filter on rows (defensive if API drifts) */
function matchesStatusFilter(p: PaymentItem, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'completed') return rowPaymentStatus(p) === 'paid';
  return rowPaymentStatus(p) === filter;
}

export function AdminPaymentTrackingScreen() {
  const navigation = useNavigation<any>();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  /** pickup_date = web Payments default; created_at = admin create-booking by day booked */
  const [dateField, setDateField] = useState<'pickup_date' | 'created_at'>('created_at');
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const selectDateRange = () => {
    setPeriodType('custom');
    if (!startDate) setStartDate(subDays(new Date(), 30));
    if (!endDate) setEndDate(new Date());
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const dateParams = getDateParams(periodType, startDate, endDate);
      const res = await adminExtendedAPI.paymentsList({
        ...dateParams,
        status: mapStatusForApi(statusFilter),
        search: debouncedSearch.trim() || undefined,
        date_field: dateField,
      });
      const list = res?.payments ?? [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, periodType, startDate, endDate, debouncedSearch, dateField]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const visiblePayments = payments.filter((p) => matchesStatusFilter(p, statusFilter));

  // Derive from visible rows so totals match the list (same idea as web PaymentManagement client filter)
  const totalPaid = visiblePayments
    .filter((p) => ['paid', 'partial'].includes(rowPaymentStatus(p)))
    .reduce((s, p) => s + (Number(p.paidAmount ?? 0) || 0), 0);
  const totalPending = visiblePayments
    .filter((p) => ['pending', 'partial'].includes(rowPaymentStatus(p)))
    .reduce((s, p) => s + (Number(p.remainingAmount ?? 0) || 0), 0);
  const paidCount = visiblePayments.filter((p) => ['paid', 'partial'].includes(rowPaymentStatus(p))).length;
  const pendingCount = visiblePayments.filter((p) => {
    const s = rowPaymentStatus(p);
    return s === 'pending' || s === 'partial';
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Tracking</Text>
      </View>

      {/* Period filter */}
      <View style={styles.periodRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScrollContent}>
          {PERIOD_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodBtn, periodType === p.id && styles.periodBtnActive]}
              onPress={() => (p.id === 'custom' ? selectDateRange() : setPeriodType(p.id))}
            >
              <Text style={[styles.periodText, periodType === p.id && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {periodType === 'custom' && (
          <View style={styles.rangeRow}>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowStartPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.rangeText}>{startDate ? format(startDate, 'dd MMM yy') : 'From'}</Text>
            </TouchableOpacity>
            <Text style={styles.rangeSep}>—</Text>
            <TouchableOpacity style={styles.rangeBtn} onPress={() => setShowEndPicker(true)}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.rangeText}>{endDate ? format(endDate, 'dd MMM yy') : 'To'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.dateBasisRow}>
          <Text style={styles.dateBasisLabel}>Date filter:</Text>
          <TouchableOpacity
            style={[styles.dateBasisChip, dateField === 'pickup_date' && styles.dateBasisChipActive]}
            onPress={() => setDateField('pickup_date')}
          >
            <Text style={[styles.dateBasisChipText, dateField === 'pickup_date' && styles.dateBasisChipTextActive]}>
              Trip date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateBasisChip, dateField === 'created_at' && styles.dateBasisChipActive]}
            onPress={() => setDateField('created_at')}
          >
            <Text style={[styles.dateBasisChipText, dateField === 'created_at' && styles.dateBasisChipTextActive]}>
              Booked on
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showStartPicker && (
        <Modal transparent>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStartPicker(false)}>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={startDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showEndPicker && (
        <Modal transparent>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEndPicker(false)}>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={endDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Received</Text>
              <Text style={[styles.summaryValue, { color: '#059669' }]}>{formatAmount(totalPaid)}</Text>
              <Text style={styles.summaryCount}>{paidCount} payments</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, styles.pending]}>{formatAmount(totalPending)}</Text>
              <Text style={styles.summaryCount}>{pendingCount} payments</Text>
            </View>
          </View>

          {/* Search */}
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

          <View style={styles.filterRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.filterBtn, statusFilter === s.id && styles.filterBtnActive]}
                onPress={() => setStatusFilter(s.id)}
              >
                <Text style={[styles.filterText, statusFilter === s.id && styles.filterTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {visiblePayments.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No payments for selected filter</Text>
            </View>
          ) : (
            visiblePayments.map((p, i) => {
              const bookingId = Number(p.id ?? p.bookingId ?? p.booking_id ?? 0);
              return (
                <TouchableOpacity
                  key={p.id ? String(p.id) : `pt-${i}`}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (bookingId) {
                      navigation.navigate('BookingDetail', {
                        booking: { id: bookingId, bookingNumber: p.bookingNumber ?? p.booking_number },
                        source: 'admin',
                      });
                    }
                  }}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="cash-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{String(p.bookingNumber ?? p.booking_number ?? '—')}</Text>
                    <Text style={styles.cardSub}>
                      {String(p.dueDate ?? p.due_date ?? p.createdAt ?? p.date ?? '—')}
                      {p.customerName ? ` • ${p.customerName}` : ''}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.amount}>{formatAmount(p.amount ?? 0)}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                          {String(p.paymentStatus ?? p.payment_status ?? '—')}
                        </Text>
                      </View>
                    </View>
                    {(p.remainingAmount ?? 0) > 0 && (p.paymentStatus === 'partial' || p.payment_status === 'partial') && (
                      <Text style={styles.remaining}>Remaining: {formatAmount(p.remainingAmount ?? 0)}</Text>
                    )}
                  </View>
                  {bookingId > 0 && (
                    <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  periodRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  dateBasisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  dateBasisLabel: { fontSize: 12, color: colors.gray600, fontWeight: '600' },
  dateBasisChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  dateBasisChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateBasisChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  dateBasisChipTextActive: { color: '#fff' },
  periodScrollContent: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  periodTextActive: { color: '#fff' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  rangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  rangeText: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  rangeSep: { fontSize: 14, color: colors.gray500 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerContainer: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  summaryLabel: { fontSize: 12, color: colors.gray600, fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  pending: { color: '#dc2626' },
  summaryCount: { fontSize: 11, color: colors.gray600, marginTop: 2 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  filterTextActive: { color: '#fff' },
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
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.primary },
  remaining: { fontSize: 12, color: colors.gray600, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.gray200,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.foreground },
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
