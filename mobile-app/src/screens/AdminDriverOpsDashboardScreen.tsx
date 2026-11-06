/**
 * Super-admin driver operations dashboard — parity with web `DriverDashboard.tsx`.
 * Trips, fuel, summary metrics, filters, charts (simplified), trip edit/delete.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Linking,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { driverDashboardAPI } from '../services/driverDashboardAPI';
import { dashboardTripToDriverTrip } from '../services/driverTripsAPI';
import { adminAPI } from '../services/adminAPI';
import type {
  DriverDashboardData,
  DriverDashboardTrip,
  DriverFuelRecord,
  OpsTripStatus,
  PaymentType,
} from '../types/driverDashboard';
import { format } from 'date-fns';
import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AdminDriverOpsTripEditModal } from '../components/AdminDriverOpsTripEditModal';
import { DriverLiveMap } from '../components/DriverLiveMap';
import { shareBookingDutySlip } from '../lib/bookingDutySlip';
import {
  loadSuperAdminPushMute,
  setSuperAdminPushMute,
  subscribeSuperAdminPushMute,
} from '../lib/superAdminPushMute';

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

const OPS_STATUS_TABS: Array<{ id: 'all' | OpsTripStatus; label: string; dot: string }> = [
  { id: 'all', label: 'All', dot: '#64748b' },
  { id: 'assigned', label: 'Assigned', dot: '#2563eb' },
  { id: 'receipt_accepted', label: 'Receipt accepted', dot: '#4f46e5' },
  { id: 'in_progress', label: 'In progress', dot: '#ea580c' },
  { id: 'day_closed', label: 'Day closed', dot: '#475569' },
  { id: 'completed', label: 'Completed', dot: '#16a34a' },
  { id: 'cancelled', label: 'Cancelled', dot: '#dc2626' },
];

function opsStatusLabel(status: OpsTripStatus): string {
  switch (status) {
    case 'assigned':
      return 'Assigned';
    case 'receipt_accepted':
      return 'Confirm Receipt – Accepted';
    case 'in_progress':
      return 'In Progress';
    case 'day_closed':
      return 'Day closed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function opsStatusTone(status: OpsTripStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'assigned':
      return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
    case 'receipt_accepted':
      return { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' };
    case 'in_progress':
      return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
    case 'day_closed':
      return { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };
    case 'completed':
      return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
    case 'cancelled':
      return { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function parseIsoDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const parsed = new Date(`${iso}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatFilterDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!iso) return 'Select date';
  return format(parsed, 'dd-MM-yyyy');
}

const PAYMENT_OPTIONS: Array<{ id: 'all' | PaymentType; label: string }> = [
  { id: 'all', label: 'All Payments' },
  { id: 'company_paid', label: 'Company Paid' },
  { id: 'company_phonepe', label: 'Company PhonePe' },
  { id: 'self_paid', label: 'Self Paid' },
  { id: 'corporate_booking', label: 'Corporate' },
  { id: 'agent_booking', label: 'Agent' },
];

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
  return format(date, 'dd MMM yyyy');
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

type MainTab = 'dashboard' | 'trips' | 'live' | 'fuel' | 'reports';

const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: 'trips', label: 'Trips' },
  { key: 'live', label: 'Live GPS' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'reports', label: 'Reports' },
  { key: 'dashboard', label: 'Charts' },
];

function formatTrackedAgo(value: string | null | undefined): string {
  if (!value) return 'No GPS yet';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'No GPS yet';
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

const DATE_STRIP_PAST_DAYS = 180;
const DATE_STRIP_FUTURE_DAYS = 21;

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function shiftIsoDay(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function formatIsoDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AdminDriverOpsDashboardScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';

  const [data, setData] = useState<DriverDashboardData>(INITIAL_DATA);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [alertsMuted, setAlertsMuted] = useState(false);
  const [muteBusy, setMuteBusy] = useState(false);

  const [search, setSearch] = useState((route.params?.bookingNumber ?? '').trim());
  const [status, setStatus] = useState<'all' | OpsTripStatus>('all');
  const [paymentType, setPaymentType] = useState<'all' | PaymentType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [driverId, setDriverId] = useState<number | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [paymentPickerOpen, setPaymentPickerOpen] = useState(false);
  const [datePicker, setDatePicker] = useState<null | 'from' | 'to'>(null);
  const [iosDraftDate, setIosDraftDate] = useState(new Date());
  const [tripPage, setTripPage] = useState(0);
  const [fuelPage, setFuelPage] = useState(0);
  const [mainTab, setMainTab] = useState<MainTab>('trips');
  const [liveTrips, setLiveTrips] = useState<DriverDashboardTrip[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [mapHeld, setMapHeld] = useState(false);

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
      vehicleNumber: vehicleNumber || undefined,
    }),
    [search, status, paymentType, fromDate, toDate, driverId, vehicleNumber]
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
        'Fuel_L',
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
        opsStatusLabel(trip.opsStatus),
        toSafeNumber(trip.startingOdometer).toFixed(1),
        toSafeNumber(trip.endingOdometer).toFixed(1),
        toSafeNumber(trip.totalDurationHours).toFixed(1),
        toSafeNumber(trip.totalKilometers).toFixed(1),
        toSafeNumber(trip.fuelLitres).toFixed(2),
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
    const unsubscribe = subscribeSuperAdminPushMute(setAlertsMuted);
    void loadSuperAdminPushMute();
    return unsubscribe;
  }, [isSuper]);

  const handleToggleAlerts = async () => {
    if (muteBusy) return;
    setMuteBusy(true);
    try {
      await setSuperAdminPushMute(!alertsMuted);
    } catch {
      Alert.alert('Notifications', 'Could not save that setting. Check your connection and try again.');
    } finally {
      setMuteBusy(false);
    }
  };

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
    const loadVehicles = async () => {
      try {
        const response = await adminAPI.getFleetVehicles(true);
        const numbers = response
          .map((vehicle) => String(vehicle.vehicleNumber || vehicle.vehicle_number || '').trim())
          .filter((number) => number !== '');
        setVehicles(Array.from(new Set(numbers)).sort((a, b) => a.localeCompare(b)));
      } catch {
        setVehicles([]);
      }
    };
    void loadVehicles();
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
          vehicleNumber: vehicleNumber || undefined,
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
    [isSuper, search, status, paymentType, fromDate, toDate, driverId, vehicleNumber]
  );

  useEffect(() => {
    const code = (route.params?.bookingNumber ?? '').trim();
    if (!code) return;
    setSearch(code);
    setStatus('all');
    setFromDate('');
    setToDate('');
    setDriverId(null);
    setVehicleNumber('');
    setPaymentType('all');
    setTripPage(0);
    setMainTab('trips');
  }, [route.params?.bookingNumber]);

  useEffect(() => {
    if (!isSuper) return;
    void loadInternal(tripPage, fuelPage);
  }, [isSuper, tripPage, fuelPage, loadInternal]);

  useEffect(() => {
    if (!isSuper || mainTab !== 'live') return;
    let cancelled = false;
    let first = true;
    const pull = async () => {
      if (first) setLiveLoading(true);
      try {
        const day = todayIso();
        const [moving, assignedToday] = await Promise.all([
          driverDashboardAPI.getDashboard({
            status: 'in_progress',
            tripLimit: 100,
            tripOffset: 0,
            fuelLimit: 1,
            fuelOffset: 0,
            skipCache: true,
          }),
          driverDashboardAPI.getDashboard({
            status: 'assigned',
            fromDate: day,
            toDate: day,
            tripLimit: 100,
            tripOffset: 0,
            fuelLimit: 1,
            fuelOffset: 0,
            skipCache: true,
          }),
        ]);
        if (cancelled) return;
        const merged = new Map<number, DriverDashboardTrip>();
        [...moving.trips.items, ...assignedToday.trips.items].forEach((trip) => {
          merged.set(trip.tripId, trip);
        });
        const next = Array.from(merged.values()).sort((a, b) => {
          const aLive = a.liveLat != null ? 0 : 1;
          const bLive = b.liveLat != null ? 0 : 1;
          return aLive - bLive || (a.driverName || '').localeCompare(b.driverName || '');
        });
        setLiveTrips(next);
      } catch {
        if (!cancelled) setLiveTrips([]);
      } finally {
        first = false;
        if (!cancelled) setLiveLoading(false);
      }
    };
    void pull();
    const timer = setInterval(() => {
      void pull();
    }, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isSuper, mainTab]);

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
    setVehicleNumber('');
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

  const vehicleOptions = useMemo(() => {
    const numbers = new Set(vehicles);
    data.trips.items.forEach((trip) => {
      const number = (trip.vehicleNumber || '').trim();
      if (number && number !== '—') numbers.add(number);
    });
    return Array.from(numbers).sort((a, b) => a.localeCompare(b));
  }, [vehicles, data.trips.items]);

  const selectedDriverLabel =
    driverId && driverId > 0
      ? driverOptions.find((d) => d.id === driverId)?.name ?? `Driver #${driverId}`
      : 'All Drivers';
  const selectedVehicleLabel = vehicleNumber || 'All Vehicles';
  const selectedPaymentLabel = PAYMENT_OPTIONS.find((option) => option.id === paymentType)?.label ?? 'All Payments';
  const dateRangeLabel =
    !fromDate && !toDate
      ? 'All dates'
      : fromDate && toDate && fromDate === toDate
        ? formatIsoDayLabel(fromDate)
        : `${fromDate ? formatIsoDayLabel(fromDate) : 'Start'} to ${toDate ? formatIsoDayLabel(toDate) : 'latest'}`;
  const dateStripDays = Array.from(
    { length: DATE_STRIP_PAST_DAYS + 1 + DATE_STRIP_FUTURE_DAYS },
    (_, index) => shiftIsoDay(todayIso(), index - DATE_STRIP_PAST_DAYS),
  );
  const dayStripRef = useRef<ScrollView>(null);
  const didScrollToToday = useRef(false);

  const openDatePicker = (which: 'from' | 'to') => {
    setIosDraftDate(parseIsoDate(which === 'from' ? fromDate : toDate));
    setDatePicker(which);
  };

  const onAndroidDate = (event: DateTimePickerEvent, date?: Date) => {
    const which = datePicker;
    setDatePicker(null);
    if (event.type === 'dismissed' || !date || !which) return;
    const iso = toIsoDate(date);
    if (which === 'from') setFromDate(iso);
    else setToDate(iso);
  };

  const openTripMenu = (trip: DriverDashboardTrip) => {
    const actions: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [];
    if (trip.liveLat != null && trip.liveLng != null) {
      actions.push({
        text: 'Live location',
        onPress: () => {
          void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${trip.liveLat},${trip.liveLng}`);
        },
      });
    }
    actions.push(
      {
        text: 'Edit trip',
        onPress: () => {
          setEditTrip(trip);
          setEditOpen(true);
        },
      },
      {
        text: 'Duty slip',
        onPress: () => {
          void shareBookingDutySlip(trip.tripId, trip.tripCode);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    );
    Alert.alert(trip.tripCode, undefined, actions);
  };

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
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>Driver Dashboard</Text>
          <Text style={styles.headerSub} numberOfLines={1}>Trips for {dateRangeLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setRefreshing(true);
            void loadInternal(tripPage, fuelPage, { skipLoadingSpinner: true });
          }}
          style={styles.headerAction}
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh" size={16} color={colors.foreground} />
          <Text style={styles.headerActionText}>{loading ? '…' : 'Refresh'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            void handleToggleAlerts();
          }}
          style={styles.headerIconBtn}
          disabled={muteBusy}
          accessibilityLabel={alertsMuted ? 'Unmute office alerts' : 'Mute alerts'}
        >
          <Ionicons
            name={alertsMuted ? 'notifications-off-outline' : 'notifications-outline'}
            size={18}
            color={alertsMuted ? '#b45309' : colors.foreground}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!mapHeld}
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
        <View style={styles.metricStrip}>
          <StripMetric title="Completed" value={String(data.summary.totalTripsCompleted)} />
          <StripMetric title="Km" value={toSafeNumber(data.summary.totalKilometers).toFixed(0)} />
          <StripMetric title="Hours" value={toSafeNumber(data.summary.totalHours).toFixed(1)} />
          <StripMetric title="Fuel" value={`₹${toSafeNumber(data.summary.totalFuelSpend).toFixed(0)}`} />
          <StripMetric title="Net" value={`₹${toSafeNumber(data.summary.netEarnings).toFixed(0)}`} />
          <StripMetric title="Profit" value={`₹${toSafeNumber(data.summary.profitEstimation).toFixed(0)}`} />
        </View>

        <View style={styles.dayRow}>
          <TouchableOpacity
            style={[styles.dayCell, !fromDate && !toDate && styles.dayCellActive]}
            onPress={() => {
              setFromDate('');
              setToDate('');
              setTripPage(0);
            }}
          >
            <Text style={[styles.dayCellTop, !fromDate && !toDate && styles.dayCellTopActive]}>All</Text>
            <Text style={[styles.dayCellSub, !fromDate && !toDate && styles.dayCellSubActive]}>dates</Text>
          </TouchableOpacity>
          <ScrollView
            ref={dayStripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dayScroll}
            contentContainerStyle={styles.dayStrip}
          >
          {dateStripDays.map((iso) => {
            const [year, month, day] = iso.split('-').map(Number);
            const date = new Date(year, (month || 1) - 1, day || 1);
            const selected = fromDate === iso && toDate === iso;
            const isToday = iso === todayIso();
            return (
              <TouchableOpacity
                key={iso}
                style={[styles.dayCell, selected && styles.dayCellActive]}
                onLayout={isToday ? (event) => {
                  if (didScrollToToday.current) return;
                  const x = event.nativeEvent.layout.x;
                  requestAnimationFrame(() => {
                    dayStripRef.current?.scrollTo({ x, animated: false });
                    didScrollToToday.current = true;
                  });
                } : undefined}
                onPress={() => {
                  setFromDate(iso);
                  setToDate(iso);
                  setTripPage(0);
                  setMainTab('trips');
                }}
              >
                <Text style={[styles.dayCellTop, selected && styles.dayCellTopActive]}>
                  {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayCellNum, selected && styles.dayCellNumActive]}>{String(day).padStart(2, '0')}</Text>
                <Text style={[styles.dayCellSub, selected && styles.dayCellSubActive]}>
                  {date.toLocaleDateString('en-IN', { month: 'short' })}
                </Text>
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
          <TextInput
            style={styles.filterInput}
            placeholder="Trip / driver"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={applyFilters}
            placeholderTextColor={colors.gray400}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={applyFilters}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => setDriverPickerOpen(true)}>
            <Text style={styles.filterChipText} numberOfLines={1}>{selectedDriverLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => setVehiclePickerOpen(true)}>
            <Text style={styles.filterChipText} numberOfLines={1}>{selectedVehicleLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => openDatePicker('from')}>
            <Text style={styles.filterChipText}>From {fromDate ? formatFilterDate(fromDate) : '—'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => openDatePicker('to')}>
            <Text style={styles.filterChipText}>To {toDate ? formatFilterDate(toDate) : '—'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => setPaymentPickerOpen(true)}>
            <Text style={styles.filterChipText} numberOfLines={1}>{selectedPaymentLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip} onPress={() => void resetFiltersAndLoad()}>
            <Text style={styles.filterChipText}>Reset</Text>
          </TouchableOpacity>
        </ScrollView>

        {loadError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Unable to load: {loadError}</Text>
            <TouchableOpacity
              onPress={() => {
                setRefreshing(true);
                void loadInternal(tripPage, fuelPage, { skipLoadingSpinner: true });
              }}
            >
              <Text style={styles.retryLink}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.pillTabs}>
          {MAIN_TABS.map((tab) => {
            const active = mainTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.pillTab, active && styles.pillTabActive]} onPress={() => setMainTab(tab.key)}>
                <Text style={[styles.pillTabText, active && styles.pillTabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mainTab === 'trips' ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.statusScroll}
            contentContainerStyle={styles.statusScrollContent}
          >
            {OPS_STATUS_TABS.map((tab) => {
              const active = status === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => {
                    setStatus(tab.id);
                    setTripPage(0);
                  }}
                >
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

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

            {mainTab === 'live' && (
              <View>
                <DriverLiveMap
                  trips={liveTrips}
                  focusId={selectedLiveId}
                  onSelect={setSelectedLiveId}
                  onGestureStart={() => setMapHeld(true)}
                  onGestureEnd={() => setMapHeld(false)}
                />
                {liveLoading && liveTrips.length === 0 ? (
                  <Text style={styles.emptyInline}>Loading live trips…</Text>
                ) : null}
                {!liveLoading && liveTrips.length === 0 ? (
                  <Text style={styles.emptyInline}>No assigned or in-progress trips to track right now.</Text>
                ) : null}
                {liveTrips.map((trip) => {
                  const sharing = trip.liveLat != null && trip.liveLng != null;
                  const selected = selectedLiveId === trip.tripId;
                  return (
                    <TouchableOpacity
                      key={trip.tripId}
                      style={[styles.webTripCard, selected && styles.liveCardSelected]}
                      onPress={() => setSelectedLiveId(trip.tripId)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.webTripTop}>
                        <Text style={styles.webTripCode} numberOfLines={1}>
                          {trip.driverName || `Driver #${trip.driverId}`}
                        </Text>
                        <Text style={[styles.liveShare, sharing && styles.liveShareOn]}>
                          {sharing ? formatTrackedAgo(trip.liveTrackedAt) : 'No GPS yet'}
                        </Text>
                      </View>
                      <Text style={styles.webTripRoute} numberOfLines={1}>
                        {trip.vehicleNumber || 'No vehicle'} · {trip.tripCode} · {opsStatusLabel(trip.opsStatus)}
                      </Text>
                      <Text style={styles.webTripRoute} numberOfLines={1}>
                        {compactLocation(trip.pickupLocation)} → {compactLocation(trip.dropLocation)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {mainTab === 'trips' && (
              <View>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Trips ({data.trips.total})</Text>
                  <TouchableOpacity
                    style={[styles.csvBtn, exporting !== null && styles.csvBtnDisabled]}
                    onPress={() => void exportTripsCsv()}
                    disabled={exporting !== null}
                  >
                    <Ionicons name="download-outline" size={16} color={colors.primary} />
                    <Text style={styles.csvBtnText}>{exporting === 'trips' ? 'Exporting…' : 'Download CSV'}</Text>
                  </TouchableOpacity>
                </View>
                {data.trips.items.map((trip, idx) => {
                  const tone = opsStatusTone(trip.opsStatus);
                  const hours = toSafeNumber(trip.totalDurationHours);
                  const km = toSafeNumber(trip.endingOdometer) > 0 ? toSafeNumber(trip.totalKilometers) : 0;
                  return (
                    <TouchableOpacity
                      key={`${trip.tripCode ?? trip.tripId}-${trip.tripId}-${idx}`}
                      style={styles.webTripCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (!isSuper) return;
                        navigation.navigate('DriverTripDetail', { trip: dashboardTripToDriverTrip(trip) });
                      }}
                    >
                      <View style={styles.webTripTop}>
                        <View style={styles.webTripCopy}>
                          <Text style={styles.webTripCode} numberOfLines={1}>{trip.tripCode}</Text>
                          <Text style={styles.webTripWhen}>{formatJourneyDate(trip.startTime)}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                          <Text style={[styles.statusPillText, { color: tone.text }]}>{opsStatusLabel(trip.opsStatus)}</Text>
                        </View>
                      </View>
                      <Text style={styles.webTripDriver} numberOfLines={1}>
                        {trip.driverName || `Driver #${trip.driverId}`} · {trip.vehicleNumber || '—'}
                      </Text>
                      <Text style={styles.webTripRoute} numberOfLines={1}>
                        {compactLocation(trip.pickupLocation)} → {compactLocation(trip.dropLocation)}
                      </Text>
                      {toSafeNumber(trip.fuelSpend) > 0 ? (
                        <Text style={styles.webTripMeta}>
                          Fuel ₹{toSafeNumber(trip.fuelSpend).toFixed(0)}
                          {trip.fuelTiming === 'after'
                            ? ' · After trip end'
                            : trip.fuelTiming === 'before'
                              ? ' · Before trip end'
                              : trip.fuelTiming === 'mixed'
                                ? ' · Before and after trip end'
                                : ''}
                        </Text>
                      ) : null}
                      <View style={styles.webTripFoot}>
                        <Text style={styles.webTripMeta}>
                          {trip.driverCollectsPayment === false ? 'Do not collect' : `₹${toSafeNumber(trip.tripAmount).toFixed(0)}`}
                          {hours > 0 ? ` · ${hours.toFixed(1)} h` : ''}
                          {km > 0 ? ` · ${km.toFixed(0)} km` : ''}
                          {trip.liveLat != null ? ' · GPS on' : ''}
                        </Text>
                        <TouchableOpacity style={styles.menuBtn} onPress={() => openTripMenu(trip)}>
                          <Ionicons name="ellipsis-horizontal" size={18} color={colors.gray600} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {data.trips.items.length === 0 ? <Text style={styles.emptyInline}>No trips for this filter.</Text> : null}
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

      <Modal visible={vehiclePickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setVehiclePickerOpen(false)}>
          <View style={styles.driverModal}>
            <Text style={styles.driverModalTitle}>Vehicle</Text>
            <ScrollView style={styles.driverScroll} keyboardShouldPersistTaps="handled">
              {['All Vehicles', ...vehicleOptions].map((number) => (
                <TouchableOpacity
                  key={number}
                  style={styles.driverRow}
                  onPress={() => {
                    setVehicleNumber(number === 'All Vehicles' ? '' : number);
                    setVehiclePickerOpen(false);
                  }}
                >
                  <Text style={styles.driverRowText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={paymentPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPaymentPickerOpen(false)}>
          <View style={styles.driverModal}>
            <Text style={styles.driverModalTitle}>Payment</Text>
            {PAYMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.driverRow}
                onPress={() => {
                  setPaymentType(option.id);
                  setPaymentPickerOpen(false);
                }}
              >
                <Text style={styles.driverRowText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {datePicker && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseIsoDate(datePicker === 'from' ? fromDate : toDate)}
          mode="date"
          display="calendar"
          onChange={onAndroidDate}
        />
      ) : null}
      {datePicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" onRequestClose={() => setDatePicker(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.driverModal}>
              <DateTimePicker
                value={iosDraftDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => { if (date) setIosDraftDate(date); }}
              />
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  const iso = toIsoDate(iosDraftDate);
                  if (datePicker === 'from') setFromDate(iso);
                  else setToDate(iso);
                  setDatePicker(null);
                }}
              >
                <Text style={styles.applyBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

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

function StripMetric({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.stripCell}>
      <Text style={styles.stripLabel}>{title}</Text>
      <Text style={styles.stripValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SummaryTile({
  title,
  value,
  icon,
  tint,
  wash,
}: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  wash: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <View style={[styles.summaryIcon, { backgroundColor: wash }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function FilterField({
  label,
  icon,
  value,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.filterField} onPress={onPress}>
      <Text style={styles.filterFieldLabel}>{label}</Text>
      <View style={styles.filterFieldRow}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.filterFieldValue} numberOfLines={1}>{value}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.gray400} />
      </View>
    </TouchableOpacity>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
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
      {fuel.loggedAfterTripEnd === true ? <Text style={styles.fuelTrip}>After trip end</Text> : null}
      {fuel.loggedAfterTripEnd === false ? <Text style={styles.fuelTrip}>Before trip end</Text> : null}
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
        <Ionicons name="chevron-back" size={18} color={page <= 0 ? colors.gray300 : colors.gray700} />
      </TouchableOpacity>
      <View style={styles.pagerCurrent}>
        <Text style={styles.pagerCurrentText}>{page + 1}</Text>
      </View>
      <TouchableOpacity style={styles.pagerBtn} onPress={onNext} disabled={page + 1 >= totalPages}>
        <Ionicons name="chevron-forward" size={18} color={page + 1 >= totalPages ? colors.gray300 : colors.gray700} />
      </TouchableOpacity>
      <Text style={styles.pagerInfo}>Page {page + 1} of {totalPages}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#f4f7fb',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.gray500, marginTop: 1 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerActionText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: 10,
  },
  stripCell: {
    width: '33.33%',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  stripLabel: { fontSize: 10, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase' },
  stripValue: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginTop: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  dayScroll: { flex: 1 },
  dayStrip: { gap: 4, paddingBottom: 8, paddingRight: 8 },
  dayCell: {
    minWidth: 52,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dayCellActive: { backgroundColor: colors.primary },
  dayCellTop: { fontSize: 10, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase' },
  dayCellTopActive: { color: 'rgba(255,255,255,0.85)' },
  dayCellNum: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  dayCellNumActive: { color: '#fff' },
  dayCellSub: { fontSize: 10, fontWeight: '600', color: colors.gray500, textTransform: 'uppercase' },
  dayCellSubActive: { color: 'rgba(255,255,255,0.85)' },
  filterStrip: { gap: 8, alignItems: 'center', paddingBottom: 8 },
  filterInput: {
    width: 150,
    height: 36,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    color: colors.foreground,
    fontSize: 13,
  },
  searchBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  filterChip: {
    height: 36,
    maxWidth: 180,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipText: { fontSize: 13, color: colors.foreground, maxWidth: 140 },
  retryLink: { color: colors.primary, fontWeight: '700', fontSize: 13, marginTop: 6 },
  pillTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#eef2f7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  pillTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  pillTabActive: { backgroundColor: '#fff' },
  pillTabText: { fontSize: 13, fontWeight: '600', color: colors.gray500 },
  pillTabTextActive: { color: colors.foreground },
  webTripCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  webTripTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  webTripCopy: { flex: 1, minWidth: 0 },
  webTripCode: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  webTripWhen: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  webTripDriver: { fontSize: 14, color: colors.foreground, marginTop: 8 },
  webTripRoute: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  webTripFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  webTripMeta: { flex: 1, fontSize: 12, color: colors.gray500 },
  liveCardSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  liveShare: { fontSize: 10, fontWeight: '700', color: colors.gray500 },
  liveShareOn: { color: '#059669' },
  accordion: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  accordionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  accordionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionCopy: { flex: 1 },
  accordionTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  accordionHint: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  accordionBody: { paddingHorizontal: 12, paddingBottom: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  summaryTile: {
    width: '31.5%',
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryValue: { fontSize: 18, fontWeight: '800', color: colors.foreground },
  summaryTitle: { fontSize: 11, color: colors.gray500, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8eef5',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: colors.foreground },
  pairRow: { flexDirection: 'row', gap: 10 },
  filterField: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8eef5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  filterFieldLabel: { fontSize: 11, color: colors.gray500, marginBottom: 4 },
  filterFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterFieldValue: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.foreground },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 2,
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8eef5',
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 8,
  },
  resetBtnText: { color: colors.gray700, fontWeight: '700', fontSize: 15 },
  tabRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eef5',
  },
  mainTab: { flex: 1, alignItems: 'center', paddingBottom: 10, gap: 4 },
  mainTabText: { fontSize: 11, fontWeight: '600', color: colors.gray500 },
  mainTabTextActive: { color: colors.primary },
  mainTabLine: { position: 'absolute', left: 12, right: 12, bottom: 0, height: 2, borderRadius: 2, backgroundColor: colors.primary },
  statusScroll: { marginBottom: 10, backgroundColor: '#eef2f7', borderRadius: 8 },
  statusScrollContent: { padding: 4, gap: 4, alignItems: 'center' },
  statusChip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: { backgroundColor: '#fff' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  statusChipTextActive: { color: colors.foreground },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground },
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
  csvBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary, marginLeft: 6 },
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  tripTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripCode: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.foreground },
  statusPill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  metaLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  metaDate: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  driverName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground },
  chevronBtn: { padding: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  tripRoute: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  statCell: { width: '25%', paddingVertical: 6, paddingRight: 6 },
  statLabel: { fontSize: 10, color: colors.gray500 },
  statValue: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginTop: 2 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  payBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  payBadgeText: { fontSize: 12, fontWeight: '600', color: colors.gray700 },
  menuBtn: { padding: 6 },
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
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerCurrent: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pagerCurrentText: { color: '#fff', fontWeight: '800' },
  pagerInfo: { fontSize: 13, color: colors.gray600, marginLeft: 4 },
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
