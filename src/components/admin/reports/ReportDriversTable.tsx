
import React, { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Loader2, Trash2, Eye, Star } from 'lucide-react';
import { buildReportDrillRange, fetchBookingsByDriver } from '@/services/reportsAPI';
import { bookingAPI } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookingDetailsModal } from '../BookingDetailsModal';
import { Booking, BookingStatus } from '@/types/api';
import {
  tripSummaryForApiBody,
  type TripSummaryOverrides,
} from '@/utils/invoiceTripSummaryDefaults';
import { getApiUrl } from '@/config/api';

interface DriversReportData {
  driver_id: number;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  average_trip_value: number;
  rating: number;
}

interface ReportDriversTableProps {
  data: DriversReportData[] | any;
  dateRange?: DateRange | undefined;
  periodFilter?: string;
  drillDownFilters?: { tripStatus: string; paymentStatus: string };
}

export function ReportDriversTable({
  data,
  dateRange,
  periodFilter = 'custom',
  drillDownFilters,
}: ReportDriversTableProps) {
  const { toast } = useToast();
  const [selectedDriver, setSelectedDriver] = useState<{ id: string; name: string } | null>(null);
  const [driverBookings, setDriverBookings] = useState<Record<string, unknown>[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Record<string, unknown> | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const renderRating = (rating: number | null | undefined) => {
    const validRating = rating || 0;
    return (
      <div className="flex items-center">
        <span className="font-medium mr-1">{validRating.toFixed(1)}</span>
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      </div>
    );
  };

  const getStatusClass = (status: string) => {
    const s = String(status ?? '').toLowerCase();
    if (s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    if (s === 'confirmed') return 'bg-blue-100 text-blue-800';
    if (s === 'assigned') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  const handleTripsClick = useCallback(async (row: DriversReportData) => {
    const driverId = String(row.driver_id ?? '');
    if (!driverId) return;
    const range = buildReportDrillRange(periodFilter, dateRange);
    setSelectedDriver({ id: driverId, name: row.driver_name || '' });
    setLoadingBookings(true);
    setDriverBookings([]);
    try {
      const bookings = await fetchBookingsByDriver(driverId, range, drillDownFilters);
      setDriverBookings(bookings);
    } catch (err) {
      toast({
        title: 'Failed to load bookings',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoadingBookings(false);
    }
  }, [dateRange, drillDownFilters, periodFilter, toast]);

  const refreshDriverBookings = useCallback(async () => {
    if (!selectedDriver) return;
    setLoadingBookings(true);
    try {
      const range = buildReportDrillRange(periodFilter, dateRange);
      const bookings = await fetchBookingsByDriver(selectedDriver.id, range, drillDownFilters);
      setDriverBookings(bookings);
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedDriver, dateRange, drillDownFilters, periodFilter]);

  const handleViewBooking = useCallback(async (b: Record<string, unknown>) => {
    try {
      const full = await bookingAPI.getBookingById(Number(b.id));
      setSelectedBooking(full as Booking);
    } catch {
      toast({ title: 'Failed to load booking', variant: 'destructive' });
    }
  }, [toast]);

  const handleEdit = useCallback(async (updatedData: Partial<Booking>) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.updateBooking(selectedBooking.id, updatedData);
      toast({ title: 'Booking updated' });
      setSelectedBooking(null);
      await refreshDriverBookings();
    } catch (err) {
      toast({ title: 'Update failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshDriverBookings, toast]);

  const handleAssignDriver = useCallback(async (driverData: {
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    driverId?: string;
  }) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.assignDriver(selectedBooking.id, driverData);
      toast({ title: 'Driver assigned' });
      setSelectedBooking(null);
      await refreshDriverBookings();
    } catch (err: unknown) {
      const axiosMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({
        title: 'Assignment failed',
        description: axiosMsg || (err instanceof Error ? err.message : String(err)),
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshDriverBookings, toast]);

  const handleCancelBooking = useCallback(async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.cancelBooking(selectedBooking.id);
      toast({ title: 'Booking cancelled' });
      setSelectedBooking(null);
      await refreshDriverBookings();
    } catch (err) {
      toast({ title: 'Cancel failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshDriverBookings, toast]);

  const handleGenerateInvoice = useCallback(
    async (
      gstEnabled?: boolean,
      gstDetails?: Record<string, unknown>,
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
        const apiUrl = getApiUrl('/api/admin/generate-invoice.php');
        const finalIncludeTax =
          includeTax !== undefined ? includeTax : (gstEnabled ? true : false);

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
          requestBody.lockedBaseFare = gstDetails.lockedBaseFare;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to generate invoice: ${response.status} ${response.statusText}\n${errorText}`
          );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          throw new Error('Invoice API returned non-JSON response: ' + textResponse);
        }

        const invData = await response.json();
        if (invData.status === 'success') {
          toast({ title: 'Invoice generated successfully' });
          return invData;
        }
        throw new Error(invData.message || 'Unknown error generating invoice');
      } catch (error) {
        console.error('Invoice generation error:', error);
        toast({
          title: 'Failed to generate invoice',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedBooking, toast]
  );

  const handleStatusChange = useCallback(async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.updateBookingStatus(selectedBooking.id, newStatus);
      toast({ title: 'Status updated' });
      setSelectedBooking(null);
      await refreshDriverBookings();
    } catch (err) {
      toast({ title: 'Status update failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshDriverBookings, toast]);

  const handleDeleteClick = useCallback((b: Record<string, unknown>) => setBookingToDelete(b), []);

  const handleConfirmDelete = useCallback(async () => {
    if (!bookingToDelete || !bookingToDelete.id) return;
    try {
      await bookingAPI.deleteBooking(Number(bookingToDelete.id));
      toast({ title: 'Booking deleted' });
      setBookingToDelete(null);
      await refreshDriverBookings();
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err), variant: 'destructive' });
    }
  }, [bookingToDelete, refreshDriverBookings, toast]);

  let reportData: DriversReportData[] = [];

  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.drivers && Array.isArray(data.drivers)) {
    reportData = data.drivers;
  } else if (data && typeof data === 'object') {
    console.log('Received non-array driver data:', data);
    if (data.topDrivers && Array.isArray(data.topDrivers)) {
      reportData = data.topDrivers;
    } else {
      reportData = [];
    }
  }

  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No driver data available for the selected period.</p>
      </div>
    );
  }

  const totals = reportData.reduce(
    (acc, row) => {
      acc.total_trips += Number(row.total_trips || 0);
      acc.total_earnings += Number(row.total_earnings || 0);
      return acc;
    },
    {
      total_trips: 0,
      total_earnings: 0,
    }
  );

  const topDriver = [...reportData].sort((a, b) => (b.total_trips || 0) - (a.total_trips || 0))[0];
  const topEarner = [...reportData].sort((a, b) => (b.total_earnings || 0) - (a.total_earnings || 0))[0];
  const topRated = [...reportData].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Driver Performance</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Total Trips</TableHead>
                <TableHead className="text-right">Total Earnings</TableHead>
                <TableHead className="text-right">Avg Trip Value</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => {
                const tripCount = Number(row.total_trips || 0);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.driver_name}</TableCell>
                    <TableCell className="text-right">
                      {tripCount > 0 ? (
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary font-medium hover:underline"
                          onClick={() => handleTripsClick(row)}
                        >
                          {tripCount}
                        </Button>
                      ) : (
                        tripCount
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_earnings)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.average_trip_value)}</TableCell>
                    <TableCell>{renderRating(row.rating)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell className="text-right">{totals.total_trips}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total_earnings)}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="driver-bookings-desc">
          <DialogHeader>
            <DialogTitle>
              Bookings for {selectedDriver?.name || 'driver'}
            </DialogTitle>
            <DialogDescription id="driver-bookings-desc">
              Trips for this driver in the report period. View, edit, or delete bookings.
            </DialogDescription>
          </DialogHeader>
          {loadingBookings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : driverBookings.length === 0 ? (
            <p className="text-muted-foreground py-4">No bookings found for this driver in the selected period.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Drop</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverBookings.map((b: Record<string, unknown>) => (
                    <TableRow key={String(b.id)}>
                      <TableCell className="font-medium">{String(b.booking_number ?? '-')}</TableCell>
                      <TableCell>{String(b.passenger_name ?? '-')}</TableCell>
                      <TableCell className="max-w-[100px] truncate" title={String(b.pickup_location ?? '')}>{String(b.pickup_location ?? '-')}</TableCell>
                      <TableCell className="max-w-[100px] truncate" title={String(b.drop_location ?? '')}>{String(b.drop_location ?? '-')}</TableCell>
                      <TableCell>{b.pickup_date ? format(new Date(String(b.pickup_date)), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell className="text-right">₹{Number(b.total_amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(String(b.status ?? ''))}`}>
                          {String(b.status ?? 'pending')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewBooking(b)} title="View / Edit">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(b)} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!bookingToDelete} onOpenChange={(open) => !open && setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete booking #{bookingToDelete ? String(bookingToDelete.booking_number ?? bookingToDelete.id) : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onEdit={handleEdit}
        onAssignDriver={handleAssignDriver}
        onCancel={handleCancelBooking}
        onGenerateInvoice={handleGenerateInvoice}
        onStatusChange={handleStatusChange}
        isSubmitting={isSubmitting}
      />

      <div>
        <h3 className="text-lg font-medium mb-2">Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topDriver && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Most Trips</div>
              <div className="font-semibold mt-1">{topDriver.driver_name}</div>
              <div className="text-2xl font-bold mt-1">{topDriver.total_trips || 0} trips</div>
            </div>
          )}

          {topEarner && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Highest Earnings</div>
              <div className="font-semibold mt-1">{topEarner.driver_name}</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(topEarner.total_earnings)}</div>
            </div>
          )}

          {topRated && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Top Rated</div>
              <div className="font-semibold mt-1">{topRated.driver_name}</div>
              <div className="text-2xl font-bold mt-1 flex items-center">
                {(topRated.rating || 0).toFixed(1)}
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 ml-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Driver Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Drivers</div>
            <div className="text-2xl font-bold">{reportData.length}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Trips</div>
            <div className="text-2xl font-bold">{totals.total_trips}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Earnings</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_earnings)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Trips per Driver</div>
            <div className="text-2xl font-bold">
              {reportData.length > 0 ? Math.round(totals.total_trips / reportData.length) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
