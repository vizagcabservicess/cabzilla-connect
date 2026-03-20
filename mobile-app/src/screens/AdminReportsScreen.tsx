/**
 * Admin reports — parity with web ReportGenerator (excludes Ledger).
 * Periods, filters, GST / Non-GST / Profit, CSV export.
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
  Switch,
  Alert,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, subDays } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { MOBILE_REPORT_MODULES, type MobileReportTypeId } from '../config/reportModules';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';
import {
  pickNum,
  pickStr,
  formatReportDateLabel,
  normalizeReportPayload,
} from '../utils/reportDataUtils';

function reportsApiBase(): string {
  return API_BASE_URL || WEB_APP_BASE_URL;
}

function gstInvoicePdfUrl(inv: Record<string, unknown>): string {
  const base = reportsApiBase().replace(/\/$/, '');
  const bookingId =
    pickStr(inv, 'bookingId', 'booking_id') || pickStr(inv, 'id');
  const q = new URLSearchParams({
    id: bookingId || '',
    gstEnabled: '1',
    format: 'pdf',
    direct_download: '1',
  });
  const gstNumber = pickStr(inv, 'gstNumber', 'gst_number');
  const companyName = pickStr(inv, 'companyName', 'company_name');
  if (gstNumber) q.append('gstNumber', gstNumber);
  if (companyName) q.append('companyName', companyName);
  return `${base}/api/download-invoice.php?${q}`;
}

function nonGstInvoicePdfUrl(row: Record<string, unknown>): string | null {
  const bid = pickNum(row, 'bookingId', 'booking_id');
  if (!bid) return null;
  const base = reportsApiBase().replace(/\/$/, '');
  const q = new URLSearchParams({
    id: String(Math.round(bid)),
    gstEnabled: '0',
    format: 'pdf',
    direct_download: '1',
  });
  return `${base}/api/download-invoice.php?${q}`;
}

const PAYMENT_METHODS = [
  { value: 'all', label: 'All payment methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
] as const;

const TRIP_STATUS_FILTERS = [
  { value: 'all', label: 'All trip statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const PAYMENT_STATUS_FILTERS = [
  { value: 'all', label: 'All payment statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
] as const;

type PeriodPreset =
  | 'custom'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'last_month'
  | 'quarterly'
  | 'yearly'
  | 'last_year';

const PERIOD_OPTIONS: { id: PeriodPreset; label: string }[] = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
  { id: 'last_month', label: 'Last mo.' },
  { id: 'quarterly', label: 'Quarter' },
  { id: 'yearly', label: 'Year' },
  { id: 'last_year', label: 'Last yr.' },
  { id: 'custom', label: 'Range' },
];

function getReportParams(
  periodType: PeriodPreset,
  start?: Date,
  end?: Date
): { period: string; start_date?: string; end_date?: string } {
  const today = new Date();
  if (periodType === 'custom') {
    return {
      period: 'custom',
      start_date: format(start ?? subDays(today, 30), 'yyyy-MM-dd'),
      end_date: format(end ?? today, 'yyyy-MM-dd'),
    };
  }
  if (periodType === 'daily') {
    const d = format(today, 'yyyy-MM-dd');
    return { period: 'daily', start_date: d, end_date: d };
  }
  if (periodType === 'weekly') return { period: 'weekly' };
  if (periodType === 'monthly') return { period: 'monthly' };
  if (periodType === 'last_month') return { period: 'last_month' };
  if (periodType === 'quarterly') return { period: 'quarterly' };
  if (periodType === 'yearly') return { period: 'yearly' };
  if (periodType === 'last_year') return { period: 'last_year' };
  return {
    period: 'custom',
    start_date: format(subDays(today, 30), 'yyyy-MM-dd'),
    end_date: format(today, 'yyyy-MM-dd'),
  };
}

/** Trip drill-down: for non-custom periods only send `period` so PHP applies the same range as the main report */
function getDrillQueryParams(
  periodType: PeriodPreset,
  start?: Date,
  end?: Date
): { period: string; start_date?: string; end_date?: string } {
  if (periodType === 'custom') {
    const today = new Date();
    return {
      period: 'custom',
      start_date: format(start ?? subDays(today, 30), 'yyyy-MM-dd'),
      end_date: format(end ?? today, 'yyyy-MM-dd'),
    };
  }
  return { period: periodType };
}

function formatAmount(n: number) {
  const num = Number(n);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function asRecordRows(rows: unknown[] | undefined): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) =>
    typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : { value: r }
  );
}

function buildCsvPayload(reportType: string, data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  switch (reportType) {
    case 'bookings':
      return asRecordRows((data as { dailyBookings?: unknown[] }).dailyBookings);
    case 'revenue':
      return asRecordRows((data as { dailyRevenue?: unknown[] }).dailyRevenue);
    case 'gst':
      return asRecordRows((data as { gstInvoices?: unknown[] }).gstInvoices);
    case 'drivers':
      return asRecordRows((data as { drivers?: unknown[] }).drivers);
    case 'vehicles': {
      const d = data as { vehicles?: unknown[] };
      return asRecordRows(d.vehicles);
    }
    case 'nongst':
      return asRecordRows((data as { bills?: unknown[] }).bills);
    case 'maintenance':
      return asRecordRows((data as { maintenance?: unknown[] }).maintenance);
    case 'fuels':
      return asRecordRows((data as { fuels?: unknown[] }).fuels);
    case 'profit': {
      const d = data as { vehicleProfit?: unknown[]; driverProfit?: unknown[]; dailyChart?: unknown[] };
      if (Array.isArray(d.vehicleProfit) && d.vehicleProfit.length) {
        return asRecordRows([...d.vehicleProfit, ...(d.driverProfit ?? [])]);
      }
      return asRecordRows(d.dailyChart);
    }
    default:
      return Array.isArray(data) ? asRecordRows(data) : [data as Record<string, unknown>];
  }
}

function rowsToCsv(rows: Record<string, unknown>[]): string | null {
  if (!rows.length) return null;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '""';
    if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
    if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    return `"${v}"`;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => esc(row[h])).join(','))].join('\n');
}

