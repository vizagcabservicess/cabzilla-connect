
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
import { format } from 'date-fns';
import { BookingsReportData, BookingsByDate } from '@/types/reports';
import { fetchBookingsByDate } from '@/services/reportsAPI';
import { Loader2 } from 'lucide-react';

interface ReportBookingsTableProps {
  data: BookingsReportData;
  onDateClick?: (date: string) => void;
  /** Applied report filters — drill-down uses same trip/payment filters as summary */
  drillDownFilters?: { tripStatus: string; paymentStatus: string };
}

export function ReportBookingsTable({ data, onDateClick, drillDownFilters }: ReportBookingsTableProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const handleDateClick = useCallback(async (date: string) => {
    if (onDateClick) {
      onDateClick(date);
      return;
    }
    setSelectedDate(date);
    setLoadingBookings(true);
    setDayBookings([]);
    try {
      const bookings = await fetchBookingsByDate(date, {
        tripStatus: drillDownFilters?.tripStatus,
        paymentStatus: drillDownFilters?.paymentStatus,
      });
      setDayBookings(bookings);
    } finally {
      setLoadingBookings(false);
    }
  }, [onDateClick, drillDownFilters?.tripStatus, drillDownFilters?.paymentStatus]);
  // Process data to ensure it's in the correct format
  let dailyBookings: BookingsByDate[] = [];
  
  if (data && Array.isArray(data.dailyBookings)) {
    dailyBookings = data.dailyBookings;
  } else if (Array.isArray(data)) {
    // If data is passed directly as an array
    dailyBookings = data as unknown as BookingsByDate[];
  }
  
  // Calculate totals from the daily bookings
  const totalBookings = dailyBookings.reduce((sum, item) => sum + (item.count || 0), 0);
  
  // Get status counts from data if available (ensure numeric to avoid NaN%)
  const statusCounts = data?.bookingsByStatus || {};
  const bookingsByStatus = {
    completed: Number(statusCounts.completed ?? 0),
    cancelled: Number(statusCounts.cancelled ?? 0),
    confirmed: Number(statusCounts.confirmed ?? 0),
    assigned: Number(statusCounts.assigned ?? 0),
    pending: Number(statusCounts.pending ?? 0)
  };
  
  // Format date for display
  const formatReportDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // If we have no data after processing, show an empty message
  if (dailyBookings.length === 0) {
    return (
      <div className="text-center p-6">
        <p className="text-muted-foreground">No booking data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total Bookings</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Cancelled</TableHead>
              <TableHead className="text-right">Confirmed</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dailyBookings.map((row, index) => (
              <TableRow
                key={index}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleDateClick(row.date)}
              >
                <TableCell className="font-medium text-primary">{formatReportDate(row.date)}</TableCell>
                <TableCell className="text-right">{row.count || 0}</TableCell>
                <TableCell className="text-right">{row.completed ?? '-'}</TableCell>
                <TableCell className="text-right">{row.cancelled ?? '-'}</TableCell>
                <TableCell className="text-right">{row.confirmed ?? '-'}</TableCell>
                <TableCell className="text-right">{row.assigned ?? '-'}</TableCell>
                <TableCell className="text-right">{row.pending ?? '-'}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Totals</TableCell>
              <TableCell className="text-right">{totalBookings}</TableCell>
              <TableCell className="text-right">{bookingsByStatus.completed}</TableCell>
              <TableCell className="text-right">{bookingsByStatus.cancelled}</TableCell>
              <TableCell className="text-right">{bookingsByStatus.confirmed}</TableCell>
              <TableCell className="text-right">{bookingsByStatus.assigned}</TableCell>
              <TableCell className="text-right">{bookingsByStatus.pending}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby="bookings-dialog-desc">
          <DialogHeader>
            <DialogTitle>
              Bookings for {selectedDate ? format(new Date(selectedDate), 'dd MMM yyyy') : ''}
            </DialogTitle>
            <DialogDescription id="bookings-dialog-desc">
              View booking details for the selected date.
            </DialogDescription>
          </DialogHeader>
          {loadingBookings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dayBookings.length === 0 ? (
            <p className="text-muted-foreground py-4">No bookings found for this date.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Drop</TableHead>
                    <TableHead>Pickup Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayBookings.map((b: Record<string, unknown>) => (
                    <TableRow key={String(b.id)}>
                      <TableCell className="font-medium">{String(b.booking_number ?? '-')}</TableCell>
                      <TableCell>{String(b.passenger_name ?? '-')}</TableCell>
                      <TableCell className="max-w-[120px] truncate" title={String(b.pickup_location ?? '')}>{String(b.pickup_location ?? '-')}</TableCell>
                      <TableCell className="max-w-[120px] truncate" title={String(b.drop_location ?? '')}>{String(b.drop_location ?? '-')}</TableCell>
                      <TableCell>{b.pickup_date ? format(new Date(String(b.pickup_date)), 'dd MMM yyyy') : '-'}</TableCell>
                      <TableCell>{String(b.pickup_time ?? '-')}</TableCell>
                      <TableCell className="text-right">₹{Number(b.total_amount ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          String(b.status ?? '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                          String(b.status ?? '').toLowerCase() === 'cancelled' ? 'bg-red-100 text-red-800' :
                          String(b.status ?? '').toLowerCase() === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          String(b.status ?? '').toLowerCase() === 'assigned' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {String(b.status ?? 'pending')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Completion Rate</div>
            <div className="text-2xl font-bold">
              {totalBookings > 0
                ? `${Math.round((bookingsByStatus.completed / totalBookings) * 100)}%`
                : "0%"}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Cancellation Rate</div>
            <div className="text-2xl font-bold">
              {totalBookings > 0
                ? `${Math.round((bookingsByStatus.cancelled / totalBookings) * 100)}%`
                : "0%"}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Bookings</div>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </div>
        </div>
      </div>

    </div>
  );
}
