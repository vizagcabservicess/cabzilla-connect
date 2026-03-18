/**
 * Admin Reports - dynamic reports matching web ReportGenerator
 * Period filters: All, Today, Week, Month, Year, Range (custom)
 * Type-specific rendering per report: revenue, bookings, drivers, vehicles, ledger, fuels, maintenance
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

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'fuels', label: 'Fuel' },
  { id: 'maintenance', label: 'Maintenance' },
] as const;

type PeriodType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
const PERIOD_OPTIONS: { id: PeriodType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'custom', label: 'Range' },
];

function getReportParams(periodType: PeriodType, start?: Date, end?: Date): {
  period?: string;
  start_date?: string;
  end_date?: string;
} {
  const today = new Date();
  if (periodType === 'all') {
    return {
      period: 'custom',
      start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
      end_date: format(today, 'yyyy-MM-dd'),
    };
  }
  if (periodType === 'today') {
    const d = format(today, 'yyyy-MM-dd');
    return { period: 'daily', start_date: d, end_date: d };
  }
  if (periodType === 'week') {
    return { period: 'weekly' };
  }
  if (periodType === 'month') {
    return { period: 'monthly' };
  }
  if (periodType === 'year') {
    return { period: 'yearly' };
  }
  if (periodType === 'custom' && start && end) {
    return {
      period: 'custom',
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd'),
    };
  }
  return { period: 'custom', start_date: format(subDays(today, 30), 'yyyy-MM-dd'), end_date: format(today, 'yyyy-MM-dd') };
}

export function AdminReportsScreen() {
  const navigation = useNavigation<any>();
  const [reportType, setReportType] = useState<(typeof REPORT_TYPES)[number]['id']>('revenue');
  const [periodType, setPeriodType] = useState<PeriodType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectDateRange = () => {
    setPeriodType('custom');
    if (!startDate) setStartDate(subDays(new Date(), 30));
    if (!endDate) setEndDate(new Date());
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const params = getReportParams(periodType, startDate, endDate);
      const res = await adminExtendedAPI.reportsFetch({
        type: reportType,
        ...params,
      });
      setData(res && typeof res === 'object' ? res : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reportType, periodType, startDate, endDate]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const safeNum = (v: unknown): number => {
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isNaN(n) ? 0 : n;
  };

  // --- Summary cards by report type ---
  const renderSummaryCards = () => {
    const d = data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object') return null;

    switch (reportType) {
      case 'revenue': {
        const total = safeNum(d.totalRevenue);
        const daily = d.dailyRevenue as { date: string; total: number }[] | undefined;
        const count = Array.isArray(daily) ? daily.length : 0;
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{formatAmount(total)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Days</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </View>
          </View>
        );
      }
      case 'bookings': {
        const total = safeNum(d.totalBookings);
        const byStatus = d.bookingsByStatus as Record<string, number> | undefined;
        const completed = byStatus ? safeNum(byStatus.completed ?? byStatus.Completed) : 0;
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Bookings</Text>
              <Text style={styles.summaryValue}>{total}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={styles.summaryValue}>{completed}</Text>
            </View>
          </View>
        );
      }
      case 'drivers': {
        const drivers = d.drivers as Record<string, unknown>[] | undefined;
        const arr = Array.isArray(drivers) ? drivers : [];
        const totalEarnings = arr.reduce((sum, r) => sum + safeNum(r.total_earnings ?? r.totalEarnings), 0);
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Drivers</Text>
              <Text style={styles.summaryValue}>{arr.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Earnings</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalEarnings)}</Text>
            </View>
          </View>
        );
      }
      case 'vehicles': {
        const vehiclesRaw = Array.isArray(d) ? d : (d as Record<string, unknown>).vehicles;
        const vehicles = Array.isArray(vehiclesRaw) ? vehiclesRaw : [];
        const arr = Array.isArray(vehicles) ? vehicles : [];
        const totalRev = arr.reduce((sum, r) => sum + safeNum(r.total_revenue ?? r.totalRevenue), 0);
        const totalProfit = arr.reduce((sum, r) => sum + safeNum(r.profit), 0);
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalRev)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalProfit)}</Text>
            </View>
          </View>
        );
      }
      case 'ledger': {
        const income = safeNum(d.totalIncome);
        const expense = safeNum(d.totalExpense);
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{formatAmount(income)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Expense</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatAmount(expense)}</Text>
            </View>
          </View>
        );
      }
      case 'fuels': {
        const totalCost = safeNum(d.totalCost);
        const totalLiters = safeNum(d.totalLiters);
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Cost</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalCost)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Liters</Text>
              <Text style={styles.summaryValue}>{totalLiters.toFixed(1)}</Text>
            </View>
          </View>
        );
      }
      case 'maintenance': {
        const totalCost = safeNum(d.totalCost);
        const records = d.maintenance as unknown[] | undefined;
        const count = Array.isArray(records) ? records.length : 0;
        return (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Cost</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalCost)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Records</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </View>
          </View>
        );
      }
      default:
        return null;
    }
  };

  // --- Detail list by report type ---
  const renderDetailList = () => {
    const d = data as Record<string, unknown> | unknown[] | null;
    if (!d) return null;

    switch (reportType) {
      case 'revenue': {
        const daily = (d as Record<string, unknown>).dailyRevenue as { date: string; total: number }[] | undefined;
        const rows = Array.isArray(daily) ? daily : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 60).map((r, i) => (
          <View key={r.date ?? i} style={styles.card}>
            <Text style={styles.cardTitle}>{r.date}</Text>
            <Text style={styles.amount}>{formatAmount(r.total ?? 0)}</Text>
          </View>
        ));
      }
      case 'bookings': {
        const daily = (d as Record<string, unknown>).dailyBookings as { date: string; count: number }[] | undefined;
        const rows = Array.isArray(daily) ? daily : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 60).map((r, i) => (
          <View key={r.date ?? i} style={styles.card}>
            <Text style={styles.cardTitle}>{r.date}</Text>
            <Text style={styles.cardSub}>{r.count ?? 0} bookings</Text>
          </View>
        ));
      }
      case 'drivers': {
        const drivers = (d as Record<string, unknown>).drivers as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(drivers) ? drivers : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 50).map((r, i) => (
          <View key={String(r.driver_id ?? r.driverId ?? i)} style={styles.card}>
            <Text style={styles.cardTitle}>{String(r.driver_name ?? r.driverName ?? '—')}</Text>
            <Text style={styles.cardSub}>
              {Number(r.total_trips ?? r.totalTrips ?? 0)} trips • {formatAmount(safeNum(r.total_earnings ?? r.totalEarnings))}
            </Text>
            {typeof (r.rating ?? 0) === 'number' && Number(r.rating) > 0 && (
              <Text style={styles.cardSub}>Rating: {Number(r.rating).toFixed(1)}</Text>
            )}
          </View>
        ));
      }
      case 'vehicles': {
        const vehicles = Array.isArray(d) ? d : ((d as Record<string, unknown>).vehicles as unknown[]) ?? [];
        const rows = Array.isArray(vehicles) ? vehicles : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 50).map((r, i) => {
          const rec = r as Record<string, unknown>;
          return (
            <View key={String(rec.vehicle_id ?? rec.vehicleId ?? i)} style={styles.card}>
              <Text style={styles.cardTitle}>{String(rec.vehicle_name ?? rec.vehicleNumber ?? '—')}</Text>
              <Text style={styles.cardSub}>
                {String(rec.vehicle_number ?? rec.vehicleNumber ?? '')} • {Number(rec.total_trips ?? rec.totalTrips ?? 0)} trips
              </Text>
              <Text style={styles.amount}>
                Rev: {formatAmount(safeNum(rec.total_revenue ?? rec.totalRevenue))} | Profit: {formatAmount(safeNum(rec.profit))}
              </Text>
            </View>
          );
        });
      }
      case 'ledger': {
        const entries = (d as Record<string, unknown>).entries as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(entries) ? entries : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 50).map((r, i) => (
          <View key={String(r.id ?? i)} style={styles.card}>
            <Text style={styles.cardTitle}>{String(r.description ?? '—')}</Text>
            <Text style={styles.cardSub}>{String(r.date ?? '')} • {String(r.type ?? '')}</Text>
            <Text style={[styles.amount, (r.type === 'expense' ? { color: '#dc2626' } : { color: '#16a34a' })]}>
              {(r.type === 'expense' ? '-' : '+')}{formatAmount(safeNum(r.amount))}
            </Text>
          </View>
        ));
      }
      case 'fuels': {
        const fuels = (d as Record<string, unknown>).fuels as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(fuels) ? fuels : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 50).map((r, i) => (
          <View key={String(r.id ?? i)} style={styles.card}>
            <Text style={styles.cardTitle}>
              {String(r.vehicleName ?? r.vehicleNumber ?? r.vehicleId ?? '—')} • {String(r.date ?? '')}
            </Text>
            <Text style={styles.cardSub}>
              {safeNum(r.liters ?? r.quantity ?? r.quantityLiters ?? 0).toFixed(1)}L @ {formatAmount(safeNum(r.pricePerLiter ?? r.pricePerUnit ?? 0))}/L
            </Text>
            <Text style={styles.amount}>{formatAmount(safeNum(r.cost ?? r.totalCost ?? 0))}</Text>
          </View>
        ));
      }
      case 'maintenance': {
        const maintenance = (d as Record<string, unknown>).maintenance as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(maintenance) ? maintenance : [];
        if (rows.length === 0) return null;
        return rows.slice(0, 50).map((r, i) => (
          <View key={String(r.id ?? i)} style={styles.card}>
            <Text style={styles.cardTitle}>{String(r.serviceType ?? r.service_type ?? '—')}</Text>
            <Text style={styles.cardSub}>{String(r.date ?? '')} • {String(r.description ?? r.vendor ?? '')}</Text>
            <Text style={styles.amount}>{formatAmount(safeNum(r.cost ?? 0))}</Text>
          </View>
        ));
      }
      default:
        return null;
    }
  };

  const hasDetails = (() => {
    const list = renderDetailList();
    return list && React.Children.count(list) > 0;
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeScrollContent}>
        {REPORT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.typeBtn, reportType === t.id && styles.typeBtnActive]}
            onPress={() => setReportType(t.id)}
          >
            <Text style={[styles.typeText, reportType === t.id && styles.typeTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
          {renderSummaryCards()}
          {hasDetails ? (
            renderDetailList()
          ) : (
            <View style={styles.empty}>
              <Ionicons name="stats-chart-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No report data for this period</Text>
            </View>
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
  typeScroll: { maxHeight: 52, backgroundColor: '#fff' },
  typeScrollContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  typeBtnActive: { backgroundColor: colors.primary },
  typeText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  typeTextActive: { color: '#fff' },
  periodRow: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
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
  rangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.gray100, borderRadius: 8 },
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
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  cardSub: { fontSize: 13, color: colors.gray600, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 4 },
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