export function AdminReportsScreen() {
  const navigation = useNavigation<any>();
  const [reportType, setReportType] = useState<MobileReportTypeId>('bookings');
  const [periodType, setPeriodType] = useState<PeriodPreset>('monthly');
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [withGst, setWithGst] = useState(false);
  const [onlyGstEnabled, setOnlyGstEnabled] = useState(false);
  const [tripStatus, setTripStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('');
  const [filterVehicles, setFilterVehicles] = useState<
    Array<{ id: string | number; name: string; vehicle_number?: string }>
  >([]);

  const [listDrillOpen, setListDrillOpen] = useState(false);
  const [listDrillTitle, setListDrillTitle] = useState('');
  const [listDrillRows, setListDrillRows] = useState<Record<string, unknown>[]>([]);
  const [listDrillLoading, setListDrillLoading] = useState(false);

  const openBookingsForDate = async (dateRaw: string) => {
    setListDrillTitle(`Bookings · ${formatReportDateLabel(dateRaw)}`);
    setListDrillOpen(true);
    setListDrillLoading(true);
    setListDrillRows([]);
    try {
      const rows = await adminExtendedAPI.reportsBookingsByDate(dateRaw, {
        trip_status: tripStatus === 'all' ? undefined : tripStatus,
        payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
      });
      setListDrillRows(rows);
    } catch {
      setListDrillRows([]);
    } finally {
      setListDrillLoading(false);
    }
  };

  const openVehicleBookings = async (rec: Record<string, unknown>) => {
    const vidRaw =
      pickStr(rec, 'vehicle_id', 'vehicleId') || String(pickNum(rec, 'vehicle_id', 'vehicleId') || '');
    const vid = vidRaw.trim();
    if (!vid) {
      Alert.alert('Trips', 'No vehicle id for this row.');
      return;
    }
    const vname =
      pickStr(rec, 'vehicle_name', 'vehicleName') ||
      pickStr(rec, 'vehicle_number', 'vehicleNumber') ||
      `Vehicle ${vid}`;
    const range = getDrillQueryParams(periodType, startDate, endDate);
    setListDrillTitle(`${vname} · Trips`);
    setListDrillOpen(true);
    setListDrillLoading(true);
    setListDrillRows([]);
    try {
      const rows = await adminExtendedAPI.reportsBookingsByVehicle(vid, range, {
        trip_status: tripStatus === 'all' ? undefined : tripStatus,
        payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
      });
      setListDrillRows(rows);
    } catch {
      setListDrillRows([]);
    } finally {
      setListDrillLoading(false);
    }
  };

  const openDriverBookings = async (rec: Record<string, unknown>) => {
    const didRaw =
      pickStr(rec, 'driver_id', 'driverId') || String(pickNum(rec, 'driver_id', 'driverId') || '');
    const did = didRaw.trim();
    if (!did) {
      Alert.alert('Trips', 'No driver id for this row.');
      return;
    }
    const dname = pickStr(rec, 'driver_name', 'driverName', 'name') || `Driver ${did}`;
    const range = getDrillQueryParams(periodType, startDate, endDate);
    setListDrillTitle(`${dname} · Trips`);
    setListDrillOpen(true);
    setListDrillLoading(true);
    setListDrillRows([]);
    try {
      const rows = await adminExtendedAPI.reportsBookingsByDriver(did, range, {
        trip_status: tripStatus === 'all' ? undefined : tripStatus,
        payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
      });
      setListDrillRows(rows);
    } catch {
      setListDrillRows([]);
    } finally {
      setListDrillLoading(false);
    }
  };

  const openBookingDetailScreen = (row: Record<string, unknown>) => {
    const id = pickNum(row, 'id', 'booking_id', 'bookingId');
    if (!id) {
      Alert.alert('Booking', 'No booking id on this row.');
      return;
    }
    const bid = Math.round(id);
    const bnum = pickStr(row, 'booking_number', 'bookingNumber');
    setListDrillOpen(false);
    setListDrillTitle('');
    // BookingDetailScreen requires a `booking` object on first render; refetch fills the rest.
    navigation.navigate('BookingDetail', {
      bookingId: bid,
      booking: {
        id: bid,
        ...(bnum ? { booking_number: bnum, bookingNumber: bnum } : {}),
      },
      source: 'admin',
    });
  };

  const openNonGstInvoicePdf = (row: Record<string, unknown>) => {
    const url = nonGstInvoicePdfUrl(row);
    if (!url) {
      Alert.alert('Download', 'This bill has no booking id — PDF download is only for generated invoices.');
      return;
    }
    void Linking.canOpenURL(url).then((ok) => {
      if (ok) void Linking.openURL(url);
      else Alert.alert('Cannot open', 'PDF link is not available.');
    });
  };

  const openGstInvoicePdf = (inv: Record<string, unknown>) => {
    const bookingId = pickStr(inv, 'bookingId', 'booking_id') || pickStr(inv, 'id');
    if (!bookingId) {
      Alert.alert('Download', 'This row has no booking id for PDF download.');
      return;
    }
    const url = gstInvoicePdfUrl(inv);
    void Linking.canOpenURL(url).then((ok) => {
      if (ok) void Linking.openURL(url);
      else Alert.alert('Cannot open', 'PDF link is not available.');
    });
  };

  const selectDateRange = () => {
    setPeriodType('custom');
    if (!startDate) setStartDate(subDays(new Date(), 30));
    if (!endDate) setEndDate(new Date());
  };

  useEffect(() => {
    if (reportType === 'gst') setOnlyGstEnabled(true);
  }, [reportType]);

  useEffect(() => {
    if (reportType !== 'vehicles' && reportType !== 'profit') return;
    const { start_date, end_date } = getReportParams(periodType, startDate, endDate);
    if (!start_date || !end_date) return;
    (async () => {
      try {
        let raw = await adminExtendedAPI.reportsFilterVehicles(start_date, end_date);
        if (!raw.length) {
          const fleet = await adminExtendedAPI.fleetList();
          raw = (fleet as Array<{ id: number; name?: string; vehicleNumber?: string; vehicle_number?: string }>).map(
            (v) => ({
              id: v.id,
              name: v.name,
              vehicle_number: v.vehicleNumber ?? v.vehicle_number,
            })
          );
        }
        setFilterVehicles(
          raw
            .filter((v) => v?.id != null && String(v.id).trim() !== '')
            .map((v) => ({
              id: v.id,
              name: String(v.name || v.vehicle_number || `Vehicle ${v.id}`),
              vehicle_number: v.vehicle_number ?? '',
            }))
        );
      } catch {
        setFilterVehicles([]);
      }
    })();
  }, [reportType, periodType, startDate, endDate]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { period, start_date, end_date } = getReportParams(periodType, startDate, endDate);
      const onlyGstFlag =
        reportType === 'gst' ? true : reportType === 'nongst' ? false : onlyGstEnabled;
      const res = await adminExtendedAPI.reportsFetch({
        type: reportType,
        period,
        start_date,
        end_date,
        payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
        gst: withGst ? true : undefined,
        only_gst_enabled: onlyGstFlag && reportType !== 'nongst' ? true : undefined,
        trip_status: tripStatus === 'all' ? undefined : tripStatus,
        payment_status: paymentStatus === 'all' ? undefined : paymentStatus,
        vehicle_id:
          (reportType === 'vehicles' || reportType === 'profit') && vehicleId ? vehicleId : undefined,
        driver_id: reportType === 'profit' && driverId ? driverId : undefined,
        service_type: reportType === 'profit' && serviceType ? serviceType : undefined,
      });
      setData(normalizeReportPayload(reportType, res));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    reportType,
    periodType,
    startDate,
    endDate,
    paymentMethod,
    withGst,
    onlyGstEnabled,
    tripStatus,
    paymentStatus,
    vehicleId,
    driverId,
    serviceType,
  ]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const safeNum = (v: unknown): number => {
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return Number.isNaN(n) ? 0 : n;
  };

  const exportCsv = async () => {
    const rows = buildCsvPayload(reportType, data);
    const csv = rowsToCsv(rows as Record<string, unknown>[]);
    if (!csv) {
      Alert.alert('Nothing to export', 'Generate a report with data first.');
      return;
    }
    const filename = `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    try {
      if (Platform.OS === 'web') {
        const w = typeof globalThis !== 'undefined' ? (globalThis as { window?: Window & { document?: Document } }).window : undefined;
        if (w?.document) {
          const blob = new Blob([csv], { type: 'text/csv' });
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
        Alert.alert('Export failed', 'File storage is not available on this device.');
        return;
      }
      const path = `${baseDir}${filename}`;
      await writeAsStringAsync(path, csv, { encoding: 'utf8' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export report' });
      } else {
        Alert.alert('Exported', `Saved to cache: ${filename}`);
      }
    } catch {
      Alert.alert('Export failed', 'Could not export CSV.');
    }
  };

  const dataObj = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const filterDrivers = (
    (dataObj?.filters as { drivers?: Array<{ id: string | number; name: string }> } | undefined)?.drivers ?? []
  ).filter((d) => d?.id != null && String(d.id).trim() !== '');
  const filterServiceTypes = (() => {
    const st = (dataObj?.filters as { serviceTypes?: unknown } | undefined)?.serviceTypes;
    if (!Array.isArray(st)) return ['local', 'outstation', 'airport'];
    const strs = st.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
    return strs.length ? strs : ['local', 'outstation', 'airport'];
  })();
  const filterPayload = dataObj?.filters as { vehicles?: typeof filterVehicles } | undefined;
  const vehiclesForPicker =
    filterPayload?.vehicles && filterPayload.vehicles.length > 0 ? filterPayload.vehicles : filterVehicles;

  const renderSummaryCards = () => {
    const d = dataObj;
    if (!d) return null;

    switch (reportType) {
      case 'revenue': {
        const total = safeNum(d.totalRevenue);
        const daily = d.dailyRevenue as { date: string; total: number }[] | undefined;
        const count = Array.isArray(daily) ? daily.length : 0;
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Total revenue',
                  `Reported revenue for this period: ${formatAmount(total)}. Open the detail list below for the daily series and breakdowns.`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{formatAmount(total)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Days in series',
                  `${count} day(s) with revenue in this report. Each day appears as a row below — tap a row to see the exact date.`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Days</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'bookings': {
        const total = safeNum(d.totalBookings);
        const byStatus = d.bookingsByStatus as Record<string, number> | undefined;
        const completed = byStatus ? safeNum(byStatus.completed ?? byStatus.Completed) : 0;
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Total bookings',
                  `All statuses: ${Math.round(total)} booking(s). Tap a date row below to list bookings for that day (same as the web report).`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Bookings</Text>
              <Text style={styles.summaryValue}>{total}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert('Completed', `${Math.round(completed)} completed in this period (from status breakdown).`)
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Completed</Text>
              <Text style={styles.summaryValue}>{completed}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'drivers': {
        const drivers = d.drivers as Record<string, unknown>[] | undefined;
        const arr = Array.isArray(drivers) ? drivers : [];
        const totalEarnings = arr.reduce((sum, r) => sum + safeNum(r.total_earnings ?? r.totalEarnings), 0);
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Drivers',
                  `${arr.length} driver(s) in this report. Tap a driver card below for trips and earnings.`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Drivers</Text>
              <Text style={styles.summaryValue}>{arr.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert('Total earnings', `Combined earnings across listed drivers: ${formatAmount(totalEarnings)}.`)
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Earnings</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalEarnings)}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'vehicles': {
        const vehiclesRaw = d.vehicles as unknown[] | undefined;
        const arr = Array.isArray(vehiclesRaw) ? vehiclesRaw : [];
        const totalRev = arr.reduce(
          (sum: number, r: unknown) =>
            sum + safeNum((r as Record<string, unknown>).total_revenue ?? (r as Record<string, unknown>).totalRevenue),
          0
        );
        const totalProfit = arr.reduce(
          (sum: number, r: unknown) => sum + safeNum((r as Record<string, unknown>).profit),
          0
        );
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Fleet revenue',
                  `Sum of booking revenue for listed (${arr.length}) vehicles: ${formatAmount(totalRev)}. Tap a vehicle below to open trips (same as web “trips” drill-down).`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Revenue</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalRev)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert(
                  'Fleet profit',
                  `Sum of per-vehicle profit for this period: ${formatAmount(totalProfit)}.`
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Profit</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalProfit)}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'gst': {
        const summary = (d.summary ?? {}) as Record<string, unknown>;
        const listLen = Array.isArray(d.gstInvoices) ? (d.gstInvoices as unknown[]).length : 0;
        const invCount = pickNum(summary, 'totalInvoices', 'total_invoices') || listLen;
        const taxable = pickNum(summary, 'totalTaxableValue', 'total_taxable_value');
        const gstAmt = pickNum(summary, 'totalGstAmount', 'total_gst_amount');
        const totalIncl = pickNum(summary, 'totalWithGst', 'total_with_gst');
        const cells = [
          {
            label: 'Invoices',
            value: String(Math.round(invCount)),
            hint: `GST-enabled invoices in this period: ${Math.round(invCount)}. Scroll to the list below.`,
          },
          {
            label: 'Taxable',
            value: formatAmount(taxable),
            hint: `Total taxable value across invoices: ${formatAmount(taxable)}.`,
          },
          {
            label: 'GST amount',
            value: formatAmount(gstAmt),
            hint: `Total GST collected: ${formatAmount(gstAmt)}.`,
          },
          {
            label: 'Total (incl.)',
            value: formatAmount(totalIncl),
            hint: `Taxable plus GST (as reported): ${formatAmount(totalIncl)}.`,
          },
        ];
        return (
          <View style={styles.profitKpiGrid}>
            {cells.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={styles.summaryCard}
                onPress={() => Alert.alert(c.label, c.hint)}
                activeOpacity={0.75}
              >
                <Text style={styles.summaryLabel}>{c.label}</Text>
                <Text style={styles.summaryValue}>{c.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }
      case 'nongst': {
        const bills = d.bills as unknown[] | undefined;
        const arr = Array.isArray(bills) ? bills : [];
        const sumAmt = arr.reduce(
          (s: number, b: unknown) => s + safeNum((b as Record<string, unknown>).amount),
          0
        );
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert('Bills', `${arr.length} non-GST bill(s). Tap a bill below to download PDF when a booking is linked.`)
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Bills</Text>
              <Text style={styles.summaryValue}>{arr.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() =>
                Alert.alert('Amount', `Sum of bill amounts: ${formatAmount(sumAmt)}.`)
              }
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Amount</Text>
              <Text style={styles.summaryValue}>{formatAmount(sumAmt)}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'fuels': {
        const totalCost = safeNum(d.totalCost);
        const totalLiters = safeNum(d.totalLiters);
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() => Alert.alert('Fuel cost', `Total spend: ${formatAmount(totalCost)}.`)}
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Total cost</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalCost)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() => Alert.alert('Fuel volume', `Total liters: ${totalLiters.toFixed(1)} L.`)}
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Liters</Text>
              <Text style={styles.summaryValue}>{totalLiters.toFixed(1)}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'maintenance': {
        const totalCost = safeNum(d.totalCost);
        const records = d.maintenance as unknown[] | undefined;
        const count = Array.isArray(records) ? records.length : 0;
        return (
          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() => Alert.alert('Maintenance cost', `Total: ${formatAmount(totalCost)}.`)}
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Total cost</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalCost)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.summaryCard}
              onPress={() => Alert.alert('Records', `${count} maintenance record(s) in this period.`)}
              activeOpacity={0.75}
            >
              <Text style={styles.summaryLabel}>Records</Text>
              <Text style={styles.summaryValue}>{count}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case 'profit': {
        const kpis = d.kpis as Record<string, unknown> | undefined;
        if (!kpis) return null;
        const netP = pickNum(kpis, 'netProfit', 'net_profit');
        const cells = [
          {
            label: 'Revenue',
            value: formatAmount(pickNum(kpis, 'totalRevenue', 'total_revenue')),
            color: '#16a34a',
            hint: 'Total trip revenue included in this profit dashboard.',
          },
          {
            label: 'Expenses',
            value: formatAmount(pickNum(kpis, 'totalExpenses', 'total_expenses')),
            color: '#dc2626',
            hint: 'Operating expenses allocated in this period.',
          },
          {
            label: 'Net profit',
            value: formatAmount(netP),
            color: netP >= 0 ? '#16a34a' : '#dc2626',
            hint: `Net profit after expenses: ${formatAmount(netP)}.`,
          },
          {
            label: 'Margin %',
            value: `${pickNum(kpis, 'profitMargin', 'profit_margin')}%`,
            color: colors.primary,
            hint: 'Profit as a percentage of revenue.',
          },
          {
            label: 'Trips',
            value: String(Math.round(pickNum(kpis, 'totalTrips', 'total_trips'))),
            color: colors.primary,
            hint: 'Trip count used in this dashboard.',
          },
          {
            label: 'Avg / trip',
            value: formatAmount(pickNum(kpis, 'avgRevenuePerTrip', 'avg_revenue_per_trip')),
            color: colors.primary,
            hint: 'Average revenue per trip.',
          },
        ];
        return (
          <View style={styles.profitKpiGrid}>
            {cells.map((c) => (
              <TouchableOpacity
                key={c.label}
                style={styles.summaryCard}
                onPress={() => Alert.alert(c.label, c.hint)}
                activeOpacity={0.75}
              >
                <Text style={styles.summaryLabel}>{c.label}</Text>
                <Text style={[styles.summaryValue, { color: c.color }]}>{c.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }
      default:
        return null;
    }
  };

  const renderDetailSections = (): React.ReactNode => {
    const d = dataObj;
    if (!d && !Array.isArray(data)) return null;

    switch (reportType) {
      case 'revenue': {
        const daily = d?.dailyRevenue as { date: string; total: number }[] | undefined;
        const rows = Array.isArray(daily) ? daily : [];
        const byTrip = d?.revenueByTripType as Record<string, number> | undefined;
        const byPay = d?.revenueByPaymentMethod as Record<string, number> | undefined;
        const gstSummary = d?.gstSummary as Record<string, unknown> | undefined;
        return (
          <>
            {withGst && gstSummary && Object.keys(gstSummary).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>GST summary</Text>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() =>
                    Alert.alert(
                      'GST summary (revenue)',
                      `Rate ${pickStr(gstSummary as Record<string, unknown>, 'gstRate', 'gst_rate') || '—'}\nTaxable ${formatAmount(pickNum(gstSummary as Record<string, unknown>, 'taxableAmount', 'taxable_amount'))}\nGST ${formatAmount(pickNum(gstSummary as Record<string, unknown>, 'gstAmount', 'gst_amount'))}\nTotal ${formatAmount(pickNum(gstSummary as Record<string, unknown>, 'totalWithGst', 'total_with_gst'))}`
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.cardSub}>
                    Rate {pickStr(gstSummary as Record<string, unknown>, 'gstRate', 'gst_rate') || '—'} · Taxable{' '}
                    {formatAmount(pickNum(gstSummary as Record<string, unknown>, 'taxableAmount', 'taxable_amount'))} · GST{' '}
                    {formatAmount(pickNum(gstSummary as Record<string, unknown>, 'gstAmount', 'gst_amount'))} · Total{' '}
                    {formatAmount(pickNum(gstSummary as Record<string, unknown>, 'totalWithGst', 'total_with_gst'))}
                  </Text>
                  <Text style={styles.tapCue}>Tap for details</Text>
                </TouchableOpacity>
              </View>
            )}
            {byTrip && Object.keys(byTrip).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By trip type</Text>
                {Object.entries(byTrip).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={styles.card}
                    onPress={() => Alert.alert(k, `Revenue attributed to “${k}”: ${formatAmount(safeNum(v))}`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{k}</Text>
                    <Text style={styles.amount}>{formatAmount(safeNum(v))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {byPay && Object.keys(byPay).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By payment method</Text>
                {Object.entries(byPay).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={styles.card}
                    onPress={() => Alert.alert(k, `Revenue via ${k}: ${formatAmount(safeNum(v))}`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{k}</Text>
                    <Text style={styles.amount}>{formatAmount(safeNum(v))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {rows.slice(0, 60).map((r, i) => (
              <TouchableOpacity
                key={r.date ?? i}
                style={styles.card}
                onPress={() =>
                  Alert.alert(
                    formatReportDateLabel(String(r.date)),
                    `Revenue for this day: ${formatAmount(r.total ?? 0)}`
                  )
                }
                activeOpacity={0.75}
              >
                <Text style={styles.cardTitle}>{formatReportDateLabel(String(r.date))}</Text>
                <Text style={styles.amount}>{formatAmount(r.total ?? 0)}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      }
      case 'bookings': {
        const daily = d?.dailyBookings as { date: string; count: number }[] | undefined;
        const rows = Array.isArray(daily) ? daily : [];
        const byStatus = d?.bookingsByStatus as Record<string, number> | undefined;
        return (
          <>
            {byStatus && Object.keys(byStatus).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By status</Text>
                {Object.entries(byStatus).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={styles.card}
                    onPress={() => Alert.alert(String(k), `${safeNum(v)} booking(s) with status “${k}”.`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{k}</Text>
                    <Text style={styles.amount}>{safeNum(v)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {rows.slice(0, 60).map((r, i) => (
              <TouchableOpacity
                key={r.date ?? i}
                style={styles.card}
                onPress={() => r.date && openBookingsForDate(String(r.date))}
                activeOpacity={0.7}
              >
                <Text style={styles.cardTitle}>{formatReportDateLabel(String(r.date))}</Text>
                <Text style={styles.cardSub}>{r.count ?? 0} bookings · tap for details</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      }
      case 'drivers': {
        const drivers = d?.drivers as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(drivers) ? drivers : [];
        return rows.slice(0, 50).map((r, i) => (
          <TouchableOpacity
            key={String(r.driver_id ?? r.driverId ?? i)}
            style={styles.card}
            onPress={() => openDriverBookings(r)}
            activeOpacity={0.75}
          >
            <Text style={styles.cardTitle}>{String(r.driver_name ?? r.driverName ?? '—')}</Text>
            <Text style={styles.cardSub}>
              {Number(r.total_trips ?? r.totalTrips ?? 0)} trips • {formatAmount(safeNum(r.total_earnings ?? r.totalEarnings))}
            </Text>
            {typeof (r.rating ?? 0) === 'number' && Number(r.rating) > 0 && (
              <Text style={styles.cardSub}>Rating: {Number(r.rating).toFixed(1)}</Text>
            )}
            <Text style={styles.tapCue}>Tap to see trips for this driver</Text>
          </TouchableOpacity>
        ));
      }
      case 'vehicles': {
        const vehicles = (d?.vehicles as unknown[]) ?? [];
        const rows = Array.isArray(vehicles) ? vehicles : [];
        return rows.slice(0, 50).map((r, i) => {
          const rec = r as Record<string, unknown>;
          return (
            <TouchableOpacity
              key={String(rec.vehicle_id ?? rec.vehicleId ?? i)}
              style={styles.card}
              onPress={() => openVehicleBookings(rec)}
              activeOpacity={0.75}
            >
              <Text style={styles.cardTitle}>{String(rec.vehicle_name ?? rec.vehicleNumber ?? '—')}</Text>
              <Text style={styles.cardSub}>
                {String(rec.vehicle_number ?? rec.vehicleNumber ?? '')} • {Number(rec.total_trips ?? rec.totalTrips ?? 0)} trips
              </Text>
              <Text style={styles.amount}>
                Rev: {formatAmount(safeNum(rec.total_revenue ?? rec.totalRevenue))} | Profit:{' '}
                {formatAmount(safeNum(rec.profit))}
              </Text>
              <Text style={styles.tapCue}>Tap to list trips (like web)</Text>
            </TouchableOpacity>
          );
        });
      }
      case 'gst': {
        const invoices = d?.gstInvoices as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(invoices) ? invoices : [];
        return (
          <>
            <Text style={styles.sectionTitleMuted}>GST-enabled invoices only</Text>
            {rows.slice(0, 80).map((r, i) => {
              const invNo = pickStr(r, 'invoiceNumber', 'invoice_number', 'id');
              const cust = pickStr(r, 'customerName', 'customer_name', 'passenger_name');
              const co = pickStr(r, 'companyName', 'company_name');
              const gstNo = pickStr(r, 'gstNumber', 'gst_number');
              const dt = pickStr(r, 'invoiceDate', 'invoice_date', 'created_at');
              const rate = pickStr(r, 'gstRate', 'gst_rate');
              return (
                <TouchableOpacity
                  key={String(r.id ?? invNo ?? i)}
                  style={styles.card}
                  onPress={() => openGstInvoicePdf(r)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cardTitle}>{invNo || '—'}</Text>
                  <Text style={styles.cardSub}>{cust || co || '—'}</Text>
                  {gstNo ? <Text style={styles.cardSub}>GSTIN {gstNo}</Text> : null}
                  <Text style={styles.cardSub}>
                    {formatReportDateLabel(dt)} · Rate {rate || '—'} · Taxable{' '}
                    {formatAmount(pickNum(r, 'taxableValue', 'taxable_value'))} · GST{' '}
                    {formatAmount(pickNum(r, 'gstAmount', 'gst_amount', 'tax_amount'))}
                  </Text>
                  <Text style={styles.amount}>{formatAmount(pickNum(r, 'totalAmount', 'total_amount'))}</Text>
                  <View style={styles.linkBtn}>
                    <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                    <Text style={styles.linkBtnText}>Tap row for PDF</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        );
      }
      case 'nongst': {
        const bills = d?.bills as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(bills) ? bills : [];
        return rows.slice(0, 80).map((r, i) => (
          <TouchableOpacity
            key={String(r.id ?? r.billNumber ?? i)}
            style={styles.card}
            onPress={() => {
              if (nonGstInvoicePdfUrl(r)) openNonGstInvoicePdf(r);
              else {
                Alert.alert(
                  String(r.billNumber ?? r.id ?? 'Bill'),
                  `${pickStr(r, 'customerName', 'customer_name')}\n${String(r.date ?? '')}\n${formatAmount(safeNum(r.amount))}\n${pickStr(r, 'paymentStatus', 'payment_status')} · ${pickStr(r, 'paymentMethod', 'payment_method')}`
                );
              }
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.cardTitle}>{String(r.billNumber ?? r.id ?? '—')}</Text>
            <Text style={styles.cardSub}>
              {String(r.customerName ?? r.customer_name ?? '')} · {String(r.date ?? '')}
            </Text>
            <Text style={styles.cardSub}>
              {String(r.paymentStatus ?? r.payment_status ?? '')} · {String(r.paymentMethod ?? r.payment_method ?? '')}
            </Text>
            <Text style={styles.amount}>{formatAmount(safeNum(r.amount))}</Text>
            <Text style={styles.tapCue}>
              {nonGstInvoicePdfUrl(r) ? 'Tap to download PDF' : 'Tap for details'}
            </Text>
          </TouchableOpacity>
        ));
      }
      case 'fuels': {
        const fuels = d?.fuels as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(fuels) ? fuels : [];
        const fuelVehicleTitle = (r: Record<string, unknown>) =>
          pickStr(r, 'vehicleName', 'vehicle_name') ||
          pickStr(r, 'vehicleNumber', 'vehicle_number') ||
          (pickStr(r, 'vehicleId', 'vehicle_id') ? `Vehicle ${pickStr(r, 'vehicleId', 'vehicle_id')}` : '—');
        return rows.slice(0, 50).map((r, i) => (
          <View key={String(r.id ?? i)} style={[styles.card, styles.fuelCardRow]}>
            <TouchableOpacity
              style={styles.fuelCardMain}
              onPress={() =>
                Alert.alert(
                  'Fuel record',
                  [
                    `Vehicle: ${fuelVehicleTitle(r)}`,
                    `Date: ${String(r.date ?? r.fill_date ?? '')}`,
                    pickStr(r, 'fuelType', 'fuel_type') && `Fuel: ${pickStr(r, 'fuelType', 'fuel_type')}`,
                    `Liters: ${safeNum(r.liters ?? r.quantity ?? r.quantityLiters ?? 0).toFixed(2)}`,
                    `Rate/L: ${formatAmount(safeNum(r.pricePerLiter ?? r.pricePerUnit ?? 0))}`,
                    `Cost: ${formatAmount(safeNum(r.cost ?? r.totalCost ?? 0))}`,
                    pickStr(r, 'fuelStation', 'fuel_station') && `Station: ${pickStr(r, 'fuelStation', 'fuel_station')}`,
                  ]
                    .filter(Boolean)
                    .join('\n')
                )
              }
              activeOpacity={0.75}
            >
              <Text style={styles.cardTitle}>
                {fuelVehicleTitle(r)} • {String(r.date ?? r.fill_date ?? '')}
              </Text>
              <Text style={styles.cardSub}>
                {safeNum(r.liters ?? r.quantity ?? r.quantityLiters ?? 0).toFixed(1)}L @{' '}
                {formatAmount(safeNum(r.pricePerLiter ?? r.pricePerUnit ?? 0))}/L
              </Text>
              <Text style={styles.amount}>{formatAmount(safeNum(r.cost ?? r.totalCost ?? 0))}</Text>
              <Text style={styles.tapCue}>Tap for summary · pencil opens edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fuelEditBtn}
              onPress={() => {
                const fid = pickNum(r, 'id');
                if (!fid) {
                  Alert.alert('Fuel', 'This row has no record id.');
                  return;
                }
                navigation.navigate('AdminFuel', { editRecordId: Math.round(fid) });
              }}
              hitSlop={{ top: 14, bottom: 14, left: 8, right: 14 }}
              accessibilityLabel="Edit fuel record"
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ));
      }
      case 'maintenance': {
        const maintenance = d?.maintenance as Record<string, unknown>[] | undefined;
        const rows = Array.isArray(maintenance) ? maintenance : [];
        return rows.slice(0, 50).map((r, i) => (
          <TouchableOpacity
            key={String(r.id ?? i)}
            style={styles.card}
            onPress={() =>
              Alert.alert(
                String(r.serviceType ?? r.service_type ?? 'Maintenance'),
                `Date: ${String(r.date ?? '')}\nCost: ${formatAmount(safeNum(r.cost ?? 0))}\n${pickStr(r, 'description', 'vendor', 'notes')}`
              )
            }
            activeOpacity={0.75}
          >
            <Text style={styles.cardTitle}>{String(r.serviceType ?? r.service_type ?? '—')}</Text>
            <Text style={styles.cardSub}>{String(r.date ?? '')} • {String(r.description ?? r.vendor ?? '')}</Text>
            <Text style={styles.amount}>{formatAmount(safeNum(r.cost ?? 0))}</Text>
          </TouchableOpacity>
        ));
      }
      case 'profit': {
        if (!d?.kpis) return null;
        const dailyChart = (d.dailyChart as { date: string; revenue: number; expense: number; profit: number }[]) ?? [];
        const revenueBreakdown = (d.revenueBreakdown as Record<string, number>) ?? {};
        const expenseBreakdown = (d.expenseBreakdown as Record<string, number>) ?? {};
        const vehicleProfit = (d.vehicleProfit as Record<string, unknown>[]) ?? [];
        const driverProfit = (d.driverProfit as Record<string, unknown>[]) ?? [];
        const areaReport = (d.areaReport as Record<string, unknown>[]) ?? [];
        const todaySnapshot = d.todaySnapshot as { revenue: number; expense: number; profit: number } | undefined;
        return (
          <>
            {todaySnapshot && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today</Text>
                <TouchableOpacity
                  style={styles.card}
                  onPress={() =>
                    Alert.alert(
                      'Today',
                      `Revenue ${formatAmount(safeNum(todaySnapshot.revenue))}\nExpenses ${formatAmount(safeNum(todaySnapshot.expense))}\nProfit ${formatAmount(safeNum(todaySnapshot.profit))}`
                    )
                  }
                  activeOpacity={0.75}
                >
                  <Text style={styles.cardSub}>
                    Rev {formatAmount(safeNum(todaySnapshot.revenue))} · Exp{' '}
                    {formatAmount(safeNum(todaySnapshot.expense))} · Profit {formatAmount(safeNum(todaySnapshot.profit))}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {dailyChart.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Daily</Text>
                {dailyChart.slice(0, 45).map((pt, i) => (
                  <TouchableOpacity
                    key={pt.date ?? i}
                    style={styles.card}
                    onPress={() =>
                      Alert.alert(
                        String(pt.date),
                        `Revenue ${formatAmount(pt.revenue)}\nExpenses ${formatAmount(pt.expense)}\nProfit ${formatAmount(pt.profit)}`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{pt.date}</Text>
                    <Text style={styles.cardThick}>
                      R {formatAmount(pt.revenue)} · E {formatAmount(pt.expense)} · P {formatAmount(pt.profit)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {Object.keys(revenueBreakdown).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revenue breakdown</Text>
                {Object.entries(revenueBreakdown).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={styles.card}
                    onPress={() => Alert.alert(k, `Revenue: ${formatAmount(safeNum(v))}`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{k}</Text>
                    <Text style={styles.amount}>{formatAmount(safeNum(v))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {Object.keys(expenseBreakdown).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Expense breakdown</Text>
                {Object.entries(expenseBreakdown).map(([k, v]) => (
                  <TouchableOpacity
                    key={k}
                    style={styles.card}
                    onPress={() => Alert.alert(k, `Expense: ${formatAmount(safeNum(v))}`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{k}</Text>
                    <Text style={styles.amount}>{formatAmount(safeNum(v))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {vehicleProfit.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By vehicle</Text>
                {vehicleProfit.slice(0, 30).map((r, i) => (
                  <TouchableOpacity
                    key={String(r.vehicleId ?? r.vehicle_id ?? i)}
                    style={styles.card}
                    onPress={() => {
                      const synth = {
                        vehicle_id: r.vehicleId ?? r.vehicle_id,
                        vehicleId: r.vehicleId ?? r.vehicle_id,
                        vehicle_name: pickStr(r, 'vehicle', 'vehicle_name', 'vehicleName'),
                        vehicle_number: pickStr(r, 'vehicle_number', 'vehicleNumber'),
                      } as Record<string, unknown>;
                      openVehicleBookings(synth);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>
                      {pickStr(r, 'vehicle', 'vehicle_name', 'vehicleName', 'vehicle_number') || '—'}
                    </Text>
                    <Text style={styles.cardSub}>
                      R {formatAmount(pickNum(r, 'revenue', 'total_revenue'))} · E{' '}
                      {formatAmount(pickNum(r, 'expense', 'total_expense'))}
                    </Text>
                    <Text style={styles.amount}>Profit {formatAmount(pickNum(r, 'profit', 'net_profit'))}</Text>
                    <Text style={styles.tapCue}>Tap for trips</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {driverProfit.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By driver</Text>
                {driverProfit.slice(0, 30).map((r, i) => (
                  <TouchableOpacity
                    key={String(r.driverId ?? r.driver_id ?? i)}
                    style={styles.card}
                    onPress={() =>
                      Alert.alert(
                        pickStr(r, 'driver', 'driver_name', 'driverName') || 'Driver',
                        `Trips: ${pickNum(r, 'trips', 'trip_count')}\nRevenue ${formatAmount(pickNum(r, 'revenue', 'total_revenue'))}\nExpenses ${formatAmount(pickNum(r, 'expense', 'total_expense'))}\nProfit ${formatAmount(pickNum(r, 'profit', 'net_profit'))}`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>
                      {pickStr(r, 'driver', 'driver_name', 'driverName') || '—'}
                    </Text>
                    <Text style={styles.cardSub}>
                      {pickNum(r, 'trips', 'trip_count')} trips · R{' '}
                      {formatAmount(pickNum(r, 'revenue', 'total_revenue'))} · E{' '}
                      {formatAmount(pickNum(r, 'expense', 'total_expense'))}
                    </Text>
                    <Text style={styles.amount}>Profit {formatAmount(pickNum(r, 'profit', 'net_profit'))}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {areaReport.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By area</Text>
                {areaReport.slice(0, 25).map((r, i) => (
                  <TouchableOpacity
                    key={String(r.area ?? i)}
                    style={styles.card}
                    onPress={() =>
                      Alert.alert(
                        String(r.area ?? 'Area'),
                        `${safeNum(r.trips)} trips · Revenue ${formatAmount(safeNum(r.revenue))}`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Text style={styles.cardTitle}>{String(r.area ?? '—')}</Text>
                    <Text style={styles.cardSub}>
                      {safeNum(r.trips)} trips · {formatAmount(safeNum(r.revenue))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  const reportHasContent = () => {
    if (!data || typeof data !== 'object') return false;
    const o = dataObj;
    if (!o) return false;
    switch (reportType) {
      case 'profit':
        return !!o.kpis;
      case 'gst': {
        const summ = (o.summary ?? {}) as Record<string, unknown>;
        const n = pickNum(summ, 'totalInvoices', 'total_invoices');
        const list = Array.isArray(o.gstInvoices) ? o.gstInvoices.length : 0;
        return list > 0 || n > 0 || pickNum(summ, 'totalGstAmount', 'total_gst_amount') > 0;
      }
      case 'nongst':
        return Array.isArray(o.bills) && o.bills.length > 0;
      case 'vehicles':
        return Array.isArray(o.vehicles) && o.vehicles.length > 0;
      case 'drivers':
        return Array.isArray(o.drivers) && o.drivers.length > 0;
      case 'fuels':
        return Array.isArray(o.fuels) && o.fuels.length > 0;
      case 'maintenance':
        return Array.isArray(o.maintenance) && o.maintenance.length > 0;
      case 'bookings':
        return (
          safeNum(o.totalBookings) > 0 ||
          (Array.isArray(o.dailyBookings) && o.dailyBookings.length > 0)
        );
      case 'revenue':
        return (
          safeNum(o.totalRevenue) > 0 ||
          (Array.isArray(o.dailyRevenue) && o.dailyRevenue.length > 0) ||
          !!(o.revenueByTripType && Object.keys(o.revenueByTripType as object).length > 0) ||
          !!(o.revenueByPaymentMethod && Object.keys(o.revenueByPaymentMethod as object).length > 0)
        );
      default:
        return true;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setFilterOpen(true)} style={styles.iconBtn}>
            <Ionicons name="filter-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportCsv} style={styles.iconBtn}>
            <Ionicons name="download-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeScrollContent}>
        {MOBILE_REPORT_MODULES.map((mod) => {
          const active = reportType === mod.id;
          const iconName = (mod.iconMobile ?? 'file-tray-outline') as React.ComponentProps<typeof Ionicons>['name'];
          return (
            <TouchableOpacity
              key={mod.id}
              style={[styles.typeBtn, active && styles.typeBtnActive]}
              onPress={() => setReportType(mod.id as MobileReportTypeId)}
            >
              <View style={styles.typeBtnInner}>
                <Ionicons name={iconName} size={16} color={active ? '#fff' : colors.gray600} />
                <Text style={[styles.typeText, active && styles.typeTextActive]}>{mod.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
        <TouchableOpacity style={styles.generateBtn} onPress={() => { setLoading(true); void load(); }} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.generateBtnText}>Generate</Text>
            </>
          )}
        </TouchableOpacity>
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

      <Modal visible={filterOpen} animationType="slide" transparent>
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Ionicons name="close" size={26} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterScroll} contentContainerStyle={{ paddingBottom: 24 }}>
              {(reportType === 'bookings' || reportType === 'nongst') && (
                <>
                  <Text style={styles.filterLabel}>Trip status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {TRIP_STATUS_FILTERS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, tripStatus === opt.value && styles.chipActive]}
                        onPress={() => setTripStatus(opt.value)}
                      >
                        <Text style={[styles.chipText, tripStatus === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterLabel}>Payment status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {PAYMENT_STATUS_FILTERS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.chip, paymentStatus === opt.value && styles.chipActive]}
                        onPress={() => setPaymentStatus(opt.value)}
                      >
                        <Text style={[styles.chipText, paymentStatus === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.filterLabel}>Payment method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PAYMENT_METHODS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, paymentMethod === opt.value && styles.chipActive]}
                    onPress={() => setPaymentMethod(opt.value)}
                  >
                    <Text style={[styles.chipText, paymentMethod === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.switchRow}>
                <Text style={styles.filterLabel}>Include GST in revenue calc</Text>
                <Switch value={withGst} onValueChange={setWithGst} />
              </View>

              {reportType !== 'gst' && reportType !== 'nongst' && (
                <View style={styles.switchRow}>
                  <Text style={styles.filterLabel}>Only GST-enabled invoices</Text>
                  <Switch value={onlyGstEnabled} onValueChange={setOnlyGstEnabled} />
                </View>
              )}

              {(reportType === 'vehicles' || reportType === 'profit') && (
                <>
                  <Text style={styles.filterLabel}>Vehicle</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !vehicleId && styles.chipActive]}
                      onPress={() => setVehicleId('')}
                    >
                      <Text style={[styles.chipText, !vehicleId && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {vehiclesForPicker.map((v) => (
                      <TouchableOpacity
                        key={String(v.id)}
                        style={[styles.chip, vehicleId === String(v.id) && styles.chipActive]}
                        onPress={() => setVehicleId(String(v.id))}
                      >
                        <Text style={[styles.chipText, vehicleId === String(v.id) && styles.chipTextActive]}>
                          {v.vehicle_number || v.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {reportType === 'profit' && (
                <>
                  <Text style={styles.filterLabel}>Driver</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !driverId && styles.chipActive]}
                      onPress={() => setDriverId('')}
                    >
                      <Text style={[styles.chipText, !driverId && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {filterDrivers.map((drv) => (
                      <TouchableOpacity
                        key={String(drv.id)}
                        style={[styles.chip, driverId === String(drv.id) && styles.chipActive]}
                        onPress={() => setDriverId(String(drv.id))}
                      >
                        <Text style={[styles.chipText, driverId === String(drv.id) && styles.chipTextActive]}>{drv.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.filterLabel}>Service type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, !serviceType && styles.chipActive]}
                      onPress={() => setServiceType('')}
                    >
                      <Text style={[styles.chipText, !serviceType && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {filterServiceTypes
                      .filter((s) => s != null && String(s).trim() !== '')
                      .map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.chip, serviceType === s && styles.chipActive]}
                          onPress={() => setServiceType(s)}
                        >
                          <Text style={[styles.chipText, serviceType === s && styles.chipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                setFilterOpen(false);
                setLoading(true);
                void load();
              }}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray600} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {reportHasContent() ? (
            <>
              {renderSummaryCards()}
              {renderDetailSections()}
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="stats-chart-outline" size={48} color={colors.gray200} />
              <Text style={styles.emptyText}>No report data for this period</Text>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Modal
        visible={listDrillOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setListDrillOpen(false)}
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle} numberOfLines={2}>
                {listDrillTitle}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setListDrillOpen(false);
                  setListDrillTitle('');
                }}
              >
                <Ionicons name="close" size={26} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {listDrillLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.bookingDrillScroll} contentContainerStyle={styles.bookingDrillContent}>
                {listDrillRows.length === 0 ? (
                  <Text style={styles.emptyText}>No bookings found.</Text>
                ) : (
                  listDrillRows.map((row, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.card}
                      onPress={() => openBookingDetailScreen(row)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.cardTitle}>
                        {pickStr(row, 'booking_number', 'bookingNumber') ||
                          `#${pickStr(row, 'id', 'booking_id', 'bookingId') || String(idx + 1)}`}
                      </Text>
                      <Text style={styles.cardSub}>
                        {pickStr(row, 'passenger_name', 'passengerName', 'customer_name', 'customerName')}
                      </Text>
                      <Text style={styles.amount}>
                        {formatAmount(pickNum(row, 'total_amount', 'totalAmount'))}
                      </Text>
                      <Text style={styles.cardSub}>
                        {pickStr(row, 'status', 'trip_status')} · Pay:{' '}
                        {pickStr(row, 'payment_status', 'paymentStatus', 'computed_payment_status')}
                      </Text>
                      {pickStr(row, 'pickup_location', 'pickupLocation') ? (
                        <Text style={styles.cardSub} numberOfLines={2}>
                          {pickStr(row, 'pickup_location', 'pickupLocation')} →{' '}
                          {pickStr(row, 'drop_location', 'dropLocation', 'dropoff_location')}
                        </Text>
                      ) : null}
                      <Text style={styles.tapCue}>Tap to open booking</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, marginRight: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 8 },
  typeScroll: { maxHeight: 58, backgroundColor: '#fff' },
  typeScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
  },
  typeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeBtnActive: { backgroundColor: colors.primary },
  typeText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  typeTextActive: { color: '#fff' },
  periodRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
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
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  filterTitle: { fontSize: 18, fontWeight: '700' },
  filterScroll: { maxHeight: 420 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginTop: 12, marginHorizontal: 16 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 8,
    marginBottom: 4,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  chipTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  applyBtn: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  profitKpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryCard: {
    flexGrow: 1,
    minWidth: '40%',
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
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  sectionTitleMuted: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 10,
    marginTop: 4,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  tapCue: { fontSize: 12, color: colors.gray500, marginTop: 6, fontWeight: '500' },
  bookingDrillScroll: { maxHeight: 480 },
  bookingDrillContent: { padding: 16, paddingBottom: 32 },
  fuelCardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  fuelCardMain: {
    flex: 1,
    paddingRight: 4,
  },
  fuelEditBtn: {
    justifyContent: 'center',
    alignSelf: 'center',
    paddingLeft: 4,
    paddingVertical: 4,
  },
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
  cardThick: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginTop: 4 },
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
