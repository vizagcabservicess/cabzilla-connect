import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { driverDashboardAPI } from '@/services/api/driverDashboardAPI';
import { authAPI } from '@/services/api/authAPI';
import type { DriverDashboardData, DriverDashboardTrip, OpsTripStatus, PaymentType } from '@/types/driverDashboard';
import { DriverDashboardTripEditSheet } from '@/components/admin/DriverDashboardTripEditSheet';
import { VendorTripLinkDialog, type VendorTripLinkTarget } from '@/components/admin/VendorTripLinkDialog';
import { DriverOfficeTripSheet } from '@/components/admin/DriverOfficeTripSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, BellOff, ChevronDown, Download, FileText, MapPin, MoreHorizontal, Pencil, RefreshCw, Send } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { DriverTripsPDF } from '@/components/pdf/DriverTripsPDF';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AdminLayout from '@/components/admin/AdminLayout';
import { DriverLiveMap } from '@/components/admin/DriverLiveMap';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/providers/AuthProvider';
import { fleetAPI } from '@/services/api/fleetAPI';
import { getApiUrl } from '@/config/api';

function vendorLinkTarget(trip: DriverDashboardTrip): VendorTripLinkTarget {
  return {
    tripId: trip.tripId,
    tripCode: trip.tripCode,
    driverName: trip.driverName,
    driverPhone: trip.driverPhone,
    vehicleNumber: trip.vehicleNumber,
    fare: trip.tripAmount,
    advance: trip.advancePaidAmount,
  };
}

