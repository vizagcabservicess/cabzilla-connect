/**
 * Admin Payroll - view payroll summary & entries with date range filter (mirrors web PayrollPage)
 * When no payroll entries: shows drivers list with "Add Payroll Entry" (like web app).
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { adminAPI, AdminDriver } from '../services/adminAPI';
import { AddPayrollModal } from '../components/AddPayrollModal';

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

interface PayrollEntry {
  id?: string | number;
  driverId?: string | number;
  driverName?: string;
  driver_name?: string;
  date?: string;
  amount?: number;
  netSalary?: number;
  paymentStatus?: string;
  payment_status?: string;
  payPeriod?: { startDate?: string; endDate?: string };
  [key: string]: unknown;
}

const PERIOD_OPTIONS = [
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
] as const;

export function AdminPayrollScreen() {
  const navigation = useNavigation<any>();
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<{
    totalPaid?: number;
    total_paid?: number;
    totalPending?: number;
    total_pending?: number;
    totalDrivers?: number;
    total_drivers?: number;
  } | null>(null);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<(typeof PERIOD_OPTIONS)[number]['id']>('month');
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAddPayrollModal, setShowAddPayrollModal] = useState(false);
  const [addPayrollDriverId, setAddPayrollDriverId] = useState<string | number | undefined>(undefined);
  const [payrollToEdit, setPayrollToEdit] = useState<PayrollEntry | undefined>(undefined);

  const getDateRange = useCallback((): { from_date: string; to_date: string } => {
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
      const [entriesList, summaryRes] = await Promise.all([
        adminExtendedAPI.payrollEntriesList(range),
        adminExtendedAPI.payrollSummary(range),
      ]);
      setEntries(Array.isArray(entriesList) ? entriesList : []);
      setSummary(summaryRes && typeof summaryRes === 'object' ? summaryRes : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setEntries([]);
      setSummary(null);
      setDrivers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading) {
      adminAPI.getDrivers().then(setDrivers).catch(() => setDrivers([]));
    } else {
      setDrivers([]);
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const totalPaid = Number(summary?.totalPaid ?? summary?.total_paid ?? 0);
  const totalPending = Number(summary?.totalPending ?? summary?.total_pending ?? 0);
  const totalDrivers = Number(summary?.totalDrivers ?? summary?.total_drivers ?? 0);

  const onAddPayroll = (driverId?: string | number) => {
    setPayrollToEdit(undefined);
    setAddPayrollDriverId(driverId);
    setShowAddPayrollModal(true);
  };

  const onEditPayroll = (entry: PayrollEntry) => {
    setPayrollToEdit(entry);
    setAddPayrollDriverId(entry.driverId);
    setShowAddPayrollModal(true);
  };

  const driversMap = new Map<string, string>();
  drivers.forEach((d) => {
    if (d.id != null && d.name) driversMap.set(String(d.id), d.name);
  });

  const getEntryDisplay = (e: PayrollEntry) => {
    const name =
      String(e.driverName ?? e.driver_name ?? e.name ?? '') ||
      (e.driverId != null ? driversMap.get(String(e.driverId)) ?? '' : '') ||
      '—';
    const period = e.payPeriod
      ? `${e.payPeriod.startDate ?? ''} – ${e.payPeriod.endDate ?? ''}`
      : String(e.date ?? e.period ?? '—');
    const amt = Number(e.netSalary ?? e.amount ?? e.paid ?? 0);
    const status = String(e.paymentStatus ?? e.payment_status ?? '');
    return { name, period, amt, status };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Payroll</Text>
        <TouchableOpacity onPress={() => onAddPayroll()} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Date range filter */}
      <View style={styles.filters}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.periodBtn, periodType === p.id && styles.periodBtnActive]}
              onPress={() => {
                setPeriodType(p.id);
                setLoading(true);
              }}
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
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowStartPicker(false);
            if (d) {
              setStartDate(d);
              setLoading(true);
            }
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
            if (d) {
              setEndDate(d);
              setLoading(true);
            }
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
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={[styles.summaryValue, styles.paid]}>{formatAmount(totalPaid)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, styles.pending]}>{formatAmount(totalPending)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Drivers</Text>
              <Text style={[styles.summaryValue, styles.drivers]}>{totalDrivers}</Text>
            </View>
          </View>

          {entries.length === 0 ? (
            drivers.length > 0 ? (
              <View style={styles.driversSection}>
                <View style={styles.driversHeader}>
                  <Text style={styles.driversTitle}>Drivers</Text>
                  <TouchableOpacity onPress={() => onAddPayroll()} style={styles.addPayrollBtn}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addPayrollBtnText}>Add Payroll Entry</Text>
                  </TouchableOpacity>
                </View>
                {drivers.map((d) => (
                  <View key={String(d.id)} style={styles.driverRow}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{d.name ?? '—'}</Text>
                      <Text style={styles.driverPhone}>{d.phone ?? '—'}</Text>
                      {d.status ? <Text style={styles.driverStatus}>{d.status}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.driverActionBtn}
                      onPress={() => onAddPayroll(d.id)}
                    >
                      <Text style={styles.driverActionText}>Add Payroll Entry</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="card-outline" size={48} color={colors.gray200} />
                <Text style={styles.emptyText}>No payroll entries</Text>
                <Text style={styles.emptyHint}>Try a different date range or add from web admin</Text>
              </View>
            )
          ) : (
            entries.map((e, i) => {
              const { name, period, amt, status } = getEntryDisplay(e);
              return (
                <TouchableOpacity
                  key={e.id ? String(e.id) : `pay-${i}`}
                  style={styles.card}
                  onPress={() => onEditPayroll(e)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{name}</Text>
                    <Text style={styles.cardSub}>{period}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.amount, status === 'paid' && styles.amountPaid]}>
                        {formatAmount(amt)}
                      </Text>
                      {status && (
                        <View style={[styles.statusBadge, status === 'paid' && styles.statusPaid]}>
                          <Text style={[styles.statusText, status === 'paid' && styles.statusTextPaid]}>
                            {status === 'paid' ? 'Paid' : 'Pending'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <AddPayrollModal
        visible={showAddPayrollModal}
        onClose={() => {
          setShowAddPayrollModal(false);
          setPayrollToEdit(undefined);
        }}
        onSuccess={() => {
          setShowAddPayrollModal(false);
          setPayrollToEdit(undefined);
          load();
        }}
        selectedDriverId={addPayrollDriverId}
        payrollToEdit={payrollToEdit}
      />
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  filters: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.gray100,
    borderRadius: 8,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  periodTextActive: { color: '#fff' },
  rangeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
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
  summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  paid: { color: '#059669' },
  pending: { color: '#dc2626' },
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
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.primary },
  amountPaid: { color: '#059669' },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  statusPaid: { backgroundColor: '#dcfce7' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#b45309' },
  statusTextPaid: { color: '#059669' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: colors.gray600, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.gray400, marginTop: 4 },
  errorText: { fontSize: 15, color: colors.gray600, marginTop: 12, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  drivers: { color: colors.primary },
  driversSection: { marginBottom: 16 },
  driversHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  driversTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  addPayrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  addPayrollBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  driverPhone: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  driverStatus: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  driverActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  driverActionText: { fontSize: 12, fontWeight: '600', color: '#fff' },
});
