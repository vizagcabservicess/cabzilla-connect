import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { groupTourAPI, type GroupTour, type GroupTourBooking, type BoardingPoint } from '@/services/api/groupTourAPI';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Bus, Phone, Mail, LayoutGrid, Ban, MapPin, GripVertical, IndianRupee, RotateCcw } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);

export default function GroupToursManagementPage() {
  const [activeTab, setActiveTab] = useState<string>('tours');
  const [tours, setTours] = useState<GroupTour[]>([]);
  const [bookings, setBookings] = useState<GroupTourBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [seatsDialogOpen, setSeatsDialogOpen] = useState(false);
  const [seatsDialogTour, setSeatsDialogTour] = useState<GroupTour | null>(null);
  const [seatsDialogData, setSeatsDialogData] = useState<{ seats: { seat_id: string; status: string; booking_number?: string | null; customer_name?: string | null; is_female_only?: boolean; passenger_gender?: 'male' | 'female' | null; price?: number }[]; tour: { pickup_location: string; dropoff_location: string; travel_date: string; price_per_seat?: number } } | null>(null);
  const [editPriceSeat, setEditPriceSeat] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [bulkScope, setBulkScope] = useState<'all' | 'available' | 'selected'>('available');
  const [bulkType, setBulkType] = useState<'fixed' | 'percent'>('fixed');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkApplying, setBulkApplying] = useState(false);
  const [seatsDialogLoading, setSeatsDialogLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    pickup_location: '',
    dropoff_location: '',
    travel_date: '',
    expiry_date: '' as string,
    price_per_seat: 500,
    capacity: 17,
    status: 'active',
    featured_image_url: '',
    gallery_images: [] as string[],
    highlights: [] as string[],
    itinerary: [] as { day: string; title: string; description?: string }[],
    inclusions: [] as string[],
    exclusions: [] as string[],
    boarding_points: [] as BoardingPoint[],
  });

  const fetchTours = async () => {
    setLoading(true);
    try {
      const data = await groupTourAPI.adminListTours();
      setTours(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load tours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await groupTourAPI.adminListBookings();
      setBookings(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      pickup_location: '',
      dropoff_location: '',
      travel_date: today,
      expiry_date: '',
      price_per_seat: 500,
      capacity: 17,
      status: 'active',
      featured_image_url: '',
      gallery_images: [],
      highlights: [],
      itinerary: [],
      inclusions: [],
      exclusions: [],
      boarding_points: [],
    });
    setDialogOpen(true);
  };

  const openEdit = async (tour: GroupTour) => {
    const fullTour = await groupTourAPI.adminGetTour(tour.id);
    if (!fullTour) return;
    setEditingId(tour.id);
    setForm({
      title: (fullTour as any).title ?? '',
      pickup_location: fullTour.pickup_location,
      dropoff_location: fullTour.dropoff_location,
      travel_date: fullTour.travel_date,
      expiry_date: (fullTour as any).expiry_date ?? '',
      price_per_seat: fullTour.price_per_seat,
      capacity: fullTour.capacity,
      status: 'active',
      featured_image_url: fullTour.featured_image_url ?? '',
      gallery_images: Array.isArray((fullTour as any).gallery_images) ? (fullTour as any).gallery_images : [],
      highlights: Array.isArray((fullTour as any).highlights) ? (fullTour as any).highlights : [],
      itinerary: Array.isArray((fullTour as any).itinerary) ? (fullTour as any).itinerary : [],
      inclusions: Array.isArray((fullTour as any).inclusions) ? (fullTour as any).inclusions : [],
      exclusions: Array.isArray((fullTour as any).exclusions) ? (fullTour as any).exclusions : [],
      boarding_points: Array.isArray((fullTour as any).boarding_points) ? (fullTour as any).boarding_points.map((bp: any) => ({ name: bp.name || '', address: bp.address || '', boarding_time: bp.boarding_time || '07:00', sort_order: bp.sort_order ?? 0 })) : [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickup_location.trim() || !form.dropoff_location.trim() || !form.travel_date) {
      toast.error('Pickup, dropoff, and date are required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await groupTourAPI.adminUpdateTour(editingId, form);
        toast.success('Tour updated');
      } else {
        await groupTourAPI.adminCreateTour(form);
        toast.success('Tour created');
      }
      setDialogOpen(false);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openSeatsDialog = async (tour: GroupTour) => {
    setSeatsDialogTour(tour);
    setSeatsDialogOpen(true);
    setSeatsDialogData(null);
    setSeatsDialogLoading(true);
    try {
      const data = await groupTourAPI.adminGetSeatOccupancy(tour.id);
      setSeatsDialogData(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load seats');
    } finally {
      setSeatsDialogLoading(false);
    }
  };

  const handleBlockSeat = async (seatId: string) => {
    if (!seatsDialogTour) return;
    try {
      await groupTourAPI.adminBlockSeat(seatsDialogTour.id, seatId);
      toast.success('Seat blocked');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to block seat');
    }
  };

  const handleUnblockSeat = async (seatId: string) => {
    if (!seatsDialogTour) return;
    try {
      await groupTourAPI.adminUnblockSeat(seatsDialogTour.id, seatId);
      toast.success('Seat unblocked');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unblock seat');
    }
  };

  const handleUnreserveSeat = async (seatId: string) => {
    if (!seatsDialogTour) return;
    try {
      await groupTourAPI.adminUnreserveSeat(seatsDialogTour.id, seatId);
      toast.success('Seat unreserved');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to unreserve seat');
    }
  };

  const handleSetFemaleOnly = async (seatId: string) => {
    if (!seatsDialogTour) return;
    try {
      await groupTourAPI.adminSetFemaleOnly(seatsDialogTour.id, seatId);
      toast.success('Seat marked as female-only');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set female-only');
    }
  };

  const handleSetGeneral = async (seatId: string) => {
    if (!seatsDialogTour) return;
    try {
      await groupTourAPI.adminSetGeneral(seatsDialogTour.id, seatId);
      toast.success('Seat set as general');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set general');
    }
  };

  const handleSetSeatPrice = async (seatId: string, price: number) => {
    if (!seatsDialogTour || price <= 0) return;
    try {
      await groupTourAPI.adminSetSeatPrice(seatsDialogTour.id, seatId, price);
      toast.success(`Price set to ₹${price}`);
      setEditPriceSeat(null);
      setEditPriceValue('');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set price');
    }
  };

  const handleBulkAdjust = async () => {
    if (!seatsDialogTour) return;
    const val = parseFloat(bulkValue);
    if (isNaN(val)) {
      toast.error('Enter a valid adjustment value');
      return;
    }
    setBulkApplying(true);
    try {
      const res = await groupTourAPI.adminBulkAdjustPrices(
        seatsDialogTour.id,
        bulkScope,
        bulkType,
        val
      );
      toast.success(`Updated ${res.updated} seat(s)`);
      setBulkValue('');
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to adjust prices');
    } finally {
      setBulkApplying(false);
    }
  };

  const handleResetPrices = async () => {
    if (!seatsDialogTour || !confirm('Reset all seat price overrides to base price?')) return;
    try {
      const res = await groupTourAPI.adminResetSeatPrices(seatsDialogTour.id);
      toast.success(`Reset ${res.deleted} seat(s) to base price`);
      const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
      setSeatsDialogData(data);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset prices');
    }
  };

  const handleCancelBooking = async (b: GroupTourBooking) => {
    if (!confirm(`Cancel booking ${b.booking_number}? Seats will be released.`)) return;
    setCancellingId(b.id);
    try {
      await groupTourAPI.adminCancelBooking(b.id);
      toast.success('Booking cancelled');
      fetchBookings();
      fetchTours();
      if (seatsDialogOpen && seatsDialogTour && b.tour_id === seatsDialogTour.id) {
        const data = await groupTourAPI.adminGetSeatOccupancy(seatsDialogTour.id);
        setSeatsDialogData(data);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this tour? Seat reservations will be lost.')) return;
    try {
      await groupTourAPI.adminDeleteTour(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Tour deleted');
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const allIds = tours.map((t) => t.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(allIds) : new Set());
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected tour(s)? Seat reservations will be lost.`)) return;
    setDeletingBulk(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const id of selectedIds) {
        try {
          await groupTourAPI.adminDeleteTour(id);
          ok++;
        } catch {
          fail++;
        }
      }
      setSelectedIds(new Set());
      if (fail > 0) toast.error(`${ok} deleted, ${fail} failed`);
      else toast.success(`${ok} tour(s) deleted`);
      fetchTours();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    } finally {
      setDeletingBulk(false);
    }
  };

  return (
    <AdminLayout activeTab="group-tours">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium flex items-center gap-2">
              <Bus className="h-8 w-8" />
              Group Tours
            </h1>
            <p className="text-gray-500 mt-1">
              Manage Tempo Traveller seat-sharing tours and pricing
            </p>
          </div>
          {activeTab === 'tours' && (
          <div className="flex gap-2">
            {someSelected && (
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={deletingBulk}
                className="gap-2"
              >
                {deletingBulk ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Tour
            </Button>
          </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>
          <TabsContent value="tours">
        <Card>
          <CardHeader>
            <CardTitle>All Tours</CardTitle>
          </CardHeader>
          <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
              ) : tours.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">
                  No tours yet. Create your first tour to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={(c) => toggleSelectAll(c === true)}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Price/Seat</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tours.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(t.id)}
                            onCheckedChange={(c) => toggleSelect(t.id, c === true)}
                            aria-label={`Select tour ${t.pickup_location} to ${t.dropoff_location}`}
                          />
                        </TableCell>
                        <TableCell>
                          {t.pickup_location} → {t.dropoff_location}
                        </TableCell>
                        <TableCell>{t.travel_date}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{t.price_per_seat}
                        </TableCell>
                        <TableCell>{t.available_seats} / {t.capacity}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openSeatsDialog(t)}
                              title="View seats"
                            >
                              <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(t)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(t.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="bookings">
        <Card>
          <CardHeader>
            <CardTitle>Group Tour Bookings</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Customer bookings for Tempo Traveller seat-sharing
            </p>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
            ) : bookings.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">
                No bookings yet. Bookings appear here when customers complete payment.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Boarding</TableHead>
                    <TableHead>Drop</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-sm">{b.booking_number}</TableCell>
                      <TableCell>
                        {b.pickup_location} → {b.dropoff_location}
                      </TableCell>
                      <TableCell>{b.travel_date}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{b.customer_name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {b.customer_phone}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {b.customer_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{b.seats?.join(', ') || b.seat_count}</TableCell>
                      <TableCell className="text-xs">
                        {b.boarding_point_name ? <><span className="font-medium">{b.boarding_point_name}</span>{b.boarding_point_time ? <><br /><span className="text-gray-500">{b.boarding_point_time}</span></> : null}</> : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{b.drop_point_name || (b.boarding_point_name ? 'Same' : '-')}</TableCell>
                      <TableCell className="text-right font-medium">₹{b.total_amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          b.status === 'paid' ? 'bg-green-100 text-green-800' :
                          b.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          b.status === 'failed' ? 'bg-red-100 text-red-800' :
                          b.status === 'cancelled' ? 'bg-gray-200 text-gray-700' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {b.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {['paid', 'pending'].includes(b.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                            onClick={() => handleCancelBooking(b)}
                            disabled={cancellingId === b.id}
                          >
                            {cancellingId === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            {cancellingId === b.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>
                {editingId ? 'Edit Tour' : 'Create Tour'}
              </DialogTitle>
              <DialogDescription>
                Set pickup, dropoff, date, and price per seat for this Tempo Traveller tour.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Araku Valley, Lambasingi – shown on tour cards"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional. Shown on tour cards. If empty, dropoff location is used.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Pickup location</label>
                  <Input
                    value={form.pickup_location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, pickup_location: e.target.value }))
                    }
                    placeholder="e.g. Vizag City"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Dropoff location</label>
                  <Input
                    value={form.dropoff_location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dropoff_location: e.target.value }))
                    }
                    placeholder="e.g. Araku Valley"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Travel date</label>
                  <Input
                    type="date"
                    value={form.travel_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, travel_date: e.target.value }))
                    }
                    min={today}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Expiry date</label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expiry_date: e.target.value }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Tour will not appear in search after this date.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Price per seat (₹)</label>
                  <Input
                    type="number"
                    min={1}
                    value={form.price_per_seat}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price_per_seat: Math.max(1, parseInt(e.target.value) || 500),
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input
                    type="number"
                    min={1}
                    max={17}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        capacity: Math.max(1, Math.min(17, parseInt(e.target.value) || 17)),
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Featured image URL</label>
                <Input
                  value={form.featured_image_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, featured_image_url: e.target.value }))
                  }
                  placeholder="https://example.com/tour-image.jpg"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional. Shown on tour cards when set.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Gallery images (one URL per line)</label>
                  <textarea
                    value={form.gallery_images.join('\n')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gallery_images: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder={'https://example.com/img1.jpg\nhttps://example.com/img2.jpg'}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Shown on search results.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Highlights (one per line)</label>
                  <textarea
                    value={form.highlights.join('\n')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        highlights: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                  placeholder={'Scenic route through hills\nAC Tempo Traveller\nPicnic spots en route'}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Package highlights shown on search results.
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Itinerary (one per line, format: DAY N: Title)</label>
                <textarea
                  value={form.itinerary.map((i) => `DAY ${i.day}: ${i.title}`).join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(Boolean);
                    const parsed = lines.map((line, idx) => {
                      const m = line.match(/^DAY\s*(\d+)\s*:\s*(.+)$/i);
                      return m ? { day: m[1], title: m[2].trim() } : { day: String(idx + 1), title: line.trim() };
                    });
                    setForm((f) => ({ ...f, itinerary: parsed }));
                  }}
                  placeholder={'DAY 1: Departure from pickup location\nDAY 2: Arrival at destination'}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Inclusions (one per line)</label>
                  <textarea
                    value={form.inclusions.join('\n')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        inclusions: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="AC Tempo Traveller\nShared transfer\nDriver included"
                    rows={2}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              <div>
                <label className="text-sm font-medium">Exclusions (one per line)</label>
                <textarea
                  value={form.exclusions.join('\n')}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      exclusions: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="Meals not included\nPersonal expenses"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Boarding Points</label>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">Same list used for drop points. Add, edit, delete, and reorder by drag.</p>
                <div className="space-y-2">
                  {form.boarding_points.map((bp, idx) => (
                    <div key={idx} className="flex gap-2 items-start p-2 border rounded-lg bg-gray-50/50">
                      <span className="text-gray-400 mt-2 cursor-grab"><GripVertical className="h-4 w-4" /></span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input placeholder="Name (e.g. RTC Complex)" value={bp.name} onChange={(e) => setForm((f) => ({ ...f, boarding_points: f.boarding_points.map((b, i) => i === idx ? { ...b, name: e.target.value } : b) }))} className="bg-white" />
                        <Input placeholder="Address / description" value={bp.address} onChange={(e) => setForm((f) => ({ ...f, boarding_points: f.boarding_points.map((b, i) => i === idx ? { ...b, address: e.target.value } : b) }))} className="bg-white" />
                        <Input placeholder="Time (e.g. 07:00)" value={bp.boarding_time} onChange={(e) => setForm((f) => ({ ...f, boarding_points: f.boarding_points.map((b, i) => i === idx ? { ...b, boarding_time: e.target.value } : b) }))} className="bg-white" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-red-600 shrink-0" onClick={() => setForm((f) => ({ ...f, boarding_points: f.boarding_points.filter((_, i) => i !== idx) }))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, boarding_points: [...f.boarding_points, { name: '', address: '', boarding_time: '07:00', sort_order: f.boarding_points.length }] }))}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add boarding point
                  </Button>
                </div>
              </div>
              </div>
              </div>
              <DialogFooter className="shrink-0 pt-4 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Seat occupancy dialog */}
        <Dialog open={seatsDialogOpen} onOpenChange={(o) => { setSeatsDialogOpen(o); if (!o) setEditPriceSeat(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Seat occupancy & pricing</DialogTitle>
              <DialogDescription>
                {seatsDialogData?.tour
                  ? `${seatsDialogData.tour.pickup_location} → ${seatsDialogData.tour.dropoff_location} • ${seatsDialogData.tour.travel_date}`
                  : 'Tour seats'}
              </DialogDescription>
            </DialogHeader>
            {seatsDialogLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              </div>
            ) : seatsDialogData ? (
              <div className="space-y-4">
                {/* Bulk pricing */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5" />
                    Bulk price adjustment (only available seats)
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Scope</label>
                      <select value={bulkScope} onChange={(e) => setBulkScope(e.target.value as any)} className="h-8 text-xs rounded border border-slate-200 px-2">
                        <option value="all">All seats</option>
                        <option value="available">Available only</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Type</label>
                      <select value={bulkType} onChange={(e) => setBulkType(e.target.value as any)} className="h-8 text-xs rounded border border-slate-200 px-2">
                        <option value="fixed">₹ (fixed)</option>
                        <option value="percent">% (percent)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Value</label>
                      <Input type="number" placeholder={bulkType === 'percent' ? 'e.g. 10' : 'e.g. 100'} value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="h-8 w-24 text-xs" />
                    </div>
                    <Button size="sm" onClick={handleBulkAdjust} disabled={bulkApplying || !bulkValue} className="h-8 text-xs">
                      {bulkApplying ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      Apply
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleResetPrices} className="h-8 text-xs gap-1">
                      <RotateCcw className="h-3 w-3" />
                      Reset to base
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Base price: ₹{seatsDialogData?.tour?.price_per_seat ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> General</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-500" /> Female-only</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-400" /> Booked (M)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-300" /> Booked (F)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Reserved</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" /> Blocked</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seatsDialogData.seats.map((s) => {
                    const isAvailable = s.status === 'available';
                    const isFemaleOnlyAvail = isAvailable && s.is_female_only;
                    const isBookedFemale = s.status === 'booked' && s.passenger_gender === 'female';
                    const isBookedMale = s.status === 'booked' && (s.passenger_gender === 'male' || !s.passenger_gender);
                    const bg = s.status === 'blocked' ? 'bg-red-50 border-red-200' :
                      s.status === 'reserved' ? 'bg-amber-50 border-amber-200' :
                      isBookedFemale ? 'bg-pink-100 border-pink-200' :
                      isBookedMale ? 'bg-gray-100 border-gray-200' :
                      isFemaleOnlyAvail ? 'bg-pink-50 border-pink-200' :
                      'bg-emerald-50 border-emerald-200';
                    return (
                      <div key={s.seat_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg}`}>
                        <span className="font-medium">{s.seat_id}</span>
                        <span className="text-xs font-medium text-slate-600">₹{s.price ?? seatsDialogData?.tour?.price_per_seat ?? 0}</span>
                        <span className="text-xs text-gray-500">
                          {s.status === 'booked' && s.passenger_gender ? `(${s.passenger_gender})` : s.status}
                        </span>
                        {s.booking_number && (
                          <span className="text-xs text-gray-600 truncate max-w-[80px]" title={s.booking_number}>{s.booking_number}</span>
                        )}
                        {isAvailable && (
                          <div className="flex gap-1">
                            {s.is_female_only ? (
                              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => handleSetGeneral(s.seat_id)}>General</Button>
                            ) : (
                              <Button variant="outline" size="sm" className="h-6 text-xs text-pink-600 hover:bg-pink-50" onClick={() => handleSetFemaleOnly(s.seat_id)}>Female only</Button>
                            )}
                            <Button variant="outline" size="sm" className="h-6 text-xs text-red-600 hover:bg-red-50" onClick={() => handleBlockSeat(s.seat_id)}>Block</Button>
                            {editPriceSeat === s.seat_id ? (
                              <div className="flex gap-1 items-center">
                                <Input type="number" min={1} value={editPriceValue} onChange={(e) => setEditPriceValue(e.target.value)} className="h-6 w-16 text-xs" placeholder="₹" />
                                <Button size="sm" className="h-6 text-xs" onClick={() => handleSetSeatPrice(s.seat_id, parseFloat(editPriceValue) || 0)}>OK</Button>
                                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditPriceSeat(null); setEditPriceValue(''); }}>Cancel</Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setEditPriceSeat(s.seat_id); setEditPriceValue(String(s.price ?? seatsDialogData?.tour?.price_per_seat ?? 0)); }}>Edit price</Button>
                            )}
                          </div>
                        )}
                        {s.status === 'blocked' && (
                          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => handleUnblockSeat(s.seat_id)}>Unblock</Button>
                        )}
                        {s.status === 'reserved' && (
                          <Button variant="outline" size="sm" className="h-6 text-xs text-amber-700 hover:bg-amber-100" onClick={() => handleUnreserveSeat(s.seat_id)}>Unreserve</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  Female-only seats are bookable only by female passengers. Blocked seats are excluded from customer availability. General/Female-only is configurable per travel date.
                </p>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
