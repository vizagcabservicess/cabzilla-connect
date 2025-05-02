
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VehiclesReportData {
  vehicle_type: string;
  total_bookings: number;
  total_revenue: number;
  average_revenue: number;
}

interface ReportVehiclesTableProps {
  data: VehiclesReportData[];
}

export function ReportVehiclesTable({ data }: ReportVehiclesTableProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => {
      acc.total_bookings += Number(row.total_bookings);
      acc.total_revenue += Number(row.total_revenue);
      return acc;
    },
    {
      total_bookings: 0,
      total_revenue: 0,
      average_revenue: 0,
    }
  );

  // Calculate overall average
  totals.average_revenue = totals.total_bookings > 0 
    ? totals.total_revenue / totals.total_bookings 
    : 0;

  // Sort data by total revenue in descending order
  const sortedData = [...data].sort((a, b) => b.total_revenue - a.total_revenue);

  // Calculate percentages for each vehicle type
  const dataWithPercentages = sortedData.map(row => ({
    ...row,
    revenue_percentage: (Number(row.total_revenue) / totals.total_revenue) * 100,
    booking_percentage: (Number(row.total_bookings) / totals.total_bookings) * 100
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-3">Vehicle Type Performance</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle Type</TableHead>
                <TableHead className="text-right">Total Bookings</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Average Revenue</TableHead>
                <TableHead className="text-right">% of Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataWithPercentages.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.vehicle_type}</TableCell>
                  <TableCell className="text-right">{row.total_bookings}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.average_revenue)}</TableCell>
                  <TableCell className="text-right">{row.revenue_percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell>Totals</TableCell>
                <TableCell className="text-right">{totals.total_bookings}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.total_revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.average_revenue)}</TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Revenue Distribution</h3>
        <div className="space-y-4">
          {dataWithPercentages.map((row, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{row.vehicle_type}</span>
                <span>{formatCurrency(row.total_revenue)} ({row.revenue_percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: `${row.revenue_percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Vehicle Utilization</h3>
        <div className="space-y-4">
          {dataWithPercentages.map((row, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="font-medium">{row.vehicle_type}</span>
                <span>{row.total_bookings} bookings ({row.booking_percentage.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full" 
                  style={{ width: `${row.booking_percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-2">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Total Vehicle Types</div>
            <div className="text-2xl font-bold">{data.length}</div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Most Popular</div>
            <div className="text-2xl font-bold">
              {dataWithPercentages.length > 0 ? dataWithPercentages[0].vehicle_type : '-'}
            </div>
          </div>
          <div className="rounded-md border p-4">
            <div className="text-sm text-muted-foreground">Highest Average Revenue</div>
            <div className="text-2xl font-bold">
              {dataWithPercentages.length > 0 
                ? formatCurrency(Math.max(...dataWithPercentages.map(item => item.average_revenue)))
                : formatCurrency(0)
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
