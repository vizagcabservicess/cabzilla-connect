
import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';

interface RevenueReportData {
  date: string;
  total_revenue: number;
  average_booking_value: number;
  booking_count: number;
  trip_type: string;
  cab_type: string;
}

interface ReportRevenueTableProps {
  data: RevenueReportData[];
}

export function ReportRevenueTable({ data }: ReportRevenueTableProps) {
  // Process data to group by date for daily summary
  const dailySummary = useMemo(() => {
    const summary: Record<string, {
      date: string;
      total_revenue: number;
      booking_count: number;
      average_booking_value: number;
    }> = {};

    data.forEach(item => {
      if (!summary[item.date]) {
        summary[item.date] = {
          date: item.date,
          total_revenue: 0,
          booking_count: 0,
          average_booking_value: 0,
        };
      }
      
      summary[item.date].total_revenue += Number(item.total_revenue);
      summary[item.date].booking_count += Number(item.booking_count);
    });

    // Calculate average booking value for each day
    Object.keys(summary).forEach(date => {
      const day = summary[date];
      day.average_booking_value = day.booking_count > 0 
        ? day.total_revenue / day.booking_count 
        : 0;
    });

    return Object.values(summary).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  // Process data to group by trip and cab types
  const typeSummary = useMemo(() => {
    const summary: Record<string, {
      trip_type: string;
      cab_type: string;
      total_revenue: number;
      booking_count: number;
      average_booking_value: number;
    }> = {};

    data.forEach(item => {
      const key = `${item.trip_type}-${item.cab_type}`;
      
      if (!summary[key]) {
        summary[key] = {
          trip_type: item.trip_type,
          cab_type: item.cab_type,
          total_revenue: 0,
          booking_count: 0,
          average_booking_value: 0,
        };
      }
      
      summary[key].total_revenue += Number(item.total_revenue);
      summary[key].booking_count += Number(item.booking_count);
    });

    // Calculate average booking value for each type
    Object.keys(summary).forEach(key => {
      const type = summary[key];
      type.average_booking_value = type.booking_count > 0 
        ? type.total_revenue / type.booking_count 
        : 0;
    });

    return Object.values(summary).sort((a, b) => b.total_revenue - a.total_revenue);
  }, [data]);

  // Calculate overall totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => {
        acc.total_revenue += Number(row.total_revenue);
        acc.booking_count += Number(row.booking_count);
        return acc;
      },
      {
        total_revenue: 0,
        booking_count: 0,
        average_booking_value: 0,
      }
    );
  }, [data]);

  // Calculate overall average
  totals.average_booking_value = totals.booking_count > 0 
    ? totals.total_revenue / totals.booking_count 
    : 0;

  // Format date for display
  const formatReportDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Daily Revenue Summary</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Average Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailySummary.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{formatReportDate(row.date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                  <TableCell className="text-right">{row.booking_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.average_booking_value)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total_revenue)}</TableCell>
                <TableCell className="text-right">{totals.booking_count}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.average_booking_value)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Revenue by Trip & Vehicle Type</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Type</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Average Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeSummary.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="capitalize">{row.trip_type}</TableCell>
                  <TableCell>{row.cab_type}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                  <TableCell className="text-right">{row.booking_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.average_booking_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Revenue Highlights</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.total_revenue)}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Bookings</div>
            <div className="text-2xl font-bold">{totals.booking_count}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Average Booking Value</div>
            <div className="text-2xl font-bold">{formatCurrency(totals.average_booking_value)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
