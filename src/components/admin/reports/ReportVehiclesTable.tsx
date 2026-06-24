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
import { Loader2, ExternalLink, Trash2, Eye } from 'lucide-react';
import { buildReportDrillRange, fetchBookingsByVehicle } from '@/services/reportsAPI';
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

interface VehiclesReportData {
  vehicle_id: string;
  vehicle_name: string;
  vehicle_number: string;
  total_trips: number;
  total_revenue: number;
  fuel_cost?: number;
  maintenance_cost?: number;
  net_profit?: number;
  utilization_rate?: number;
  downtime_days?: number;
  commission?: number;
  avg_driver_salary?: number;
  emi?: number;
  expenses?: number;
  total_expenses?: number;
}

interface ReportVehiclesTableProps {
  data: VehiclesReportData[] | any;
  dateRange?: DateRange | undefined;
  periodFilter?: string;
  drillDownFilters?: { tripStatus: string; paymentStatus: string };
}

export function ReportVehiclesTable({
  data,
  dateRange,
  periodFilter = 'custom',
  drillDownFilters,
}: ReportVehiclesTableProps) {
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; name: string; number: string } | null>(null);
  const [vehicleBookings, setVehicleBookings] = useState<Record<string, unknown>[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Record<string, unknown> | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '0%';
    return `${Math.round(value)}%`;
  };

  const handleTripsClick = useCallback(async (row: VehiclesReportData) => {
    const vehicleId = String(row.vehicle_id ?? '');
    if (!vehicleId) return;
    const range = buildReportDrillRange(periodFilter, dateRange);

    setSelectedVehicle({
      id: vehicleId,
      name: row.vehicle_name || '',
      number: row.vehicle_number || '',
    });
    setLoadingBookings(true);
    setVehicleBookings([]);
    try {
      const bookings = await fetchBookingsByVehicle(vehicleId, range, drillDownFilters);
      setVehicleBookings(bookings);
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

  const refreshVehicleBookings = useCallback(async () => {
    if (!selectedVehicle) return;
    setLoadingBookings(true);
    try {
      const range = buildReportDrillRange(periodFilter, dateRange);
      const bookings = await fetchBookingsByVehicle(selectedVehicle.id, range, drillDownFilters);
      setVehicleBookings(bookings);
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedVehicle, dateRange, drillDownFilters, periodFilter]);

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
      await refreshVehicleBookings();
    } catch (err) {
      toast({ title: 'Update failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshVehicleBookings, toast]);

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
      await refreshVehicleBookings();
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
  }, [selectedBooking, refreshVehicleBookings, toast]);

  const handleCancelBooking = useCallback(async () => {
    if (!selectedBooking) return;
    setIsSubmitting(true);
    try {
      await bookingAPI.cancelBooking(selectedBooking.id);
      toast({ title: 'Booking cancelled' });
      setSelectedBooking(null);
      await refreshVehicleBookings();
    } catch (err) {
      toast({ title: 'Cancel failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshVehicleBookings, toast]);

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

        const data = await response.json();
        if (data.status === 'success') {
          toast({ title: 'Invoice generated successfully' });
          return data;
        }
        throw new Error(data.message || 'Unknown error generating invoice');
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
      await refreshVehicleBookings();
    } catch (err) {
      toast({ title: 'Status update failed', description: String(err), variant: 'destructive' });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBooking, refreshVehicleBookings, toast]);

  const handleDeleteClick = useCallback((b: Record<string, unknown>) => setBookingToDelete(b), []);

  const handleConfirmDelete = useCallback(async () => {
    if (!bookingToDelete || !bookingToDelete.id) return;
    try {
      await bookingAPI.deleteBooking(Number(bookingToDelete.id));
      toast({ title: 'Booking deleted' });
      setBookingToDelete(null);
      await refreshVehicleBookings();
    } catch (err) {
      toast({ title: 'Delete failed', description: String(err), variant: 'destructive' });
    }
  }, [bookingToDelete, refreshVehicleBookings, toast]);

  let reportData: VehiclesReportData[] = [];

  if (Array.isArray(data)) {
    reportData = data;
  } else if (data && typeof data === 'object' && data.vehicles && Array.isArray(data.vehicles)) {
    reportData = data.vehicles;
  } else if (data?.topVehicles && Array.isArray(data.topVehicles)) {
    reportData = data.topVehicles;
  }

  if (reportData.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No vehicle data available for the selected period.</p>
      </div>
    );
  }

  const totals = reportData.reduce(
    (acc, row) => {
      acc.total_trips += Number(row.total_trips || 0);
      acc.total_revenue += Number(row.total_revenue || 0);
      acc.fuel_cost += Number(row.fuel_cost || 0);
      acc.maintenance_cost += Number(row.maintenance_cost || 0);
      acc.commission += Number(row.commission || 0);
      acc.avg_driver_salary += Number(row.driver_salary_total ?? row.avg_driver_salary ?? 0);
      acc.emi += Number(row.emi || 0);
      acc.total_expenses += Number(row.total_expenses || row.expenses || 0);
      return acc;
    },
    { total_trips: 0, total_revenue: 0, fuel_cost: 0, maintenance_cost: 0, commission: 0, avg_driver_salary: 0, emi: 0, total_expenses: 0 }
  );

  const netProfit = totals.total_revenue - totals.fuel_cost - totals.maintenance_cost - totals.commission - totals.emi - totals.avg_driver_salary - totals.total_expenses;
  const topRevenue = [...reportData].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))[0];
  const topUtilized = [...reportData].sort((a, b) => (b.utilization_rate || 0) - (a.utilization_rate || 0))[0];
  const totalExpenses = totals.total_expenses;

  const getStatusClass = (status: string) => {
    const s = String(status ?? '').toLowerCase();
    if (s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'cancelled') return 'bg-red-100 text-red-800';
    if (s === 'confirmed') return 'bg-blue-100 text-blue-800';
    if (s === 'assigned') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Vehicle Performance</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Vehicle Number</TableHead>
                <TableHead className="text-right">Trips</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Fuel Cost</TableHead>
                <TableHead className="text-right">Maintenance</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">EMI</TableHead>
                <TableHead className="text-right">Avg Driver Salary</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => {
                const driverCost = row.driver_salary_total ?? row.avg_driver_salary ?? 0;
                const profit = (row.total_revenue || 0) - (row.fuel_cost || 0) - (row.maintenance_cost || 0) - (row.commission || 0) - (row.emi || 0) - driverCost - (row.expenses || 0);
                const tripCount = Number(row.total_trips || 0);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.vehicle_name}</TableCell>
                    <TableCell>{row.vehicle_number}</TableCell>
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
                    <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.fuel_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.maintenance_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.commission)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.emi)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.avg_driver_salary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(profit)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{totals.total_trips}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total_revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.fuel_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.maintenance_cost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.commission)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.emi)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.avg_driver_salary)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrency(netProfit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Vehicle bookings drill-down dialog */}
      <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="vehicle-bookings-desc">
          <DialogHeader>
            <DialogTitle>
              Bookings for {selectedVehicle?.number || selectedVehicle?.name} ({selectedVehicle?.name || selectedVehicle?.number})
            </DialogTitle>
            <DialogDescription id="vehicle-bookings-desc">
              Trips assigned to this vehicle in the report period. View, edit, or delete bookings.
            </DialogDescription>
          </DialogHeader>
          {loadingBookings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : vehicleBookings.length === 0 ? (
            <p className="text-muted-foreground py-4">No bookings found for this vehicle in the selected period.</p>
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
                  {vehicleBookings.map((b: Record<string, unknown>) => (
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
        <h3 className="text-lg font-medium mb-2">Top Performing Vehicles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topRevenue && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Highest Revenue</div>
              <div className="font-semibold mt-1">{topRevenue.vehicle_name} ({topRevenue.vehicle_number})</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(topRevenue.total_revenue)}</div>
            </div>
          )}
          {topUtilized && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Most Utilized</div>
              <div className="font-semibold mt-1">{topUtilized.vehicle_name} ({topUtilized.vehicle_number})</div>
              <div className="text-2xl font-bold mt-1">{formatPercentage(topUtilized.utilization_rate)} utilization</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Fleet Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
            <div className="text-2xl font-bold">{reportData.length}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_revenue)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className="text-2xl font-bold">{formatCurrency(netProfit)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