const OPS_STATUS_TABS: Array<{ id: 'all' | OpsTripStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'receipt_accepted', label: 'Confirm Receipt – Accepted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'day_closed', label: 'Day closed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function SearchableFilter({
  allLabel,
  selectedLabel,
  options,
  onSelect,
}: {
  allLabel: string;
  selectedLabel: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-between px-3 font-normal">
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-2" align="start">
        <Input
          autoFocus
          placeholder={`Search ${allLabel.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-2 max-h-60 overflow-y-auto">
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              onSelect('');
              setOpen(false);
            }}
          >
            {allLabel}
          </button>
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">No matches</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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

function opsStatusColor(status: OpsTripStatus): string {
  switch (status) {
    case 'assigned':
      return 'bg-blue-100 text-blue-700';
    case 'receipt_accepted':
      return 'bg-indigo-100 text-indigo-700';
    case 'in_progress':
      return 'bg-amber-100 text-amber-700';
    case 'day_closed':
      return 'bg-slate-200 text-slate-800';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

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

function parseTripTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatJourneyDate(value: string | null): string {
  const date = parseTripTime(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN');
}

function formatStartClock(value: string | null | undefined): string {
  if (!value || !/[T ]\d{2}:\d{2}/.test(value)) return '';
  const date = parseTripTime(value);
  if (!date || (date.getHours() === 0 && date.getMinutes() === 0)) return '';
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function formatOdo(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return Math.round(value).toLocaleString('en-IN');
}

function extraCategoryLabel(code: string | null | undefined): string {
  switch ((code || '').trim().toLowerCase()) {
    case 'extra_hours':
      return 'Extra hours';
    case 'extra_km':
      return 'Extra km';
    case 'tolls':
      return 'Tolls';
    case 'other':
      return 'Others';
    default:
      return '';
  }
}

function formatIsoDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

function formatJourneyWhen(value: string | null): string {
  const date = parseTripTime(value);
  if (!date) return '—';
  if (!value || !/[T ]\d{2}:\d{2}/.test(value)) return date.toLocaleDateString('en-IN');
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}

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

function DateStrip({
  fromDate,
  toDate,
  onSelectDay,
  onSelectAll,
}: {
  fromDate: string;
  toDate: string;
  onSelectDay: (iso: string) => void;
  onSelectAll: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const start = todayIso();
  const pastDays = 180;
  const days = Array.from({ length: pastDays + 1 + 21 }, (_, index) => shiftIsoDay(start, index - pastDays));
  const allSelected = fromDate === '' && toDate === '';

  useEffect(() => {
    const node = stripRef.current;
    const today = node?.querySelector<HTMLElement>('[data-today="1"]');
    if (!node || !today) return;
    node.scrollLeft = today.offsetLeft;
  }, []);

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={onSelectAll}
        className={`flex min-w-[52px] shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase ${
          allSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        All
        <span className="text-[10px] font-medium normal-case">dates</span>
      </button>
      <div ref={stripRef} className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto pb-1">
      {days.map((iso) => {
        const [year, month, day] = iso.split('-').map(Number);
        const date = new Date(year, (month || 1) - 1, day || 1);
        const selected = fromDate === iso && toDate === iso;
        return (
          <button
            key={iso}
            type="button"
            data-today={iso === start ? '1' : undefined}
            onClick={() => onSelectDay(iso)}
            className={`flex min-w-[52px] shrink-0 flex-col items-center rounded-lg px-2 py-1 leading-tight ${
              selected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {date.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
            <span className="text-base font-semibold tabular-nums">{String(day).padStart(2, '0')}</span>
            <span className={`text-[10px] font-semibold uppercase ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {date.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function tripTotalAmount(trip: DriverDashboardTrip): number {
  return toSafeNumber(trip.tripAmount) + toSafeNumber(trip.extraCollectedAmount);
}

function fuelTimingPhrase(timing: DriverDashboardTrip['fuelTiming']): string {
  if (timing === 'after') return 'After trip end';
  if (timing === 'before') return 'Before trip end';
  if (timing === 'mixed') return 'Before and after trip end';
  return '';
}

function fillTimingPhrase(loggedAfter: boolean | null | undefined): string {
  if (loggedAfter === true) return 'After trip end';
  if (loggedAfter === false) return 'Before trip end';
  return '';
}

function formatTripPaymentLabel(code: string): string {
  const c = (code || '').trim().toLowerCase();
  const map: Record<string, string> = {
    company_phonepe: 'Company PhonePe',
    company_paid: 'Company A/C',
    self_paid: 'Self',
    agent_booking: 'Agent booking',
    corporate_booking: 'Corporate',
  };
  return map[c] || c.replace(/_/g, ' ') || '—';
}

export default function DriverDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DriverDashboardData>(INITIAL_DATA);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [status, setStatus] = useState<'all' | OpsTripStatus>('assigned');
  const [panel, setPanel] = useState('trips');
  const [paymentType, setPaymentType] = useState<'all' | PaymentType>('all');
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [liveTrips, setLiveTrips] = useState<DriverDashboardTrip[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [selectedLiveId, setSelectedLiveId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicles, setVehicles] = useState<Array<{ number: string }>>([]);
  const [tripPage, setTripPage] = useState(0);
  const [fuelPage, setFuelPage] = useState(0);
  const [editTrip, setEditTrip] = useState<DriverDashboardTrip | null>(null);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [linkTrip, setLinkTrip] = useState<VendorTripLinkTarget | null>(null);
  const [officeTrip, setOfficeTrip] = useState<DriverDashboardTrip | null>(null);
  const [exporting, setExporting] = useState<null | 'trips' | 'trips-pdf' | 'fuel'>(null);
  const [alertsMuted, setAlertsMuted] = useState(false);
  const [muteBusy, setMuteBusy] = useState(false);
  const [muteError, setMuteError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    let cancelled = false;
    void authAPI
      .getPushMuted()
      .then((muted) => {
        if (!cancelled) setAlertsMuted(muted);
      })
      .catch(() => {
        // The mute endpoint is available after push-mute.php is uploaded.
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const pageSize = 15;
  const exportFetchLimit = 8000;

  if (authLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const dashboardFilterParams = () => ({
    search: appliedSearch || undefined,
    status: status === 'all' ? undefined : status,
    paymentType: paymentType === 'all' ? undefined : paymentType,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    driverId: driverId ? Number(driverId) : undefined,
    vehicleNumber: vehicleNumber || undefined,
  });

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await driverDashboardAPI.getDashboard({
        ...dashboardFilterParams(),
        tripLimit: pageSize,
        tripOffset: tripPage * pageSize,
        fuelLimit: pageSize,
        fuelOffset: fuelPage * pageSize,
      });
      setData(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportFuelCsv = async () => {
    setExporting('fuel');
    try {
      const response = await driverDashboardAPI.getDashboard({
        ...dashboardFilterParams(),
        tripLimit: 1,
        tripOffset: 0,
        fuelLimit: exportFetchLimit,
        fuelOffset: 0,
      });
      const headers = ['Date & Time (ISO)', 'Amount_INR', 'Litres', 'Vehicle_number', 'Linked_trip_ID'];
      const rows = response.fuelRecords.items.map((f) => [
        f.dateTime ? new Date(f.dateTime).toISOString() : '',
        toSafeNumber(f.fuelAmount).toFixed(2),
        toSafeNumber(f.fuelQuantityLitres).toFixed(2),
        f.vehicleNumber?.trim() ?? '',
        f.linkedTripId != null ? String(f.linkedTripId) : '',
      ]);
      downloadCsvFile(`fuel-records-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setExporting(null);
    }
  };

  const tripExportHeaders = [
    'Trip',
    'Journey date',
    'Driver',
    'Vehicle',
    'From',
    'To',
    'Status',
    'Hours',
    'Km',
    'Amount',
    'Advance',
    'Payment',
  ];

  const tripExportRows = (items: DriverDashboardTrip[]) => items.map((trip) => [
    trip.tripCode,
    formatJourneyWhen(trip.startedAt || trip.startTime),
    trip.driverName || `Driver #${trip.driverId}`,
    trip.vehicleNumber || '',
    compactLocation(trip.pickupLocation),
    compactLocation(trip.dropLocation),
    opsStatusLabel(trip.opsStatus),
    toSafeNumber(trip.totalDurationHours) > 0 ? toSafeNumber(trip.totalDurationHours).toFixed(1) : '',
    toSafeNumber(trip.endingOdometer) > 0 ? toSafeNumber(trip.totalKilometers).toFixed(1) : '',
    trip.driverCollectsPayment === false ? 'Do not collect' : tripTotalAmount(trip).toFixed(0),
    toSafeNumber(trip.advancePaidAmount) > 0 ? toSafeNumber(trip.advancePaidAmount).toFixed(0) : '',
    formatTripPaymentLabel(trip.paymentType),
  ]);

  const dateRangeLabel = () => {
    if (!fromDate && !toDate) return 'All dates';
    if (fromDate && toDate && fromDate === toDate) return formatIsoDayLabel(fromDate);
    return `${fromDate ? formatIsoDayLabel(fromDate) : 'Start'} to ${toDate ? formatIsoDayLabel(toDate) : 'latest'}`;
  };

  const fetchFilteredTrips = async () => {
    const response = await driverDashboardAPI.getDashboard({
      ...dashboardFilterParams(),
      tripLimit: exportFetchLimit,
      tripOffset: 0,
      fuelLimit: 1,
      fuelOffset: 0,
    });
    return response.trips.items;
  };

  const handleExportTripsCsv = async () => {
    setExporting('trips');
    try {
      const items = await fetchFilteredTrips();
      downloadCsvFile(`driver-ops-trips-${new Date().toISOString().slice(0, 10)}.csv`, tripExportHeaders, tripExportRows(items));
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'CSV export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportTripsPdf = async () => {
    setExporting('trips-pdf');
    try {
      const items = await fetchFilteredTrips();
      const blob = await pdf(
        <DriverTripsPDF
          subtitle={`${items.length} trip${items.length === 1 ? '' : 's'} · ${dateRangeLabel()}`}
          headers={tripExportHeaders}
          rows={tripExportRows(items)}
        />
      ).toBlob();
      saveAs(blob, `driver-ops-trips-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'PDF export failed');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const response = await fleetAPI.getDrivers();
        const normalized = (response ?? [])
          .map((driver: any) => ({
            id: Number(driver.id),
            name: String(driver.name ?? `Driver #${driver.id}`),
          }))
          .filter((driver) => Number.isFinite(driver.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        setDrivers(normalized);
      } catch {
        setDrivers([]);
      }
    };
    loadDrivers();
    const loadVehicles = async () => {
      try {
        const response = await fetch(getApiUrl('/api/admin/fleet_vehicles.php/vehicles?includeInactive=true'));
        const body = await response.json() as { vehicles?: Array<{ vehicleNumber?: string; vehicle_number?: string }> };
        const numbers = (body.vehicles ?? [])
          .map((vehicle) => String(vehicle.vehicleNumber || vehicle.vehicle_number || '').trim())
          .filter((number) => number !== '');
        const unique = Array.from(new Set(numbers)).sort((a, b) => a.localeCompare(b));
        setVehicles(unique.map((number) => ({ number })));
      } catch {
        setVehicles([]);
      }
    };
    void loadVehicles();
  }, []);

  useEffect(() => {
    load();
  }, [tripPage, fuelPage, status, fromDate, toDate, driverId, vehicleNumber, paymentType, appliedSearch]);

  useEffect(() => {
    if (panel !== 'live') return;
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
          }),
          driverDashboardAPI.getDashboard({
            status: 'assigned',
            fromDate: day,
            toDate: day,
            tripLimit: 100,
            tripOffset: 0,
            fuelLimit: 1,
            fuelOffset: 0,
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
    const timer = window.setInterval(() => {
      void pull();
    }, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [panel]);

  const vehicleOptions = useMemo(() => {
    const numbers = new Set(vehicles.map((vehicle) => vehicle.number));
    data.trips.items.forEach((trip) => {
      const number = (trip.vehicleNumber || '').trim();
      if (number && number !== '—') numbers.add(number);
    });
    return Array.from(numbers).sort((a, b) => a.localeCompare(b));
  }, [vehicles, data.trips.items]);

  const driverOptions = useMemo(() => {
    const fromApi = drivers.map((driver) => ({ id: driver.id, name: driver.name }));
    const fromTrips = data.trips.items
      .map((trip) => ({
        id: Number(trip.driverId),
        name: (trip.driverName || `Driver #${trip.driverId}`).trim(),
      }))
      .filter((driver) => Number.isFinite(driver.id) && driver.id > 0);
    const merged = [...fromApi, ...fromTrips];
    const dedup = new Map<number, string>();
    merged.forEach((driver) => {
      if (!dedup.has(driver.id)) {
        dedup.set(driver.id, driver.name);
      }
    });
    return Array.from(dedup.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drivers, data.trips.items]);

  const handleResetFilters = () => {
    const day = todayIso();
    setSearch('');
    setAppliedSearch('');
    setFromDate(day);
    setToDate(day);
    setDriverId('');
    setVehicleNumber('');
    setStatus('assigned');
    setPaymentType('all');
    setTripPage(0);
    setFuelPage(0);
    setPanel('trips');
  };

  const chartData = useMemo(() => {
    const earningsMap = new Map<string, { date: string; earnings: number; fuel: number }>();
    data.trips.items.forEach((trip) => {
      const key = trip.startTime ? new Date(trip.startTime).toISOString().slice(0, 10) : 'unknown';
      const current = earningsMap.get(key) ?? { date: key, earnings: 0, fuel: 0 };
      current.earnings += tripTotalAmount(trip);
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

  const tripPages = Math.max(1, Math.ceil(data.trips.total / pageSize));
  const fuelPages = Math.max(1, Math.ceil(data.fuelRecords.total / pageSize));

  const handleToggleAlerts = async () => {
    if (muteBusy) return;
    const next = !alertsMuted;
    setMuteBusy(true);
    setMuteError(null);
    try {
      await authAPI.setPushMuted(next);
      setAlertsMuted(next);
    } catch {
      setMuteError('Could not save that setting. Upload the mute API and try again.');
    } finally {
      setMuteBusy(false);
    }
  };

  return (
    <AdminLayout activeTab="drivers">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Driver Dashboard</h1>
            <p className="text-xs text-muted-foreground">Trips for {dateRangeLabel()}.</p>
          </div>
          <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-2">{loading ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={muteBusy}
            onClick={() => {
              void handleToggleAlerts();
            }}
          >
            {alertsMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">{alertsMuted ? 'Alerts muted' : 'Mute alerts'}</span>
          </Button>
          </div>
        </div>
        {muteError ? <p className="text-xs text-red-600">{muteError}</p> : null}

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-6">
          <Metric title="Completed" value={data.summary.totalTripsCompleted} />
          <Metric title="Km" value={toSafeNumber(data.summary.totalKilometers).toFixed(0)} />
          <Metric title="Hours" value={toSafeNumber(data.summary.totalHours).toFixed(1)} />
          <Metric title="Fuel" value={`₹${toSafeNumber(data.summary.totalFuelSpend).toFixed(0)}`} />
          <Metric title="Net" value={`₹${toSafeNumber(data.summary.netEarnings).toFixed(0)}`} />
          <Metric title="Profit" value={`₹${toSafeNumber(data.summary.profitEstimation).toFixed(0)}`} />
        </div>

        {loadError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-red-700">
              <span>Unable to load live dashboard data: {loadError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void load();
                }}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        <DateStrip
          fromDate={fromDate}
          toDate={toDate}
          onSelectDay={(iso) => {
            setFromDate(iso);
            setToDate(iso);
            setTripPage(0);
            setPanel('trips');
          }}
          onSelectAll={() => {
            setFromDate('');
            setToDate('');
            setTripPage(0);
          }}
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Input
            className="h-9 w-44 shrink-0"
            placeholder="Trip / driver"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setAppliedSearch(search);
                setTripPage(0);
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => {
              setAppliedSearch(search);
              setTripPage(0);
            }}
          >
            Search
          </Button>
          <div className="w-40 shrink-0">
            <SearchableFilter
              allLabel="All Drivers"
              selectedLabel={driverOptions.find((driver) => String(driver.id) === driverId)?.name || 'All Drivers'}
              options={driverOptions.map((driver) => ({ value: String(driver.id), label: driver.name }))}
              onSelect={(value) => {
                setDriverId(value);
                setTripPage(0);
              }}
            />
          </div>
          <div className="w-40 shrink-0">
            <SearchableFilter
              allLabel="All Vehicles"
              selectedLabel={vehicleNumber || 'All Vehicles'}
              options={vehicleOptions.map((number) => ({ value: number, label: number }))}
              onSelect={(value) => {
                setVehicleNumber(value);
                setTripPage(0);
              }}
            />
          </div>
          <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2">
            <span className="text-xs text-muted-foreground">From</span>
            <Input
              type="date"
              className="h-7 w-[128px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setTripPage(0);
              }}
            />
          </div>
          <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2">
            <span className="text-xs text-muted-foreground">To</span>
            <Input
              type="date"
              className="h-7 w-[128px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setTripPage(0);
              }}
            />
          </div>
          <div className="w-40 shrink-0">
            <SearchableFilter
              allLabel="All Payments"
              selectedLabel={
                paymentType === 'all'
                  ? 'All Payments'
                  : paymentType === 'company_paid'
                    ? 'Company Paid'
                    : paymentType === 'company_phonepe'
                      ? 'Company PhonePe'
                      : paymentType === 'self_paid'
                        ? 'Self Paid'
                        : paymentType === 'corporate_booking'
                          ? 'Corporate'
                          : 'Agent'
              }
              options={[
                { value: 'company_paid', label: 'Company Paid' },
                { value: 'company_phonepe', label: 'Company PhonePe' },
                { value: 'self_paid', label: 'Self Paid' },
                { value: 'corporate_booking', label: 'Corporate' },
                { value: 'agent_booking', label: 'Agent' },
              ]}
              onSelect={(value) => {
                setPaymentType((value || 'all') as 'all' | PaymentType);
                setTripPage(0);
              }}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={handleResetFilters}>
            Reset
          </Button>
        </div>

        <Tabs value={panel} onValueChange={setPanel}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="live">Live GPS</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="dashboard">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-3">
            <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="order-2 max-h-[420px] space-y-2 overflow-y-auto lg:order-1">
                {liveLoading && liveTrips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading live trips…</p>
                ) : null}
                {!liveLoading && liveTrips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assigned or in-progress trips to track right now.</p>
                ) : null}
                {liveTrips.map((trip) => {
                  const sharing = trip.liveLat != null && trip.liveLng != null;
                  const selected = selectedLiveId === trip.tripId;
                  return (
                    <button
                      key={trip.tripId}
                      type="button"
                      onClick={() => setSelectedLiveId(trip.tripId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${selected ? 'border-primary bg-primary/5' : 'bg-card'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{trip.driverName || `Driver #${trip.driverId}`}</span>
                        <span className={`shrink-0 text-[10px] font-semibold ${sharing ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {sharing ? formatTrackedAgo(trip.liveTrackedAt) : 'No GPS yet'}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {trip.vehicleNumber || 'No vehicle'} · {trip.tripCode} · {opsStatusLabel(trip.opsStatus)}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {compactLocation(trip.pickupLocation)} → {compactLocation(trip.dropLocation)}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="order-1 h-[320px] overflow-hidden rounded-lg border bg-muted lg:order-2 lg:h-[480px]">
                <DriverLiveMap trips={liveTrips} selectedId={selectedLiveId} onSelect={setSelectedLiveId} />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Locations refresh every 20 seconds while this screen is open.</p>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Daily Earnings</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ earnings: { label: 'Earnings', color: '#2563eb' } }} className="h-[260px]">
                    <LineChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line dataKey="earnings" stroke="var(--color-earnings)" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Fuel Usage</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ fuel: { label: 'Fuel', color: '#f59e0b' } }} className="h-[260px]">
                    <BarChart data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="fuel" fill="var(--color-fuel)" radius={6} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trips">
            <div className="mb-2 flex gap-1 overflow-x-auto rounded-md bg-muted p-1">
              {OPS_STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`whitespace-nowrap rounded-sm px-2.5 py-1 text-xs font-medium ${
                    status === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setStatus(tab.id);
                    setTripPage(0);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle>Trips ({data.trips.total}) · {dateRangeLabel()}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                    onClick={() => void handleExportTripsCsv()}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exporting === 'trips' ? 'Exporting…' : 'CSV'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exporting !== null}
                    onClick={() => void handleExportTripsPdf()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {exporting === 'trips-pdf' ? 'Exporting…' : 'PDF'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-auto">
                <div className="space-y-2 md:hidden">
                  {data.trips.items.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No trips for this filter.</p>
                  ) : null}
                  {data.trips.items.map((trip) => (
                    <div key={trip.tripId} className="rounded-lg border p-3">
                      <button type="button" className="w-full text-left" onClick={() => setOfficeTrip(trip)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{trip.tripCode}</div>
                            <div className="text-xs text-muted-foreground">{formatJourneyWhen(trip.startedAt || trip.startTime)}{trip.startingOdometer > 0 ? ` · ${formatOdo(trip.startingOdometer)} km` : ''}</div>
                          </div>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${opsStatusColor(trip.opsStatus)}`}>
                            {opsStatusLabel(trip.opsStatus)}
                          </span>
                        </div>
                        <div className="mt-2 truncate text-sm">{trip.driverName || `Driver #${trip.driverId}`} · {trip.vehicleNumber || '—'}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {compactLocation(trip.pickupLocation)} → {compactLocation(trip.dropLocation)}
                        </div>
                        {toSafeNumber(trip.fuelSpend) > 0 ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Fuel ₹{toSafeNumber(trip.fuelSpend).toFixed(0)}
                            {fuelTimingPhrase(trip.fuelTiming) ? ` · ${fuelTimingPhrase(trip.fuelTiming)}` : ''}
                          </div>
                        ) : null}
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {trip.driverCollectsPayment === false ? 'Do not collect' : `₹${tripTotalAmount(trip).toFixed(0)}`}
                          {trip.liveLat != null ? ' · GPS on' : ''}
                        </span>
                        <TripActions
                          trip={trip}
                          onEdit={(next) => {
                            setEditTrip(next);
                            setEditTripOpen(true);
                          }}
                          onSendLink={(trip) => setLinkTrip(vendorLinkTarget(trip))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <table className="hidden w-full text-xs md:table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Trip ID</th>
                      <th className="text-left py-2">Journey Date</th>
                      <th className="text-left py-2">Driver Name</th>
                      <th className="text-left py-2">Vehicle No</th>
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">To</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Start ODO</th>
                      <th className="text-left py-2">End ODO</th>
                      <th className="text-left py-2">No. of Hours</th>
                      <th className="text-left py-2">No. of Kilometers</th>
                      <th className="text-left py-2">Fuel</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Advance</th>
                      <th className="text-left py-2">Collected</th>
                      <th className="text-left py-2">Extra</th>
                      <th className="text-left py-2">Payment</th>
                      <th className="text-right py-2 w-[52px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips.items.map((trip) => (
                      <tr key={trip.tripId} className="border-b">
                        <td className="py-2">
                          <button type="button" className="font-medium text-primary hover:underline" onClick={() => setOfficeTrip(trip)}>
                            {trip.tripCode}
                          </button>
                        </td>
                        <td>
                          <div>{formatJourneyDate(trip.startedAt || trip.startTime)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatStartClock(trip.startedAt || trip.startTime)}</div>
                        </td>
                        <td>{trip.driverName || `Driver #${trip.driverId}`}</td>
                        <td>{trip.vehicleNumber || '—'}</td>
                        <td>{compactLocation(trip.pickupLocation)}</td>
                        <td>{compactLocation(trip.dropLocation)}</td>
                        <td><span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${opsStatusColor(trip.opsStatus)}`}>{opsStatusLabel(trip.opsStatus)}</span></td>
                        <td>{formatOdo(trip.startingOdometer)}</td>
                        <td>{formatOdo(trip.endingOdometer)}</td>
                        <td>{toSafeNumber(trip.totalDurationHours) > 0 ? toSafeNumber(trip.totalDurationHours).toFixed(1) : '—'}</td>
                        <td>{toSafeNumber(trip.endingOdometer) > 0 ? toSafeNumber(trip.totalKilometers).toFixed(1) : '—'}</td>
                        <td>
                          {toSafeNumber(trip.fuelLitres) > 0 ? `${toSafeNumber(trip.fuelLitres).toFixed(2)} L · ` : ''}
                          ₹{toSafeNumber(trip.fuelSpend).toFixed(0)}
                          {toSafeNumber(trip.fuelSpend) > 0 && fuelTimingPhrase(trip.fuelTiming) ? (
                            <div className="text-[10px] text-gray-500">{fuelTimingPhrase(trip.fuelTiming)}</div>
                          ) : null}
                        </td>
                        <td>{trip.driverCollectsPayment === false ? 'Do not collect' : `₹${tripTotalAmount(trip).toFixed(0)}`}</td>
                        <td>{toSafeNumber(trip.advancePaidAmount) > 0 ? `₹${toSafeNumber(trip.advancePaidAmount).toFixed(0)}` : '—'}</td>
                        <td>
                          {trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
                            ? `₹${toSafeNumber(trip.driverCollectedAmount).toFixed(0)}`
                            : '—'}
                        </td>
                        <td>
                          {toSafeNumber(trip.extraCollectedAmount) > 0
                            ? `₹${toSafeNumber(trip.extraCollectedAmount).toFixed(0)}${extraCategoryLabel(trip.extraCollectedCategory) ? ` · ${extraCategoryLabel(trip.extraCollectedCategory)}` : ''}`
                            : '—'}
                        </td>
                        <td>{formatTripPaymentLabel(trip.paymentType)}</td>
                        <td className="text-right py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Trip actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {trip.liveLat != null && trip.liveLng != null ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    window.open(
                                      `https://www.google.com/maps/search/?api=1&query=${trip.liveLat},${trip.liveLng}`,
                                      '_blank',
                                      'noopener,noreferrer',
                                    );
                                  }}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Live location
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={() => {
                                  void driverDashboardAPI.downloadDutySlip(trip.tripId, trip.tripCode).catch((err: unknown) => {
                                    const message = err instanceof Error ? err.message : 'The duty slip could not be created.';
                                    window.alert(message);
                                  });
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Duty slip
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTrip(trip);
                                  setEditTripOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit trip
                              </DropdownMenuItem>
                              {trip.opsStatus !== 'completed' && trip.opsStatus !== 'cancelled' ? (
                                <DropdownMenuItem onClick={() => setLinkTrip(vendorLinkTarget(trip))}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Send trip link
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pager page={tripPage} totalPages={tripPages} onPrev={() => setTripPage((p) => Math.max(0, p - 1))} onNext={() => setTripPage((p) => Math.min(tripPages - 1, p + 1))} />
              </CardContent>
            </Card>
            <DriverOfficeTripSheet
              trip={officeTrip}
              open={officeTrip != null}
              onOpenChange={(next) => {
                if (!next) setOfficeTrip(null);
              }}
              onChanged={() => {
                void load();
              }}
            />
            <VendorTripLinkDialog
              trip={linkTrip}
              open={linkTrip != null}
              onOpenChange={(open) => {
                if (!open) setLinkTrip(null);
              }}
              onSent={() => {
                void load();
              }}
            />
            <DriverDashboardTripEditSheet
              trip={editTrip}
              open={editTripOpen}
              onOpenChange={(o) => {
                setEditTripOpen(o);
                if (!o) setEditTrip(null);
              }}
              onSaved={() => {
                void load();
              }}
            />
          </TabsContent>

          <TabsContent value="fuel">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle>Fuel Records ({data.fuelRecords.total})</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => void handleExportFuelCsv()}
                >
                  {exporting === 'fuel' ? 'Exporting…' : 'Download CSV'}
                </Button>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date & Time</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Litres</th>
                      <th className="text-left py-2">Vehicle No</th>
                      <th className="text-left py-2">Linked Trip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fuelRecords.items.map((fuel) => (
                      <tr key={fuel.id} className="border-b">
                        <td className="py-2">{fuel.dateTime ? new Date(fuel.dateTime).toLocaleString() : '—'}</td>
                        <td>₹{toSafeNumber(fuel.fuelAmount).toFixed(0)}</td>
                        <td>{toSafeNumber(fuel.fuelQuantityLitres).toFixed(2)}</td>
                        <td>{fuel.vehicleNumber?.trim() ? fuel.vehicleNumber : '—'}</td>
                        <td>
                          {fuel.linkedTripId ?? 'None'}
                          {fillTimingPhrase(fuel.loggedAfterTripEnd) ? (
                            <div className="text-[10px] text-gray-500">{fillTimingPhrase(fuel.loggedAfterTripEnd)}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pager page={fuelPage} totalPages={fuelPages} onPrev={() => setFuelPage((p) => Math.max(0, p - 1))} onNext={() => setFuelPage((p) => Math.min(fuelPages - 1, p + 1))} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader><CardTitle>Earnings Breakdown</CardTitle></CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Metric title="Company" value={`₹${toSafeNumber(data.summary.earningsBreakdown.company_paid).toFixed(0)}`} />
                <Metric title="Self" value={`₹${toSafeNumber(data.summary.earningsBreakdown.self_paid).toFixed(0)}`} />
                <Metric title="Corporate" value={`₹${toSafeNumber(data.summary.earningsBreakdown.corporate_booking).toFixed(0)}`} />
                <Metric title="Agent" value={`₹${toSafeNumber(data.summary.earningsBreakdown.agent_booking).toFixed(0)}`} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && <p className="text-sm text-muted-foreground">Loading dashboard...</p>}
      </div>
    </AdminLayout>
  );
}

function TripActions({
  trip,
  onEdit,
  onSendLink,
}: {
  trip: DriverDashboardTrip;
  onEdit: (trip: DriverDashboardTrip) => void;
  onSendLink: (trip: DriverDashboardTrip) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Trip actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {trip.liveLat != null && trip.liveLng != null ? (
          <DropdownMenuItem
            onClick={() => {
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${trip.liveLat},${trip.liveLng}`,
                '_blank',
                'noopener,noreferrer',
              );
            }}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Live location
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => {
            void driverDashboardAPI.downloadDutySlip(trip.tripId, trip.tripCode).catch((err: unknown) => {
              const message = err instanceof Error ? err.message : 'The duty slip could not be created.';
              window.alert(message);
            });
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Duty slip
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(trip)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit trip
        </DropdownMenuItem>
        {trip.opsStatus !== 'completed' && trip.opsStatus !== 'cancelled' ? (
          <DropdownMenuItem onClick={() => onSendLink(trip)}>
            <Send className="mr-2 h-4 w-4" />
            Send trip link
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-card px-2 py-1.5">
      <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Pager({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-3">
      <Button variant="outline" size="sm" onClick={onPrev} disabled={page <= 0}>Prev</Button>
      <span className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</span>
      <Button variant="outline" size="sm" onClick={onNext} disabled={page + 1 >= totalPages}>Next</Button>
    </div>
  );
}

function escapeCsvCell(value: string): string {
  const s = value ?? '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsvFile(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const line = (cells: string[]) => cells.map(escapeCsvCell).join(',');
  const body = [line(headers), ...rows.map(line)].join('\r\n');
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}