
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Star } from 'lucide-react';

interface DriversReportData {
  driver_id: number;
  driver_name: string;
  total_trips: number;
  total_earnings: number;
  average_trip_value: number;
  rating: number;
}

interface ReportDriversTableProps {
  data: DriversReportData[];
}

export function ReportDriversTable({ data }: ReportDriversTableProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Render star rating
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        <span className="font-medium mr-1">{rating.toFixed(1)}</span>
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      </div>
    );
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, row) => {
      acc.total_trips += Number(row.total_trips);
      acc.total_earnings += Number(row.total_earnings);
      return acc;
    },
    {
      total_trips: 0,
      total_earnings: 0,
    }
  );

  // Calculate top performers
  const topDriver = [...data].sort((a, b) => b.total_trips - a.total_trips)[0];
  const topEarner = [...data].sort((a, b) => b.total_earnings - a.total_earnings)[0];
  const topRated = [...data].sort((a, b) => b.rating - a.rating)[0];

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
              {data.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{row.driver_name}</TableCell>
                  <TableCell className="text-right">{row.total_trips}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total_earnings)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.average_trip_value)}</TableCell>
                  <TableCell>{renderRating(row.rating)}</TableCell>
                </TableRow>
              ))}
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
      
      <div>
        <h3 className="text-lg font-medium mb-2">Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topDriver && (
            <div className="rounded-md border p-4">
              <div className="text-sm text-muted-foreground">Most Trips</div>
              <div className="font-semibold mt-1">{topDriver.driver_name}</div>
              <div className="text-2xl font-bold mt-1">{topDriver.total_trips} trips</div>
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
                {topRated.rating.toFixed(1)}
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
            <div className="text-2xl font-bold">{data.length}</div>
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
              {data.length > 0 ? Math.round(totals.total_trips / data.length) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
