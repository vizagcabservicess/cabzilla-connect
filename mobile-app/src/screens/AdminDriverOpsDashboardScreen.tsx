/**
 * Super-admin driver operations dashboard — parity with web `DriverDashboard.tsx`.
 * Trips, fuel, summary metrics, filters, charts (simplified), trip edit/delete.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import { adminAPI } from '../services/adminAPI';
import type {
  DriverDashboardData,
  DriverDashboardTrip,
  DriverFuelRecord,
  PaymentType,
  TripStatus,
} from '../types/driverDashboard';
import { format } from 'date-fns';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AdminDriverOpsTripEditModal } from '../components/AdminDriverOpsTripEditModal';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminDriverOpsDashboard'>;

const INITIAL_DATA: DriverDashboardData = {
  driverId: null,
  trips: { items: [], total: 0, limit: 20, offset: 0 },
  fuelRecords: { items: [], total: 0, limit: 20, offset: 0 },
  summary: {
    totalTripsCompleted: 0,
    totalKilometers: 0,
    totalHours: 0,
    totalTripAmount: 0,
    totalFuelSpend: 0,
    numberOfRefills: 0,
    fuelEfficiencyKmPerLitre: 0,
    netEarnings: 0,
    profitEstimation: 0,
    earningsBreakdown: {
      company_paid: 0,
      self_paid: 0,
      corporate_booking: 0,
      agent_booking: 0,
    },
  },
};

const STATUS_COLORS: Record<TripStatus, string> = {
  assigned: '#2563eb',
  in_progress: '#f59e0b',
  completed: '#16a34a',
};

const PAGE_SIZE = 15;
const EXPORT_FETCH_LIMIT = 8000;

function escapeCsvCell(value: string): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvFromRows(headers: string[], rows: string[][]): string {
  const bom = '\uFEFF';
  const line = (cells: string[]) => cells.map(escapeCsvCell).join(',');
  return bom + [line(headers), ...rows.map(line)].join('\r\n');
}

async function saveAndShareCsv(filename: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const w = typeof globalThis !== 'undefined' ? (globalThis as { window?: Window & { document?: Document } }).window : undefined;
    if (w?.document) {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = w.document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
  }
  const baseDir = cacheDirectory;
  if (!baseDir) {
    throw new Error('Storage not available');
  }
  const path = `${baseDir}${filename}`;
  await writeAsStringAsync(path, csv, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
  }
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function compactLocation(value: string): string {
  const text = (value || '').trim();
  if (!text) return '—';
  const withoutParens = text.replace(/\(.*?\)/g, '').trim();
  const firstSegment = withoutParens.split(',')[0]?.trim() || withoutParens;
  const normalized = firstSegment.replace(/\s+/g, ' ');
  return normalized || '—';
}

function formatJourneyDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN');
}

function formatTripPaymentLabel(code: string): string {
  const c = (code || '').trim().toLowerCase();
  const map: Record<string, string> = {
    company_phonepe: 'Company PhonePe',
    company_paid: 'Company paid',
    self_paid: 'Self',
    agent_booking: 'Agent booking',
    corporate_booking: 'Corporate',
  };
  return map[c] || c.replace(/_/g, ' ') || '—';
}

type MainTab = 'dashboard' | 'trips' | 'fuel' | 'reports';

export function AdminDriverOpsDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';

  const [data, setData] = useState<DriverDashboardData>(INITIAL_DATA);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TripStatus>('all');
  const [paymentType, setPaymentType] = useState<'all' | PaymentType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [tripPage, setTripPage] = useState(0);
  const [fuelPage, setFuelPage] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');

  const [editTrip, setEditTrip] = useState<DriverDashboardTrip | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [exporting, setExporting] = useState<null | 'trips' | 'fuel'>(null);

  const filterParams = useCallback(
    () => ({
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      paymentType: paymentType === 'all' ? undefined : paymentType,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      driverId: driverId && driverId > 0 ? driverId : undefined,
    }),
    [search, status, paymentType, fromDate, toDate, driverId]
  );

  const exportFuelCsv = useCallback(async () => {
    if (!isSuper) return;
    setExporting('fuel');
    try {
      const response = await driverDashboardAPI.getDashboard({
        ...filterParams(),
        tripLimit: 1,
        tripOffset: 0,
        fuelLimit: EXPORT_FETCH_LIMIT,
        fuelOffset: 0,
      });
      const headers = ['Date & Time (ISO)', 'Amount_INR', 'Litres', 'Vehicle_number', 'Linked_trip_ID'];
      const rows = response.fuelRecords.items.map((f) => [
        f.dateTime ? new Date(f.dateTime).toISOString() : '',
        toSafeNumber(f.fuelAmount).toFixed(2),
        toSafeNumber(f.fuelQuantityLitres).toFixed(2),
        (f.vehicleNumber || '').trim(),
        f.linkedTripId != null ? String(f.linkedTripId) : '',
      ]);
      await saveAndShareCsv(`fuel-records-${format(new Date(), 'yyyy-MM-dd')}.csv`, csvFromRows(headers, rows));
    } catch {
      Alert.alert('Export failed', 'Could not export fuel records.');
    } finally {
      setExporting(null);
    }
  }, [isSuper, filterParams]);

  const exportTripsCsv = useCallback(async () => {
    if (!isSuper) return;
    setExporting('trips');
    try {
      const response = await driverDashboardAPI.getDashboard({
        ...filterParams(),
        tripLimit: EXPORT_FETCH_LIMIT,
        tripOffset: 0,
        fuelLimit: 1,
        fuelOffset: 0,
      });
      const headers = [
        'Trip_code',
        'Journey_datetime_ISO',
        'Driver_name',
        'Vehicle_number',
        'From',
        'To',
        'Status',
        'Start_ODO',
        'End_ODO',
        'Hours',
        'Kilometers',
        'Fuel_INR',
        'Amount_INR',
        'Collected_INR',
        'Payment',
      ];
      const rows = response.trips.items.map((trip) => [
        trip.tripCode,
        trip.startTime ? new Date(trip.startTime).toISOString() : '',
        trip.driverName || `Driver #${trip.driverId}`,
        trip.vehicleNumber || '',
        compactLocation(trip.pickupLocation),
        compactLocation(trip.dropLocation),
        trip.status,
        toSafeNumber(trip.startingOdometer).toFixed(1),
        toSafeNumber(trip.endingOdometer).toFixed(1),
        toSafeNumber(trip.totalDurationHours).toFixed(1),
        toSafeNumber(trip.totalKilometers).toFixed(1),
        toSafeNumber(trip.fuelSpend).toFixed(0),
        toSafeNumber(trip.tripAmount).toFixed(0),
        trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
          ? toSafeNumber(trip.driverCollectedAmount).toFixed(0)
          : '',
        formatTripPaymentLabel(trip.paymentType),
      ]);
      await saveAndShareCsv(`driver-ops-trips-${format(new Date(), 'yyyy-MM-dd')}.csv`, csvFromRows(headers, rows));
    } catch {
      Alert.alert('Export failed', 'Could not export trips.');
    } finally {
      setExporting(null);
    }
  }, [isSuper, filterParams]);

  useEffect(() => {
    if (!isSuper) return;
    const loadDrivers = async () => {
      try {
        const response = await adminAPI.getDrivers();
        const normalized = (response ?? [])
          .map((d) => ({
            id: Number(d.id),
            name: String(d.name ?? `Driver #${d.id}`),
          }))
          .filter((d) => Number.isFinite(d.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        setDrivers(normalized);
      } catch {
        setDrivers([]);
      }
    };
    void loadDrivers();
  }, [isSuper]);

  const loadInternal = useCallback(
    async (tripP: number, fuelP: number, opts?: { skipLoadingSpinner?: boolean }) => {
      if (!isSuper) return;
      if (!opts?.skipLoadingSpinner) setLoading(true);
      setLoadError(null);
      try {
        const response = await driverDashboardAPI.getDashboard({
          search: search || undefined,
          status: status === 'all' ? undefined : status,
          paymentType: paymentType === 'all' ? undefined : paymentType,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          driverId: driverId && driverId > 0 ? driverId : undefined,
          tripLimit: PAGE_SIZE,
          tripOffset: tripP * PAGE_SIZE,
          fuelLimit: PAGE_SIZE,
          fuelOffset: fuelP * PAGE_SIZE,
        });
        setData(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
        setLoadError(message);
      } finally {
        if (!opts?.skipLoadingSpinner) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [isSuper, search, status, paymentType, fromDate, toDate, driverId]
  );

  useEffect(() => {
    if (!isSuper) return;
    void loadInternal(tripPage, fuelPage);
  }, [isSuper, tripPage, fuelPage, loadInternal]);

  const driverOptions = useMemo(() => {
    const fromApi = drivers.map((d) => ({ id: d.id, name: d.name }));
    const fromTrips = data.trips.items
      .map((trip) => ({
        id: Number(trip.driverId),
        name: (trip.driverName || `Driver #${trip.driverId}`).trim(),
      }))
      .filter((d) => Number.isFinite(d.id) && d.id > 0);
    const merged = [...fromApi, ...fromTrips];
    const dedup = new Map<number, string>();
    merged.forEach((d) => {
      if (!dedup.has(d.id)) dedup.set(d.id, d.name);
    });
    return Array.from(dedup.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, data.trips.items]);

  const chartData = useMemo(() => {
    const earningsMap = new Map<string, { date: string; earnings: number; fuel: number }>();
    data.trips.items.forEach((trip) => {
      const key = trip.startTime ? new Date(trip.startTime).toISOString().slice(0, 10) : 'unknown';
      const current = earningsMap.get(key) ?? { date: key, earnings: 0, fuel: 0 };
      current.earnings += trip.tripAmount;
      earningsMap.set(key, current);
    });
    data.fuelRecords.items.forEach((fuel) => {
      const key = fuel.dateTime ? new Date(fuel.dateTime).toISOString().slice(0, 10) : 'unknown';
      const current = earningsMap.get(key) ?? { date: key, earnings: 0, fuel: 0 };
      current.fuel += fuel.fuelAmount;
      earningsMap.set(key, current);
    });
    return Array.from(earningsMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  }, [data]);

  const tripPages = Math.max(1, Math.ceil(data.trips.total / PAGE_SIZE));
  const fuelPages = Math.max(1, Math.ceil(data.fuelRecords.total / PAGE_SIZE));

  const applyFilters = () => {
    setTripPage(0);
    setFuelPage(0);
    if (tripPage === 0 && fuelPage === 0) {
      void loadInternal(0, 0);
    }
  };

  const resetFiltersAndLoad = async () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setDriverId(null);
    setStatus('all');
    setPaymentType('all');
    setTripPage(0);
    setFuelPage(0);
    setLoadError(null);
    setLoading(true);
    try {
      const response = await driverDashboardAPI.getDashboard({
        tripLimit: PAGE_SIZE,
        tripOffset: 0,
        fuelLimit: PAGE_SIZE,
        fuelOffset: 0,
      });
      setData(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedDriverLabel =
    driverId && driverId > 0
      ? driverOptions.find((d) => d.id === driverId)?.name ?? `Driver #${driverId}`
      : 'All drivers';

  if (!isSuper) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver ops</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.denied}>
          <Text style={styles.deniedText}>This screen is only available to super administrators.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const maxChartE = chartData.length ? Math.max(...chartData.map((d) => d.earnings), 1) : 1;
  const maxChartF = chartData.length ? Math.max(...chartData.map((d) => d.fuel), 1) : 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Driver ops
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadInternal(tripPage, fuelPage, { skipLoadingSpinner: true });
            }}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>Unified trips, fuel and earnings (super admin).</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
          <MetricCard title="Completed" value={data.summary.totalTripsCompleted} />
          <MetricCard title="Km" value={toSafeNumber(data.summary.totalKilometers).toFixed(1)} />
          <MetricCard title="Hours" value={toSafeNumber(data.summary.totalHours).toFixed(1)} />
          <MetricCard title="Fuel ₹" value={toSafeNumber(data.summary.totalFuelSpend).toFixed(0)} />
          <MetricCard title="Net ₹" value={toSafeNumber(data.summary.netEarnings).toFixed(0)} />
          <MetricCard title="Profit est. ₹" value={toSafeNumber(data.summary.profitEstimation).toFixed(0)} />
        </ScrollView>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Unable to load: {loadError}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>
          <TextInput
            style={styles.input}
            placeholder="Search Trip ID / Driver ID"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.gray500}
          />
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateHalf]}
              placeholder="From YYYY-MM-DD"
              value={fromDate}
              onChangeText={setFromDate}
              placeholderTextColor={colors.gray500}
            />
            <TextInput
              style={[styles.input, styles.dateHalf]}
              placeholder="To YYYY-MM-DD"
              value={toDate}
              onChangeText={setToDate}
              placeholderTextColor={colors.gray500}
            />
          </View>
          <TouchableOpacity style={styles.driverPickBtn} onPress={() => setDriverPickerOpen(true)}>
            <Text style={styles.driverPickText}>{selectedDriverLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.gray600} />
          </TouchableOpacity>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {(['all', 'assigned', 'in_progress', 'completed'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Payment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {(
              [
                'all',
                'company_paid',
                'company_phonepe',
                'self_paid',
                'corporate_booking',
                'agent_booking',
              ] as const
            ).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, paymentType === p && styles.chipActive]}
                onPress={() => setPaymentType(p)}
              >
                <Text style={[styles.chipText, paymentType === p && styles.chipTextActive]}>
                  {p === 'all' ? 'All' : formatTripPaymentLabel(p)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={() => void resetFiltersAndLoad()}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(
            [
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'trips', label: 'Trips' },
              { key: 'fuel', label: 'Fuel' },
              { key: 'reports', label: 'Reports' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, mainTab === t.key && styles.tabActive]}
              onPress={() => setMainTab(t.key)}
            >
              <Text style={[styles.tabText, mainTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerPad}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : null}

        {!loading || refreshing ? (
          <>
            {mainTab === 'dashboard' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily earnings (last points)</Text>
                <View style={styles.chartRow}>
                  {chartData.map((row) => (
                    <View key={row.date} style={styles.barCol}>
                      <View
                        style={[
                          styles.barE,
                          { height: Math.max(8, (row.earnings / maxChartE) * 100) },
                        ]}
                      />
                      <Text style={styles.barDate} numberOfLines={1}>
                        {row.date === 'unknown' ? '?' : row.date.slice(5)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.cardTitle, { marginTop: 20 }]}>Fuel usage</Text>
                <View style={styles.chartRow}>
                  {chartData.map((row) => (
                    <View key={`f-${row.date}`} style={styles.barCol}>
                      <View
                        style={[
                          styles.barF,
                          { height: Math.max(8, (row.fuel / maxChartF) * 100) },
                        ]}
                      />
                      <Text style={styles.barDate} numberOfLines={1}>
                        {row.date === 'unknown' ? '?' : row.date.slice(5)}
                      </Text>
                    </View>
                  ))}
                </View>
                {chartData.length === 0 ? <Text style={styles.emptyInline}>No chart data for current page.</Text> : null}
              </View>
            )}

            {mainTab === 'trips' && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, styles.cardTitleInRow]}>Trips ({data.trips.total})</Text>
                  <TouchableOpacity
                    style={[styles.csvBtn, exporting !== null && styles.csvBtnDisabled]}
                    onPress={() => void exportTripsCsv()}
                    disabled={exporting !== null}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.primary} style={styles.csvBtnIcon} />
                    <Text style={styles.csvBtnText}>{exporting === 'trips' ? '…' : 'CSV'}</Text>
                  </TouchableOpacity>
                </View>
                {data.trips.items.map((trip) => (
                  <View key={trip.tripId} style={styles.tripCard}>
                    <View style={styles.tripTop}>
                      <Text style={styles.tripCode}>{trip.tripCode}</Text>
                      <View style={[styles.badge, { backgroundColor: STATUS_COLORS[trip.status] }]}>
                        <Text style={styles.badgeText}>{trip.status.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.tripMeta}>
                      {formatJourneyDate(trip.startTime)} · {trip.driverName || `Driver #${trip.driverId}`}
                    </Text>
                    <Text style={styles.tripRoute}>{compactLocation(trip.pickupLocation)} → {compactLocation(trip.dropLocation)}</Text>
                    <Text style={styles.tripMeta}>
                      ODO {toSafeNumber(trip.startingOdometer).toFixed(1)}–{toSafeNumber(trip.endingOdometer).toFixed(1)} ·{' '}
                      {toSafeNumber(trip.totalKilometers).toFixed(1)} km · ₹{toSafeNumber(trip.tripAmount).toFixed(0)} ·{' '}
                      {formatTripPaymentLabel(trip.paymentType)}
                    </Text>
                    <TouchableOpacity
                      style={styles.editLink}
                      onPress={() => {
                        setEditTrip(trip);
                        setEditOpen(true);
                      }}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primary} style={styles.editIcon} />
                      <Text style={styles.editLinkText}>Edit trip</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {data.trips.items.length === 0 ? <Text style={styles.emptyInline}>No trips.</Text> : null}
                <Pager
                  page={tripPage}
                  totalPages={tripPages}
                  onPrev={() => setTripPage((p) => Math.max(0, p - 1))}
                  onNext={() => setTripPage((p) => Math.min(tripPages - 1, p + 1))}
                />
              </View>
            )}

            {mainTab === 'fuel' && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, styles.cardTitleInRow]}>Fuel records ({data.fuelRecords.total})</Text>
                  <TouchableOpacity
                    style={[styles.csvBtn, exporting !== null && styles.csvBtnDisabled]}
                    onPress={() => void exportFuelCsv()}
                    disabled={exporting !== null}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.primary} style={styles.csvBtnIcon} />
                    <Text style={styles.csvBtnText}>{exporting === 'fuel' ? '…' : 'CSV'}</Text>
                  </TouchableOpacity>
                </View>
                {data.fuelRecords.items.map((fuel) => (
                  <FuelRow key={fuel.id} fuel={fuel} />
                ))}
                {data.fuelRecords.items.length === 0 ? <Text style={styles.emptyInline}>No fuel records.</Text> : null}
                <Pager
                  page={fuelPage}
                  totalPages={fuelPages}
                  onPrev={() => setFuelPage((p) => Math.max(0, p - 1))}
                  onNext={() => setFuelPage((p) => Math.min(fuelPages - 1, p + 1))}
                />
              </View>
            )}

            {mainTab === 'reports' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Earnings breakdown</Text>
                <View style={styles.reportGrid}>
                  <MetricCard
                    title="Company"
                    value={`₹${toSafeNumber(data.summary.earningsBreakdown.company_paid).toFixed(0)}`}
                    compact
                  />
                  <MetricCard
                    title="Self"
                    value={`₹${toSafeNumber(data.summary.earningsBreakdown.self_paid).toFixed(0)}`}
                    compact
                  />
                  <MetricCard
                    title="Corporate"
                    value={`₹${toSafeNumber(data.summary.earningsBreakdown.corporate_booking).toFixed(0)}`}
                    compact
                  />
                  <MetricCard
                    title="Agent"
                    value={`₹${toSafeNumber(data.summary.earningsBreakdown.agent_booking).toFixed(0)}`}
                    compact
                  />
                </View>
              </View>
            )}
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal visible={driverPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDriverPickerOpen(false)}>
          <View style={styles.driverModal}>
            <Text style={styles.driverModalTitle}>Driver</Text>
            <ScrollView style={styles.driverScroll} keyboardShouldPersistTaps="handled">
              {[{ id: 0, name: 'All drivers' }, ...driverOptions].map((item) => (
                <TouchableOpacity
                  key={item.id === 0 ? 'all' : String(item.id)}
                  style={styles.driverRow}
                  onPress={() => {
                    setDriverId(item.id > 0 ? item.id : null);
                    setDriverPickerOpen(false);
                  }}
                >
                  <Text style={styles.driverRowText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <AdminDriverOpsTripEditModal
        visible={editOpen}
        trip={editTrip}
        onClose={() => {
          setEditOpen(false);
          setEditTrip(null);
        }}
        onSaved={() => void loadInternal(tripPage, fuelPage)}
      />
    </SafeAreaView>
  );
}

function MetricCard({
  title,
  value,
  compact,
}: {
  title: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function FuelRow({ fuel }: { fuel: DriverFuelRecord }) {
  const when = fuel.dateTime ? new Date(fuel.dateTime).toLocaleString() : '—';
  const veh = (fuel.vehicleNumber || '').trim();
  return (
    <View style={styles.fuelRow}>
      <Text style={styles.fuelWhen}>{when}</Text>
      <Text style={styles.fuelAmt}>₹{toSafeNumber(fuel.fuelAmount).toFixed(0)} · {toSafeNumber(fuel.fuelQuantityLitres).toFixed(2)} L</Text>
      <Text style={styles.fuelTrip}>Vehicle: {veh || '—'}</Text>
      <Text style={styles.fuelTrip}>Trip: {fuel.linkedTripId ?? 'None'}</Text>
    </View>
  );
}

function Pager({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.pager}>
      <TouchableOpacity style={styles.pagerBtn} onPress={onPrev} disabled={page <= 0}>
        <Text style={[styles.pagerBtnText, page <= 0 && styles.pagerBtnDisabled]}>Prev</Text>
      </TouchableOpacity>
      <Text style={styles.pagerInfo}>
        Page {page + 1} / {totalPages}
      </Text>
      <TouchableOpacity style={styles.pagerBtn} onPress={onNext} disabled={page + 1 >= totalPages}>
        <Text style={[styles.pagerBtnText, page + 1 >= totalPages && styles.pagerBtnDisabled]}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  lead: { fontSize: 13, color: colors.gray600, marginBottom: 12 },
  metricsRow: { flexDirection: 'row', gap: 10, paddingVertical: 4, marginBottom: 12 },
  metricCard: {
    width: 112,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  metricCardCompact: { width: '47%' },
  metricTitle: { fontSize: 11, color: colors.gray600, fontWeight: '600', marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: '#b91c1c', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
  cardTitleInRow: { marginBottom: 0, flex: 1 },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.gray50,
  },
  csvBtnIcon: { marginRight: 6 },
  csvBtnDisabled: { opacity: 0.5 },
  csvBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  input: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 10,
    color: colors.foreground,
  },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateHalf: { flex: 1 },
  driverPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  driverPickText: { fontSize: 15, color: colors.foreground },
  filterLabel: { fontSize: 12, fontWeight: '600', color: colors.gray700, marginBottom: 8 },
  chipsScroll: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 13, color: colors.gray700 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetBtn: {
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray300,
    justifyContent: 'center',
  },
  resetBtnText: { color: colors.gray700, fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray100,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, color: colors.gray700, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  centerPad: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { marginTop: 8, color: colors.gray600, fontSize: 13 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 120,
    paddingTop: 8,
  },
  barCol: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  barE: { width: '70%', backgroundColor: '#2563eb', borderRadius: 4 },
  barF: { width: '70%', backgroundColor: '#f59e0b', borderRadius: 4 },
  barDate: { fontSize: 9, color: colors.gray600, marginTop: 4 },
  emptyInline: { fontSize: 14, color: colors.gray500, fontStyle: 'italic', marginTop: 8 },
  tripCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingVertical: 12,
  },
  tripTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripCode: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff', textTransform: 'capitalize' },
  tripMeta: { fontSize: 12, color: colors.gray600, marginTop: 4 },
  tripRoute: { fontSize: 14, color: colors.foreground, marginTop: 4 },
  editLink: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  editIcon: { marginRight: 6 },
  editLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  fuelRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingVertical: 10,
  },
  fuelWhen: { fontSize: 13, color: colors.foreground, fontWeight: '600' },
  fuelAmt: { fontSize: 13, color: colors.gray700, marginTop: 2 },
  fuelTrip: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
  },
  pagerBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  pagerBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  pagerBtnDisabled: { color: colors.gray400 },
  pagerInfo: { fontSize: 12, color: colors.gray600 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  driverModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  driverScroll: { maxHeight: 360 },
  driverModalTitle: { fontSize: 16, fontWeight: '700', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  driverRow: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  driverRowText: { fontSize: 16, color: colors.foreground },
  denied: { flex: 1, padding: 24, justifyContent: 'center' },
  deniedText: { fontSize: 15, color: colors.gray600, textAlign: 'center', marginBottom: 20 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
