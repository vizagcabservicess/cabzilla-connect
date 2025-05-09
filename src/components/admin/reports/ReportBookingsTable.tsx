
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { BookingsReportData, BookingsByDate } from '@/types/reports';

interface ReportBookingsTableProps {
  data: BookingsReportData;
}

export function ReportBookingsTable({ data }: ReportBookingsTableProps) {
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
  
  // Get status counts from data if available
  const bookingsByStatus = data?.bookingsByStatus || {
    completed: 0,
    cancelled: 0,
    confirmed: 0,
    assigned: 0,
    pending: 0
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
              <TableRow key={index}>
                <TableCell className="font-medium">{formatReportDate(row.date)}</TableCell>
                <TableCell className="text-right">{row.count || 0}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
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
