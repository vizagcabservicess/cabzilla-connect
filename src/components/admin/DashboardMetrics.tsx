import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { BookingStatus, DashboardMetrics } from '@/types/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from 'lucide-react';

interface DashboardMetricsProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
  error?: Error;
  onFilterChange: (status: BookingStatus | "all") => void;
  selectedPeriod: string;
}

export function DashboardMetrics({ metrics, isLoading, error, onFilterChange, selectedPeriod }: DashboardMetricsProps) {
  if (isLoading) {
    return <div className="text-center py-4">Loading dashboard metrics...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error: {error.message}</div>;
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          {selectedPeriod !== 'custom' ? `Metrics for ${selectedPeriod}` : 'Metrics for custom period'}
        </CardDescription>
        <div className="flex items-center space-x-2 mt-2">
          <CalendarDays className="h-4 w-4" />
          <Select value={selectedPeriod} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pl-2 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Bookings" value={metrics.totalBookings} />
          <MetricCard label="Completed Bookings" value={metrics.completedBookings} />
          <MetricCard label="Pending Bookings" value={metrics.pendingBookings} />
          <MetricCard label="Cancelled Bookings" value={metrics.cancelledBookings} />
          <MetricCard label="Total Revenue" value={`₹${metrics.revenue.total.toFixed(2)}`} />
          <MetricCard label="Revenue Today" value={`₹${metrics.revenue.today.toFixed(2)}`} />
          <MetricCard label="Revenue This Week" value={`₹${metrics.revenue.thisWeek.toFixed(2)}`} />
          <MetricCard label="Revenue This Month" value={`₹${metrics.revenue.thisMonth.toFixed(2)}`} />
        </div>
      </CardContent>
    </Card>
  );
}
