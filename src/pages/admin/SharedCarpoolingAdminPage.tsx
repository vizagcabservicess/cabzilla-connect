import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Plus, RefreshCw, Check, X, Eye, Trash2, Database, Users, Car, ClipboardList, ShieldCheck, RotateCcw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  sharedCarpoolAdminAPI,
  type DashboardData,
  type CommuteRequest,
  type Verification,
  type CarpoolUser,
  type CarpoolRide,
  type SeatBooking,
} from '@/services/api/sharedCarpoolAPI';
import { AdminMediaImage, AdminMediaViewLink } from '@/components/admin/AdminMediaImage';
import { COMMUTE_SCHEDULE_OPTIONS, type CommuteSchedule } from '@/components/shared-carpooling/constants';
import {
  commuteScheduleLabel,
  isScheduleAmenity,
  normalizeScheduleId,
  resolveRideSchedule,
} from '@/components/shared-carpooling/scheduleUtils';

const BRAND_GREEN = '#008744';
const PIE_COLORS = ['#008744', '#f59e0b', '#ef4444', '#6b7280'];

function isTruthyEmailVerified(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function formatDob(dob?: string | null): string {
  if (!dob) return '—';
  try {
    return new Date(`${dob}T12:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dob;
  }
}

function formatSubmittedAt(createdAt?: string | null): string {
  if (!createdAt) return '—';
  try {
    return new Date(createdAt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return createdAt;
  }
}

function formatRideDateTime(
  travelDate?: string | null,
  pickupTime?: string | null,
  createdAt?: string | null,
): string {
  const time = pickupTime?.trim();
  let dateLabel = travelDate?.trim();
  if (!dateLabel && createdAt) {
    try {
      dateLabel = new Date(createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      dateLabel = '';
    }
  }
  if (dateLabel && time) return `${dateLabel}, ${time}`;
  if (time) return time;
  if (dateLabel) return dateLabel;
  if (createdAt) return formatSubmittedAt(createdAt);
  return '—';
}

function formatSharedRidePickup(
  ride: Pick<CarpoolRide, 'pickup_time' | 'schedule_text' | 'amenities'>,
): string {
  const schedule = commuteScheduleLabel(
    normalizeScheduleId(resolveRideSchedule(ride.schedule_text, ride.amenities)),
  );
  const time = ride.pickup_time?.trim();
  if (schedule && time) return `${schedule}, ${time}`;
  return time ?? '—';
}

function formatBudgetPerSeat(budget?: number | string | null): string {
  if (budget === null || budget === undefined || budget === '') return '—';
  const amount = Number(budget);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function prepareRideForm(ride: Partial<CarpoolRide>): Partial<CarpoolRide> {
  const scheduleId = resolveRideSchedule(ride.schedule_text, ride.amenities);
  return {
    ...ride,
    schedule_text: scheduleId,
  };
}

function isProfileVerification(v: Verification): boolean {
  return !v.request_id;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    verified: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    matched: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800',
    active: 'bg-green-100 text-green-800',
  };
  return (
    <Badge variant="outline" className={map[status] ?? 'bg-gray-100'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function SharedCarpoolingAdminPage() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<CommuteRequest[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [users, setUsers] = useState<CarpoolUser[]>([]);
  const [userSummary, setUserSummary] = useState<Record<string, number>>({});
  const [rides, setRides] = useState<CarpoolRide[]>([]);
  const [bookings, setBookings] = useState<SeatBooking[]>([]);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [deletedRides, setDeletedRides] = useState<CarpoolRide[]>([]);
  const [deletedVerifications, setDeletedVerifications] = useState<Verification[]>([]);
  const [deletedRequests, setDeletedRequests] = useState<CommuteRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rideDialogOpen, setRideDialogOpen] = useState(false);
  const [rideForm, setRideForm] = useState<Partial<CarpoolRide>>({});
  const [passengersRide, setPassengersRide] = useState<CarpoolRide | null>(null);
  const [ridePassengers, setRidePassengers] = useState<SeatBooking[]>([]);
  const [loadingPassengers, setLoadingPassengers] = useState(false);

  const openRidePassengers = async (ride: CarpoolRide) => {
    setPassengersRide(ride);
    setLoadingPassengers(true);
    try {
      const list = await sharedCarpoolAdminAPI.getBookings('all', ride.id);
      setRidePassengers(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load passengers');
      setRidePassengers([]);
    } finally {
      setLoadingPassengers(false);
    }
  };

  const loadDashboard = useCallback(async () => {
    const data = await sharedCarpoolAdminAPI.getDashboard();
    setDashboard(data);
  }, []);

  const loadRequests = useCallback(async () => {
    setRequests(await sharedCarpoolAdminAPI.getRequests(requestFilter, search));
  }, [requestFilter, search]);

  const loadVerifications = useCallback(async () => {
    setVerifications(await sharedCarpoolAdminAPI.getVerifications(verificationFilter));
  }, [verificationFilter]);

  const loadUsers = useCallback(async () => {
    const { users: u, summary } = await sharedCarpoolAdminAPI.getUsers();
    setUsers(u);
    setUserSummary(summary);
  }, []);

  const loadRides = useCallback(async () => {
    setRides(await sharedCarpoolAdminAPI.getRides());
  }, []);

  const loadBookings = useCallback(async () => {
    setBookings(await sharedCarpoolAdminAPI.getBookings(bookingFilter));
  }, [bookingFilter]);

  const loadDeletedItems = useCallback(async () => {
    try {
      const [rides, verifications, requests] = await Promise.all([
        sharedCarpoolAdminAPI.getDeletedRides(),
        sharedCarpoolAdminAPI.getDeletedVerifications(),
        sharedCarpoolAdminAPI.getDeletedRequests(),
      ]);
      setDeletedRides(rides);
      setDeletedVerifications(verifications);
      setDeletedRequests(requests);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load deleted items — deploy latest admin.php');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), loadRequests(), loadVerifications(), loadUsers(), loadRides(), loadBookings()]);
      await loadDeletedItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadRequests, loadVerifications, loadUsers, loadRides, loadBookings, loadDeletedItems]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const handleSeed = async () => {
    try {
      await sharedCarpoolAdminAPI.seedDemoData();
      toast.success('Demo data seeded');
      refreshAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Seed failed');
    }
  };

  const pieData = dashboard
    ? Object.entries(dashboard.status_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  const saveRide = async () => {
    try {
      const scheduleId = normalizeScheduleId(rideForm.schedule_text);
      const amenities = (rideForm.amenities ?? []).filter((a) => !isScheduleAmenity(a));
      const payload: Partial<CarpoolRide> = {
        ...rideForm,
        schedule_text: scheduleId,
        amenities,
      };

      if (rideForm.id) {
        await sharedCarpoolAdminAPI.updateRide(rideForm.id, payload);
        toast.success('Ride updated');
      } else {
        await sharedCarpoolAdminAPI.createRide(payload);
        toast.success('Ride created');
      }
      setRideDialogOpen(false);
      setRideForm({});
      loadRides();
      loadDashboard();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <AdminLayout activeTab="shared-carpooling">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Car Pooling</h1>
            <p className="text-sm text-muted-foreground">Manage shared commute rides, requests & verifications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleSeed}>
              <Database className="mr-1 h-4 w-4" />
              Seed Demo
            </Button>
            <Button size="sm" style={{ backgroundColor: BRAND_GREEN }} className="text-white" onClick={() => { setRideForm({ period: 'morning', seats_total: 4, seats_left: 4, status: 'active', schedule_text: 'daily' }); setRideDialogOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" />
              Add Ride
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => {
          setTab(value);
          if (value === 'deleted-rides') void loadDeletedItems();
          if (value === 'seat-requests') void loadBookings();
        }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Commute Requests</TabsTrigger>
            <TabsTrigger value="seat-requests">Seat Requests</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rides">Shared Rides</TabsTrigger>
            <TabsTrigger value="deleted-rides">Deleted Rides</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {loading && !dashboard ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : dashboard && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    { label: 'Total Ride Requests', value: dashboard.stats.total_requests, icon: ClipboardList },
                    { label: 'Verified Users', value: dashboard.stats.verified_users, icon: Users },
                    { label: 'Active Rides', value: dashboard.stats.active_rides, icon: Car },
                    { label: 'Completed Bookings', value: dashboard.stats.completed_bookings, icon: Check },
                    { label: 'Pending Verifications', value: dashboard.stats.pending_verifications, icon: ShieldCheck },
                  ].map(({ label, value, icon: Icon }) => (
                    <Card key={label}>
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="mt-2 text-2xl font-bold">{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Ride Requests (7 days)</CardTitle></CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboard.week_chart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" fontSize={12} />
                          <YAxis allowDecimals={false} fontSize={12} />
                          <Tooltip />
                          <Line type="monotone" dataKey="count" stroke={BRAND_GREEN} strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Requests by Status</CardTitle></CardHeader>
                    <CardContent className="h-64 flex items-center justify-center">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <p className="text-sm text-muted-foreground">No data yet</p>}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-base">Recent Ride Requests</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Cost/Seat</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboard.recent_requests.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>#{r.id}</TableCell>
                              <TableCell>{r.full_name}</TableCell>
                              <TableCell className="max-w-[180px] truncate">{r.pickup} → {r.drop_location}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(r.created_at)}</TableCell>
                              <TableCell>{formatBudgetPerSeat(r.budget)}</TableCell>
                              <TableCell><StatusBadge status={r.status} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Top Routes</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {dashboard.top_routes.map((r) => (
                          <div key={r.route} className="flex justify-between text-sm">
                            <span className="truncate mr-2">{r.route}</span>
                            <span className="font-semibold shrink-0">{r.count}</span>
                          </div>
                        ))}
                        {dashboard.top_routes.length === 0 && <p className="text-sm text-muted-foreground">No routes yet</p>}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Verification Summary</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {Object.entries(dashboard.verification_summary).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize text-muted-foreground">{k.replace(/_/g, ' ')}</span>
                            <span className="font-semibold">{v}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => setTab('verifications')}>View Pending Verifications</Button>
                        <Button variant="outline" className="w-full justify-start" size="sm" onClick={() => { setRideForm({ period: 'morning', seats_total: 4, seats_left: 4, status: 'active', schedule_text: 'daily' }); setRideDialogOpen(true); }}>Add New Ride</Button>
                        <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                          <Link to="/shared-carpooling" target="_blank">View Public Page</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Ride Requests */}
          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Ride Requests</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
                  <Select value={requestFilter} onValueChange={setRequestFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['all','pending','verified','matched','rejected','cancelled'].map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={loadRequests}>Apply</Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead><TableHead>Submitted</TableHead><TableHead>Cost/Seat</TableHead>
                      <TableHead>Seats</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>#{r.id}</TableCell>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pickup} → {r.drop_location}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(r.created_at)}</TableCell>
                        <TableCell>{formatBudgetPerSeat(r.budget)}</TableCell>
                        <TableCell>{r.seats}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(['verified','matched','rejected'] as const).map((s) => (
                              <Button key={s} size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={async () => {
                                await sharedCarpoolAdminAPI.updateRequestStatus(r.id, s);
                                toast.success(`Marked ${s}`);
                                loadRequests(); loadDashboard();
                              }}>{s}</Button>
                            ))}
                            <Button size="sm" variant="ghost" className="text-red-600" title="Delete request" onClick={async () => {
                              if (!confirm('Delete this ride request? It will be removed from the list.')) return;
                              await sharedCarpoolAdminAPI.deleteRequest(r.id);
                              toast.success('Request deleted');
                              loadRequests(); loadVerifications(); loadDeletedItems(); loadDashboard();
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {requests.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No requests found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seat requests (bookings on a specific ride) */}
          <TabsContent value="seat-requests" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Seat Requests</CardTitle>
                <div className="flex gap-2">
                  <Select value={bookingFilter} onValueChange={setBookingFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['all', 'pending', 'confirmed', 'cancelled'].map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={loadBookings}>Apply</Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead><TableHead>Vehicle</TableHead><TableHead>Reg. No.</TableHead><TableHead>Driver</TableHead>
                      <TableHead>Ride Time</TableHead><TableHead>Submitted</TableHead><TableHead>Seats</TableHead>
                      <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>#{b.id}</TableCell>
                        <TableCell>{b.user_name}</TableCell>
                        <TableCell>{b.user_phone}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{b.pickup} → {b.drop_location}</TableCell>
                        <TableCell>{b.vehicle ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{b.vehicle_number ?? '—'}</TableCell>
                        <TableCell>{b.driver_name ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatRideDateTime(b.travel_date, b.pickup_time, b.created_at)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(b.created_at)}</TableCell>
                        <TableCell>{b.seats}</TableCell>
                        <TableCell>₹{b.amount}</TableCell>
                        <TableCell><StatusBadge status={b.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {b.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600" onClick={async () => {
                                  await sharedCarpoolAdminAPI.updateBookingStatus(b.id, 'confirmed');
                                  toast.success('Seat confirmed'); loadBookings(); loadRides(); loadDashboard();
                                }}><Check className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                                  await sharedCarpoolAdminAPI.updateBookingStatus(b.id, 'cancelled');
                                  toast.success('Request cancelled'); loadBookings(); loadDashboard();
                                }}><X className="h-4 w-4" /></Button>
                              </>
                            )}
                            {b.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 text-xs"
                                onClick={async () => {
                                  if (!confirm(`Cancel confirmed seat for ${b.user_name}?`)) return;
                                  await sharedCarpoolAdminAPI.updateBookingStatus(b.id, 'cancelled');
                                  toast.success('Booking cancelled — seat released');
                                  loadBookings();
                                  loadRides();
                                  loadDashboard();
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 px-2 text-xs text-red-600"
                              title="Delete seat request"
                              onClick={async () => {
                                if (!confirm(`Delete seat request #${b.id} for ${b.user_name}? This cannot be undone.`)) return;
                                await sharedCarpoolAdminAPI.deleteBooking(b.id);
                                toast.success('Seat request deleted');
                                loadBookings();
                                loadRides();
                                loadDashboard();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bookings.length === 0 && (
                      <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No seat requests yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verifications */}
          <TabsContent value="verifications" className="mt-4 space-y-4">
            <div className="flex gap-2">
              {['all','pending','approved','rejected'].map((s) => (
                <Button key={s} size="sm" variant={verificationFilter === s ? 'default' : 'outline'}
                  style={verificationFilter === s ? { backgroundColor: BRAND_GREEN } : undefined}
                  className={verificationFilter === s ? 'text-white' : ''}
                  onClick={() => { setVerificationFilter(s); sharedCarpoolAdminAPI.getVerifications(s).then(setVerifications); }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead><TableHead>DOB</TableHead><TableHead>ID Card</TableHead>
                      <TableHead>Type</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>#{v.id}</TableCell>
                        <TableCell>{v.full_name}</TableCell>
                        <TableCell>{v.phone}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <span className="block break-all text-sm" title={v.employee_email ?? ''}>
                            {v.employee_email ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>{formatDob(v.date_of_birth)}</TableCell>
                        <TableCell>
                          {v.id_card_url ? (
                            <AdminMediaViewLink url={v.id_card_url} />
                          ) : '—'}
                        </TableCell>
                        <TableCell>{isProfileVerification(v) ? 'Profile' : 'Commute'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(v.created_at)}</TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedVerification(v)}><Eye className="h-4 w-4" /></Button>
                            {v.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="text-green-600" onClick={async () => {
                                  await sharedCarpoolAdminAPI.updateVerification(v.id, 'approved');
                                  toast.success('Approved'); loadVerifications(); loadDashboard(); loadUsers();
                                }}><Check className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                                  await sharedCarpoolAdminAPI.updateVerification(v.id, 'rejected');
                                  toast.success('Rejected'); loadVerifications(); loadDashboard();
                                }}><X className="h-4 w-4" /></Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="text-red-600" title="Delete verification" onClick={async () => {
                              if (!confirm('Delete this verification record?')) return;
                              await sharedCarpoolAdminAPI.deleteVerification(v.id);
                              toast.success('Verification deleted');
                              loadVerifications(); loadDeletedItems(); loadDashboard();
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              {['total','verified','pending','blocked'].map((k) => (
                <Card key={k}>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground capitalize">{k} Users</p>
                    <p className="text-xl font-bold">{userSummary[k] ?? 0}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead>
                      <TableHead>Email OK</TableHead><TableHead>DOB</TableHead><TableHead>ID Card</TableHead><TableHead>Company</TableHead>
                      <TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.full_name}</TableCell>
                        <TableCell>{u.phone}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <span className="block break-all text-sm" title={u.profile_email ?? u.email ?? ''}>
                            {u.profile_email ?? u.email ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!u.profile_email && !u.email ? (
                            <span className="text-gray-400">—</span>
                          ) : isTruthyEmailVerified(u.email_verified) ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDob(u.profile_date_of_birth ?? u.date_of_birth)}</TableCell>
                        <TableCell>
                          {u.id_card_url ? (
                            <AdminMediaViewLink url={u.id_card_url} />
                          ) : '—'}
                        </TableCell>
                        <TableCell>{u.company ?? '—'}</TableCell>
                        <TableCell className="capitalize">{u.user_role}</TableCell>
                        <TableCell><StatusBadge status={u.status} /></TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(u.joined_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.status !== 'blocked' ? (
                              <Button size="sm" variant="ghost" className="text-red-600 text-xs" onClick={async () => {
                                await sharedCarpoolAdminAPI.updateUserStatus(u.id, 'blocked');
                                toast.success('User blocked'); loadUsers();
                              }}>Block</Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-green-600 text-xs" onClick={async () => {
                                await sharedCarpoolAdminAPI.updateUserStatus(u.id, 'verified');
                                toast.success('User unblocked'); loadUsers();
                              }}>Unblock</Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-red-600 text-xs" onClick={async () => {
                              if (!confirm(`Delete user ${u.full_name} (${u.phone})? This cannot be undone.`)) return;
                              try {
                                await sharedCarpoolAdminAPI.deleteUser(u.id);
                                toast.success('User deleted');
                                loadUsers();
                                loadDashboard();
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Delete failed');
                              }
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Rides CRUD */}
          <TabsContent value="rides" className="mt-4">
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead><TableHead>Route</TableHead><TableHead>Vehicle</TableHead>
                      <TableHead>Reg. No.</TableHead><TableHead>Driver</TableHead><TableHead>Seats</TableHead><TableHead>Price</TableHead>
                      <TableHead>Added</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rides.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatSharedRidePickup(r)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pickup} → {r.drop_location}</TableCell>
                        <TableCell>{r.vehicle}</TableCell>
                        <TableCell className="font-mono text-xs">{r.vehicle_number || '—'}</TableCell>
                        <TableCell>{r.driver_name}</TableCell>
                        <TableCell>{r.seats_left}/{r.seats_total}</TableCell>
                        <TableCell>₹{r.price_per_seat}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(r.created_at)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => void openRidePassengers(r)}>
                              <Users className="mr-1 h-3.5 w-3.5" />
                              Passengers
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setRideForm(prepareRideForm(r)); setRideDialogOpen(true); }}>Edit</Button>
                            <Button size="sm" variant="ghost" className="text-red-600" title="Move to Deleted Rides" onClick={async () => {
                              if (confirm('Move this ride to Deleted Rides?')) {
                                await sharedCarpoolAdminAPI.deleteRide(r.id);
                                toast.success('Ride moved to Deleted Rides');
                                loadRides(); loadDeletedItems(); loadDashboard();
                              }
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rides.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No rides — click Seed Demo or Add Ride</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deleted items */}
          <TabsContent value="deleted-rides" className="mt-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              Items removed from Verifications, Ride Requests, or Shared Rides appear here. Shared cab rides can be permanently deleted; verifications and requests can be restored.
            </p>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deleted Verifications ({deletedVerifications.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead><TableHead>Status</TableHead><TableHead>Deleted At</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedVerifications.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>#{v.id}</TableCell>
                        <TableCell>{v.full_name}</TableCell>
                        <TableCell>{v.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.pickup} → {v.drop_location}</TableCell>
                        <TableCell><StatusBadge status={v.status} /></TableCell>
                        <TableCell>{v.deleted_at ? formatSubmittedAt(v.deleted_at) : '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-green-600" title="Restore" onClick={async () => {
                            await sharedCarpoolAdminAPI.restoreVerification(v.id);
                            toast.success('Verification restored');
                            loadVerifications(); loadDeletedItems(); loadDashboard();
                          }}><RotateCcw className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deletedVerifications.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No deleted verifications</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deleted Ride Requests ({deletedRequests.length})</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead>
                      <TableHead>Route</TableHead><TableHead>Submitted</TableHead><TableHead>Cost/Seat</TableHead>
                      <TableHead>Status</TableHead><TableHead>Deleted At</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>#{r.id}</TableCell>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pickup} → {r.drop_location}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatSubmittedAt(r.created_at)}</TableCell>
                        <TableCell>{formatBudgetPerSeat(r.budget)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>{r.deleted_at ? formatSubmittedAt(r.deleted_at) : '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-green-600" title="Restore" onClick={async () => {
                            await sharedCarpoolAdminAPI.restoreRequest(r.id);
                            toast.success('Request restored');
                            loadRequests(); loadDeletedItems(); loadDashboard();
                          }}><RotateCcw className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deletedRequests.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No deleted ride requests</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deleted Shared Rides ({deletedRides.length})</CardTitle>
                <p className="text-sm text-muted-foreground">Delete from the Shared Rides tab using the trash icon.</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead><TableHead>Route</TableHead><TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead><TableHead>Deleted At</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedRides.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-sm">{formatSharedRidePickup(r)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.pickup} → {r.drop_location}</TableCell>
                        <TableCell>{r.vehicle}</TableCell>
                        <TableCell>{r.driver_name}</TableCell>
                        <TableCell>{r.deleted_at ? formatSubmittedAt(r.deleted_at) : '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="text-green-600" title="Restore ride" onClick={async () => {
                              await sharedCarpoolAdminAPI.restoreRide(r.id);
                              toast.success('Ride restored');
                              loadRides(); loadDeletedItems(); loadDashboard();
                            }}><RotateCcw className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600" title="Permanently delete" onClick={async () => {
                              if (!confirm('Permanently delete this ride? This cannot be undone.')) return;
                              await sharedCarpoolAdminAPI.deleteRide(r.id, true);
                              toast.success('Ride permanently deleted');
                              loadDeletedItems(); loadDashboard();
                            }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {deletedRides.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No deleted shared rides</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Verification detail dialog */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Verification Details</DialogTitle></DialogHeader>
          {selectedVerification && (
            <div className="space-y-3 text-sm">
              <p><strong>Name:</strong> {selectedVerification.full_name}</p>
              <p><strong>Phone:</strong> {selectedVerification.phone}</p>
              <p><strong>Company:</strong> {selectedVerification.company ?? '—'}</p>
              <p><strong>Date of Birth:</strong> {formatDob(selectedVerification.date_of_birth)}</p>
              <p><strong>Email ID:</strong> {selectedVerification.employee_email ?? '—'}</p>
              <div>
                <strong>Identity Card:</strong>{' '}
                {selectedVerification.id_card_url ? (
                  <AdminMediaViewLink url={selectedVerification.id_card_url} label="View uploaded ID" />
                ) : (
                  '—'
                )}
              </div>
              {selectedVerification.id_card_url && (
                <AdminMediaImage
                  url={selectedVerification.id_card_url}
                  alt="Identity card"
                  className="max-h-48 w-full rounded-lg border object-contain"
                />
              )}
              {isProfileVerification(selectedVerification) ? (
                <p><strong>Type:</strong> Profile verification (Employee / Student)</p>
              ) : (
                <>
                  <p><strong>Route:</strong> {selectedVerification.pickup ?? '—'} → {selectedVerification.drop_location ?? '—'}</p>
                  <p><strong>Pickup:</strong> {formatRideDateTime(null, selectedVerification.pickup_time, selectedVerification.created_at)}</p>
                </>
              )}
              <p><strong>Status:</strong> <StatusBadge status={selectedVerification.status} /></p>
              <p><strong>Submitted:</strong> {formatSubmittedAt(selectedVerification.created_at)}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {selectedVerification && (
              <Button variant="outline" className="text-red-600" onClick={async () => {
                if (!confirm('Delete this verification record?')) return;
                await sharedCarpoolAdminAPI.deleteVerification(selectedVerification.id);
                setSelectedVerification(null);
                loadVerifications();
                loadDeletedItems();
                loadDashboard();
                toast.success('Verification deleted');
              }}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
            )}
            <div className="flex gap-2">
            {selectedVerification?.status === 'pending' && (
              <>
                <Button variant="outline" className="text-red-600" onClick={async () => {
                  await sharedCarpoolAdminAPI.updateVerification(selectedVerification.id, 'rejected');
                  setSelectedVerification(null); loadVerifications();
                }}>Reject</Button>
                <Button style={{ backgroundColor: BRAND_GREEN }} className="text-white" onClick={async () => {
                  await sharedCarpoolAdminAPI.updateVerification(selectedVerification.id, 'approved');
                  setSelectedVerification(null); loadVerifications(); loadUsers();
                }}>Approve</Button>
              </>
            )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ride passengers / assignment dialog */}
      <Dialog open={!!passengersRide} onOpenChange={(open) => { if (!open) { setPassengersRide(null); setRidePassengers([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ride Assignment</DialogTitle>
          </DialogHeader>
          {passengersRide && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-lg border bg-gray-50 p-4 sm:grid-cols-2">
                <div><span className="font-semibold text-gray-700">Route:</span> {passengersRide.pickup} → {passengersRide.drop_location}</div>
                <div><span className="font-semibold text-gray-700">Time:</span> {formatSharedRidePickup(passengersRide)}</div>
                <div><span className="font-semibold text-gray-700">Added:</span> {formatSubmittedAt(passengersRide.created_at)}</div>
                <div><span className="font-semibold text-gray-700">Vehicle:</span> {passengersRide.vehicle || '—'}</div>
                <div><span className="font-semibold text-gray-700">Reg. no. (internal):</span> {passengersRide.vehicle_number || '—'}</div>
                <div><span className="font-semibold text-gray-700">Driver:</span> {passengersRide.driver_name || '—'}</div>
                <div><span className="font-semibold text-gray-700">Driver phone:</span> {passengersRide.driver_phone || '—'}</div>
                <div><span className="font-semibold text-gray-700">Seats:</span> {passengersRide.seats_total - passengersRide.seats_left}/{passengersRide.seats_total} booked</div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold text-gray-900">Passengers on this ride</h3>
                {loadingPassengers ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Seats</TableHead>
                        <TableHead>Amount</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ridePassengers.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.user_name}</TableCell>
                          <TableCell>{p.user_phone}</TableCell>
                          <TableCell>{p.seats}</TableCell>
                          <TableCell>₹{p.amount}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                        </TableRow>
                      ))}
                      {ridePassengers.filter((p) => p.status === 'confirmed').length === 0 && !loadingPassengers && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            No confirmed passengers yet — confirm seats in the Seat Requests tab
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {ridePassengers.some((p) => p.status === 'confirmed') && (
                <p className="text-xs text-gray-500">
                  Confirmed passengers: {ridePassengers.filter((p) => p.status === 'confirmed').map((p) => p.user_name).join(', ')}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ride form dialog */}
      <Dialog open={rideDialogOpen} onOpenChange={setRideDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{rideForm.id ? 'Edit Ride' : 'Add Ride'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['pickup', 'Pickup'], ['drop_location', 'Drop'], ['via_route', 'Via'],
              ['pickup_time', 'Time'], ['vehicle', 'Vehicle (model)'], ['driver_name', 'Driver'],
              ['driver_phone', 'Driver Phone'], ['price_per_seat', 'Price/seat', 'number'],
              ['seats_total', 'Total Seats', 'number'], ['seats_left', 'Seats Left', 'number'],
            ] as const).map(([key, label, type]) => (
              <div key={key} className={key === 'via_route' ? 'sm:col-span-2' : ''}>
                <Label>{label}</Label>
                <Input
                  type={type ?? 'text'}
                  value={String(rideForm[key as keyof CarpoolRide] ?? '')}
                  onChange={(e) => setRideForm({ ...rideForm, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label>Vehicle registration no. (internal only)</Label>
              <Input
                placeholder="e.g. AP39 AB 1234"
                value={rideForm.vehicle_number ?? ''}
                onChange={(e) => setRideForm({ ...rideForm, vehicle_number: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted-foreground">Not shown to passengers on the website.</p>
            </div>
            <div>
              <Label>Commute Schedule</Label>
              <Select
                value={normalizeScheduleId(rideForm.schedule_text)}
                onValueChange={(v) => setRideForm({ ...rideForm, schedule_text: v })}
              >
                <SelectTrigger><SelectValue placeholder="Daily" /></SelectTrigger>
                <SelectContent>
                  {COMMUTE_SCHEDULE_OPTIONS.map(({ id, label }) => (
                    <SelectItem key={id} value={id}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Est. Time</Label>
              <Input
                placeholder="e.g. 25 min"
                value={rideForm.est_duration ?? ''}
                onChange={(e) => setRideForm({ ...rideForm, est_duration: e.target.value })}
              />
            </div>
            <div>
              <Label>Period</Label>
              <Select value={rideForm.period ?? 'morning'} onValueChange={(v) => setRideForm({ ...rideForm, period: v as CarpoolRide['period'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['morning','afternoon','evening','night'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={rideForm.status ?? 'active'} onValueChange={(v) => setRideForm({ ...rideForm, status: v as CarpoolRide['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['active','full','cancelled'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRideDialogOpen(false)}>Cancel</Button>
            <Button style={{ backgroundColor: BRAND_GREEN }} className="text-white" onClick={saveRide}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
