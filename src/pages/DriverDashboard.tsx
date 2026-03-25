import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { driverDashboardAPI } from '@/services/api/driverDashboardAPI';
import type { DriverDashboardData, DriverDashboardTrip, PaymentType, TripStatus } from '@/types/driverDashboard';
import { DriverDashboardTripEditSheet } from '@/components/admin/DriverDashboardTripEditSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/providers/AuthProvider';
import { fleetAPI } from '@/services/api/fleetAPI';

const STATUS_COLORS: Record<TripStatus, string> = {
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
};

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

export default function DriverDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DriverDashboardData>(INITIAL_DATA);
  const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TripStatus>('all');
  const [paymentType, setPaymentType] = useState<'all' | PaymentType>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tripPage, setTripPage] = useState(0);
  const [fuelPage, setFuelPage] = useState(0);
  const [editTrip, setEditTrip] = useState<DriverDashboardTrip | null>(null);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [exporting, setExporting] = useState<null | 'trips' | 'fuel'>(null);

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
    search: search || undefined,
    status: status === 'all' ? undefined : status,
    paymentType: paymentType === 'all' ? undefined : paymentType,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    driverId: driverId ? Number(driverId) : undefined,
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

  const handleExportTripsCsv = async () => {
    setExporting('trips');
    try {
      const response = await driverDashboardAPI.getDashboard({
        ...dashboardFilterParams(),
        tripLimit: exportFetchLimit,
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
      downloadCsvFile(`driver-ops-trips-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'CSV export failed');
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
  }, []);

  useEffect(() => {
    load();
  }, [tripPage, fuelPage]);

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
    setSearch('');
    setFromDate('');
    setToDate('');
    setDriverId('');
    setStatus('all');
    setPaymentType('all');
    setTripPage(0);
    setFuelPage(0);
  };

  const handleResetFiltersAndLoad = async () => {
    handleResetFilters();
    setLoading(true);
    setLoadError(null);
    try {
      const response = await driverDashboardAPI.getDashboard({
        tripLimit: pageSize,
        tripOffset: 0,
        fuelLimit: pageSize,
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

  const tripPages = Math.max(1, Math.ceil(data.trips.total / pageSize));
  const fuelPages = Math.max(1, Math.ceil(data.fuelRecords.total / pageSize));

  return (
    <AdminLayout activeTab="drivers">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Driver Dashboard</h1>
        <p className="text-sm text-muted-foreground">Unified operations panel for trips, fuel and earnings.</p>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Metric title="Completed Trips" value={data.summary.totalTripsCompleted} />
          <Metric title="Kilometers" value={toSafeNumber(data.summary.totalKilometers).toFixed(1)} />
          <Metric title="Hours" value={toSafeNumber(data.summary.totalHours).toFixed(1)} />
          <Metric title="Fuel Spend" value={`₹${toSafeNumber(data.summary.totalFuelSpend).toFixed(0)}`} />
          <Metric title="Net Earnings" value={`₹${toSafeNumber(data.summary.netEarnings).toFixed(0)}`} />
          <Metric title="Profit Est." value={`₹${toSafeNumber(data.summary.profitEstimation).toFixed(0)}`} />
        </div>

        {loadError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 text-sm text-red-700">
              Unable to load live dashboard data: {loadError}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-6">
            <Input placeholder="Search Trip ID / Driver ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Select value={driverId || 'all'} onValueChange={(value) => setDriverId(value === 'all' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="Driver Name" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {driverOptions.map((driver) => (
                  <SelectItem key={driver.id} value={String(driver.id)}>{driver.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as 'all' | TripStatus)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentType} onValueChange={(v) => setPaymentType(v as 'all' | PaymentType)}>
              <SelectTrigger><SelectValue placeholder="Payment Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="company_paid">Company Paid</SelectItem>
                <SelectItem value="company_phonepe">Company PhonePe</SelectItem>
                <SelectItem value="self_paid">Self Paid</SelectItem>
                <SelectItem value="corporate_booking">Corporate</SelectItem>
                <SelectItem value="agent_booking">Agent</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:col-span-6 flex gap-2">
              <Button className="flex-1" onClick={() => { setTripPage(0); setFuelPage(0); load(); }}>Apply Filters</Button>
              <Button
                variant="outline"
                onClick={handleResetFiltersAndLoad}
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

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
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle>Trips ({data.trips.total})</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={exporting !== null}
                  onClick={() => void handleExportTripsCsv()}
                >
                  {exporting === 'trips' ? 'Exporting…' : 'Download CSV'}
                </Button>
              </CardHeader>
              <CardContent className="overflow-auto">
                <table className="w-full text-sm">
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
                      <th className="text-left py-2">Collected</th>
                      <th className="text-left py-2">Payment</th>
                      <th className="text-right py-2 w-[52px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trips.items.map((trip) => (
                      <tr key={trip.tripId} className="border-b">
                        <td className="py-2">{trip.tripCode}</td>
                        <td>{formatJourneyDate(trip.startTime)}</td>
                        <td>{trip.driverName || `Driver #${trip.driverId}`}</td>
                        <td>{trip.vehicleNumber || '—'}</td>
                        <td>{compactLocation(trip.pickupLocation)}</td>
                        <td>{compactLocation(trip.dropLocation)}</td>
                        <td><span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[trip.status]}`}>{trip.status.replace('_', ' ')}</span></td>
                        <td>{toSafeNumber(trip.startingOdometer).toFixed(1)}</td>
                        <td>{toSafeNumber(trip.endingOdometer).toFixed(1)}</td>
                        <td>{toSafeNumber(trip.totalDurationHours).toFixed(1)}</td>
                        <td>{toSafeNumber(trip.totalKilometers).toFixed(1)}</td>
                        <td>₹{toSafeNumber(trip.fuelSpend).toFixed(0)}</td>
                        <td>₹{toSafeNumber(trip.tripAmount).toFixed(0)}</td>
                        <td>
                          {trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
                            ? `₹${toSafeNumber(trip.driverCollectedAmount).toFixed(0)}`
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTrip(trip);
                                  setEditTripOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit trip
                              </DropdownMenuItem>
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
                        <td>{fuel.linkedTripId ?? 'None'}</td>
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

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
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