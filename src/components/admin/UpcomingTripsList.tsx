import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { bookingAPI } from '@/services/api';
import { Booking, BookingStatus } from '@/types/api';
import {
  tripSummaryForApiBody,
  type TripSummaryOverrides,
} from '@/utils/invoiceTripSummaryDefaults';
import { AlertCircle, Calendar, Car, MapPin, MessageCircle, MoreHorizontal, Phone, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookingDetailsModal } from './BookingDetailsModal';
import { formatLocationForDisplay } from '@/utils/locationUtils';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  generateBookingConfirmationMessage,
  generateDriverAssignmentMessage,
  generateUpcomingTripReminderMessage,
} from '@/services/whatsappService';
import {
  formatPassengerPhoneForDisplay,
  passengerPhoneE164Digits,
  passengerPhoneToTelHref,
} from '@/utils/bookingUtils';

function isWithinNext24Hours(pickupIso: string): boolean {
  const t = new Date(pickupIso).getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t >= now && t <= now + 24 * 60 * 60 * 1000;
}

function formatPickupDisplay(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${day} ${month} ${year} at ${displayHours}:${minutes} ${ampm}`;
  } catch {
    return '—';
  }
}

type CronRunInfo = {
  booking_count: number;
  status: string;
  trigger: string;
  created_at: string;
};

function formatIstDateTime(value: string): string {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(/Z$|[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function cronRunSummary(run: CronRunInfo | null | undefined, label: string): string {
  if (!run) {
    return `${label}: never`;
  }
  return `${label}: ${formatIstDateTime(run.created_at)} · ${run.status} · ${run.booking_count} trip(s)`;
}

function tripTypeKey(booking: Booking): string {
  return String(booking.tripType ?? booking.trip_type ?? '').toLowerCase();
}

function dialPassenger(booking: Booking) {
  const raw = String(booking.passengerPhone ?? booking.guest_phone ?? '').trim();
  if (!raw) {
    toast.error('No phone number');
    return;
  }
  const cc =
    booking.passengerCountryCode ??
    (booking as Booking & { passenger_country_code?: string }).passenger_country_code;
  const href = passengerPhoneToTelHref(raw, cc);
  if (!href) {
    toast.error('Could not open dialer for this number');
    return;
  }
  window.location.href = href;
}

export function UpcomingTripsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [driverOptions, setDriverOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tripFilter, setTripFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappSendingId, setWhatsappSendingId] = useState<number | null>(null);
  const [bulkTomorrowOpen, setBulkTomorrowOpen] = useState(false);
  const [bulkTomorrowSending, setBulkTomorrowSending] = useState(false);
  const [cronStatusText, setCronStatusText] = useState<string | null>(null);

  const fetchCronStatus = useCallback(async () => {
    try {
      const res = await bookingAPI.getAdminCronStatus();
      const lastCron = res.data?.last_cron_run;
      const lastRun = res.data?.last_run;
      setCronStatusText(
        `${cronRunSummary(lastCron, 'Auto cron')} · ${cronRunSummary(lastRun, 'Last send')}`,
      );
    } catch {
      setCronStatusText(null);
    }
  }, []);

  const fetchUpcoming = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (tripFilter !== 'all') params.trip_type = tripFilter;
      if (paymentFilter !== 'all') params.payment_status = paymentFilter;
      if (driverFilter === 'unassigned') {
        params.driver = 'unassigned';
      } else if (driverFilter !== 'all') {
        params.driver = driverFilter;
      }

      const data = await bookingAPI.getUpcomingBookings(params);
      setBookings((data.bookings || []) as Booking[]);
      setDriverOptions(data.drivers || []);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to load upcoming trips');
      toast.error('Could not load upcoming trips');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, tripFilter, driverFilter, paymentFilter]);

  useEffect(() => {
    fetchUpcoming();
  }, [fetchUpcoming]);

  useEffect(() => {
    void fetchCronStatus();
  }, [fetchCronStatus]);

  const handleViewDetails = async (booking: Booking) => {
    try {
      const full = await bookingAPI.getBookingById(booking.id);
      setSelectedBooking(full);
    } catch {
      setSelectedBooking(booking);
      toast.message('Loaded partial details');
    }
  };

  const handleCloseDetails = () => setSelectedBooking(null);

  const handleEditBooking = async (updatedData: Partial<Booking>) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      const response = await bookingAPI.updateBooking(selectedBooking.id, updatedData);
      const updatedBooking = (response as { data?: Booking })?.data || {
        ...selectedBooking,
        ...updatedData,
      };
      setBookings((prev) =>
        prev.map((b) => (b.id === selectedBooking.id ? { ...b, ...updatedBooking } : b)),
      );
      setSelectedBooking((prev) => (prev ? { ...prev, ...updatedBooking } : null));
      toast.success('Booking updated');
      await fetchUpcoming();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDriver = async (driverData: {
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    driverId?: string | number;
  }) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.assignDriver(selectedBooking.id, driverData);
      toast.success('Driver assigned');
      handleCloseDetails();
      await fetchUpcoming();
    } catch {
      try {
        const driverPayload = driverData as {
          driverId?: string;
          driverName: string;
          driverPhone: string;
          vehicleNumber: string;
        };
        const directResponse = await fetch(getApiUrl('/api/admin/assign-driver.php'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: selectedBooking.id,
            driverId: driverPayload.driverId,
            driverName: driverPayload.driverName,
            driverPhone: driverPayload.driverPhone,
            vehicleNumber: driverPayload.vehicleNumber,
          }),
        });
        if (!directResponse.ok) throw new Error('Assign failed');
        toast.success('Driver assigned');
        handleCloseDetails();
        await fetchUpcoming();
      } catch (e2) {
        toast.error(e2 instanceof Error ? e2.message : 'Assign failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.cancelBooking(selectedBooking.id);
      toast.success('Booking cancelled');
      handleCloseDetails();
      await fetchUpcoming();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (
    gstEnabled?: boolean,
    gstDetails?: unknown,
    isIGST?: boolean,
    includeTax?: boolean,
    customInvoiceNumber?: string,
    adminNotes?: string,
    tripSummary?: TripSummaryOverrides,
    billingAddress?: string,
  ) => {
    if (!selectedBooking) return null;
    setIsSubmitting(true);
    try {
      const finalIncludeTax =
        includeTax !== undefined ? includeTax : gstEnabled ? true : false;
      const requestBody: Record<string, unknown> = {
        bookingId: selectedBooking.id,
        gstEnabled: gstEnabled || false,
        isIGST: isIGST || false,
        includeTax: finalIncludeTax,
        invoiceNumber: customInvoiceNumber || '',
        gstDetails: gstDetails || {},
        adminNotes: (adminNotes || '').trim() || undefined,
        tripSummary: tripSummary ? tripSummaryForApiBody(tripSummary) : undefined,
        billingAddress: (billingAddress || '').trim() || undefined,
      };
      if (gstDetails && typeof gstDetails === 'object' && 'lockedBaseFare' in gstDetails) {
        requestBody.lockedBaseFare = (gstDetails as { lockedBaseFare?: number }).lockedBaseFare;
      }
      const response = await fetch(getApiUrl('/api/admin/generate-invoice.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Invoice generated');
        return data;
      }
      throw new Error(data.message || 'Invoice failed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invoice failed');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.updateBookingStatus(selectedBooking.id, newStatus);
      toast.success(`Status: ${newStatus}`);
      handleCloseDetails();
      await fetchUpcoming();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Status update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentLabel = (booking: Booking) => {
    const ps = (booking.payment_status || booking.paymentStatus || '').toLowerCase();
    if (ps === 'paid') return 'Paid';
    if (ps === 'partial') return 'Partial';
    return 'Pending';
  };

  const handleBulkTomorrowAdminWhatsApp = async () => {
    setBulkTomorrowSending(true);
    try {
      const res = await bookingAPI.sendTomorrowAdminWhatsAppBulk();
      const d = res.data;
      if (!d) {
        toast.success('Admin summary sent');
        setBulkTomorrowOpen(false);
        return;
      }
      const level = res.status === 'warning' ? toast.message : toast.success;
      level(
        `WhatsApp to admins: ${d.booking_count} tomorrow booking(s), ${d.whatsapp_parts} message part(s) × ${d.admin_recipients} number(s)`,
      );
      if (res.message) {
        toast.message(res.message);
      }
      setBulkTomorrowOpen(false);
      await fetchUpcoming();
      await fetchCronStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk WhatsApp failed');
    } finally {
      setBulkTomorrowSending(false);
    }
  };

  const sendCustomerWhatsApp = async (
    kind: 'confirmation' | 'driver' | 'reminder',
    row: Booking,
  ) => {
    const phoneRaw = String(row.passengerPhone ?? row.guest_phone ?? '').trim();
    if (!phoneRaw) {
      toast.error('No customer phone on this booking');
      return;
    }
    setWhatsappSendingId(row.id);
    try {
      const full = await bookingAPI.getBookingById(row.id);
      if (kind === 'driver') {
        if (!full.driverName?.trim()) {
          toast.error('Assign a driver first, then send driver details');
          return;
        }
      }
      let text: string;
      if (kind === 'confirmation') {
        const { enrichTourBookingFromCatalog } = await import(
          '@/utils/enrichTourBookingForConfirmation'
        );
        const enriched = await enrichTourBookingFromCatalog(full);
        text = generateBookingConfirmationMessage(enriched);
      } else if (kind === 'driver') {
        text = generateDriverAssignmentMessage(full);
      } else {
        text = generateUpcomingTripReminderMessage(full);
      }
      const waPhone = passengerPhoneE164Digits(
        phoneRaw,
        full.passengerCountryCode ??
          (full as Booking & { passenger_country_code?: string }).passenger_country_code,
      );
      if (!waPhone) {
        toast.error('WhatsApp needs full international number (+…) or country code on the booking');
        return;
      }
      await bookingAPI.sendAdminTripWhatsApp(waPhone, text, 'trip');
      toast.success('WhatsApp sent to customer (trip line)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'WhatsApp send failed');
    } finally {
      setWhatsappSendingId(null);
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2">
          <Label>From date</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>To date</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Trip type</Label>
          <Select value={tripFilter} onValueChange={setTripFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="airport">Airport Transfer</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="outstation">Outstation</SelectItem>
              <SelectItem value="tour">Tour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Payment</Label>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 lg:col-span-2 xl:col-span-2">
          <Label>Driver</Label>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All drivers</SelectItem>
              <SelectItem value="unassigned">Unassigned only</SelectItem>
              {driverOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-2 xl:col-span-2">
          <Button
            variant="outline"
            className="h-10"
            disabled={refreshing}
            onClick={() => {
              setRefreshing(true);
              fetchUpcoming();
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AlertDialog open={bulkTomorrowOpen} onOpenChange={setBulkTomorrowOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-10"
                disabled={refreshing || bulkTomorrowSending}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp admins (tomorrow)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Send tomorrow&apos;s trip summary to admin WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sends the same grouped summary as the daily 7:00 PM IST cron to numbers in{' '}
                  <strong>WHATSAPP_ADMIN_PHONES</strong> (trip Cloud API line). Includes all active bookings
                  with pickup <strong>tomorrow</strong> (pending, confirmed, assigned, etc. — not completed or
                  cancelled). Long lists are split into multiple messages per admin number.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={bulkTomorrowSending}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  disabled={bulkTomorrowSending}
                  onClick={() => void handleBulkTomorrowAdminWhatsApp()}
                >
                  {bulkTomorrowSending ? 'Sending…' : 'Send now'}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {cronStatusText && (
            <p className="w-full text-xs text-muted-foreground">{cronStatusText}</p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={!!selectedBooking}
          onClose={handleCloseDetails}
          onEdit={handleEditBooking}
          onAssignDriver={handleAssignDriver}
          onCancel={handleCancelBooking}
          onGenerateInvoice={handleGenerateInvoice}
          onStatusChange={handleStatusChange}
          isSubmitting={isSubmitting}
        />
      )}

      {bookings.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No upcoming trips match your filters.</p>
      ) : (
        <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup → Drop</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Tour duration</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="w-[72px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => {
                const pickupStr = booking.pickupDate || booking.pickup_date || '';
                const urgent = isWithinNext24Hours(pickupStr);
                const tt = tripTypeKey(booking);
                const rowClass = urgent
                  ? 'bg-amber-50/80 dark:bg-amber-950/20 border-l-4 border-amber-500'
                  : 'hover:bg-muted/30';

                return (
                  <TableRow key={booking.id} className={rowClass}>
                    <TableCell className="font-medium text-primary whitespace-nowrap">
                      {booking.bookingNumber ?? booking.id}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.passengerName ?? booking.guest_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          {formatPassengerPhoneForDisplay(
                            String(booking.passengerPhone ?? booking.guest_phone ?? ''),
                            booking.passengerCountryCode ??
                              (booking as Booking & { passenger_country_code?: string })
                                .passenger_country_code,
                          ) || '—'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                          <span>
                            {formatLocationForDisplay(
                              booking.pickupLocation ?? booking.pickup_location ?? '',
                            ).name}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs pl-5">→</div>
                        <div className="flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                          <span>
                            {formatLocationForDisplay(
                              booking.dropLocation ?? booking.drop_location ?? '',
                            ).name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-blue-600" />
                        {formatPickupDisplay(pickupStr)}
                      </div>
                      {urgent && (
                        <Badge variant="outline" className="mt-1 text-amber-800 border-amber-600 bg-amber-100/80">
                          Next 24h
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tt === 'tour' ? (
                        <Badge className="bg-violet-600 hover:bg-violet-700">Tour</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {booking.tripTypeDisplay ??
                            (tt === 'airport'
                              ? 'Airport Transfer'
                              : tt === 'local'
                                ? 'Local'
                                : tt === 'outstation'
                                  ? 'Outstation'
                                  : tt || '—')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(booking.tourDurationLabel ?? '').trim() || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Car className="h-3.5 w-3.5 text-orange-600" />
                        {booking.cabType ?? booking.vehicle_type ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <span>{booking.driverName?.trim() ? booking.driverName : '—'}</span>
                        {!booking.driverName?.trim() && (
                          <Badge variant="outline" className="text-rose-700 border-rose-400 bg-rose-50">
                            Driver not assigned
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge
                          className={
                            paymentLabel(booking) === 'Paid'
                              ? 'bg-green-100 text-green-900 hover:bg-green-200'
                              : paymentLabel(booking) === 'Partial'
                                ? 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                                : 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
                          }
                        >
                          {paymentLabel(booking)}
                        </Badge>
                        {paymentLabel(booking) === 'Pending' && (
                          <Badge variant="outline" className="text-amber-900 border-amber-400">
                            Payment pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => void handleViewDetails(booking)}>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleViewDetails(booking)}>
                            Assign driver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            WhatsApp (trip number)
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            disabled={whatsappSendingId === booking.id}
                            onClick={() => void sendCustomerWhatsApp('confirmation', booking)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                            Full booking summary
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              whatsappSendingId === booking.id || !booking.driverName?.trim()
                            }
                            onClick={() => void sendCustomerWhatsApp('driver', booking)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                            Driver details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={whatsappSendingId === booking.id}
                            onClick={() => void sendCustomerWhatsApp('reminder', booking)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-amber-600" />
                            Short trip reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => dialPassenger(booking)}>
                            Call customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
