
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from 'date-fns';

interface BookingsReportData {
  date: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  confirmed_bookings: number;
  assigned_bookings: number;
  pending_bookings: number;
}

interface ReportBookingsTableProps {
  data: BookingsReportData[];
}

export function ReportBookingsTable({ data }: ReportBookingsTableProps) {
  // Calculate totals
  const totals = data.reduce(
    (acc, row) => {
      acc.total_bookings += Number(row.total_bookings);
      acc.completed_bookings += Number(row.completed_bookings);
      acc.cancelled_bookings += Number(row.cancelled_bookings);
      acc.confirmed_bookings += Number(row.confirmed_bookings);
      acc.assigned_bookings += Number(row.assigned_bookings);
      acc.pending_bookings += Number(row.pending_bookings);
      return acc;
    },
    {
      total_bookings: 0,
      completed_bookings: 0,
      cancelled_bookings: 0,
      confirmed_bookings: 0,
      assigned_bookings: 0,
      pending_bookings: 0,
    }
  );

  // Format date for display
  const formatReportDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Cancelled</TableHead>
              <TableHead className="text-right">Confirmed</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{formatReportDate(row.date)}</TableCell>
                <TableCell className="text-right">{row.total_bookings}</TableCell>
                <TableCell className="text-right">{row.completed_bookings}</TableCell>
                <TableCell className="text-right">{row.cancelled_bookings}</TableCell>
                <TableCell className="text-right">{row.confirmed_bookings}</TableCell>
                <TableCell className="text-right">{row.assigned_bookings}</TableCell>
                <TableCell className="text-right">{row.pending_bookings}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell>Totals</TableCell>
              <TableCell className="text-right">{totals.total_bookings}</TableCell>
              <TableCell className="text-right">{totals.completed_bookings}</TableCell>
              <TableCell className="text-right">{totals.cancelled_bookings}</TableCell>
              <TableCell className="text-right">{totals.confirmed_bookings}</TableCell>
              <TableCell className="text-right">{totals.assigned_bookings}</TableCell>
              <TableCell className="text-right">{totals.pending_bookings}</TableCell>
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
              {totals.total_bookings > 0
                ? `${Math.round((totals.completed_bookings / totals.total_bookings) * 100)}%`
                : "0%"}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Cancellation Rate</div>
            <div className="text-2xl font-bold">
              {totals.total_bookings > 0
                ? `${Math.round((totals.cancelled_bookings / totals.total_bookings) * 100)}%`
                : "0%"}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Bookings</div>
            <div className="text-2xl font-bold">{totals.total_bookings}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
