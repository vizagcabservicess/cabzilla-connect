
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatus, DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { ArrowDown, ArrowUp, Calendar, CarTaxiFront, CircleDollarSign, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export type { DashboardMetricsType };

interface DashboardMetricsProps {
  metrics?: DashboardMetricsType | null;
  isLoading?: boolean;
  error?: Error | null;
  onFilterChange?: (status: BookingStatus | 'all') => void;
  selectedPeriod?: 'today' | 'week' | 'month';
  initialMetrics?: DashboardMetricsType;
  period?: 'today' | 'week' | 'month';
  onRefresh?: () => void;
}

export function DashboardMetrics({ 
  metrics, 
  isLoading = false, 
  error = null, 
  onFilterChange = () => {}, 
  selectedPeriod = 'week',
  initialMetrics,
  period,
  onRefresh
}: DashboardMetricsProps) {
  const metricsData = metrics || initialMetrics || null;
  const currentPeriod = selectedPeriod || period || 'week';
  
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
  const [availableStatuses, setAvailableStatuses] = useState<Array<BookingStatus | 'all'>>(['all']);

  useEffect(() => {
    try {
      // Safeguard at the beginning - always have 'all' as a default option
      const safeStatuses: Array<BookingStatus | 'all'> = ['all'];
      
      // Only proceed if we have metrics data
      if (metricsData && metricsData.availableStatuses) {
        console.log('Processing availableStatuses:', metricsData.availableStatuses);
        
        // Make sure availableStatuses is in a format we can safely work with
        let statusesArray: string[] = [];
        
        // Handle different possible formats
        if (Array.isArray(metricsData.availableStatuses)) {
          console.log('availableStatuses is an array');
          statusesArray = metricsData.availableStatuses.filter(status => status !== null && status !== undefined)
            .map(status => String(status));
        } else if (typeof metricsData.availableStatuses === 'object' && metricsData.availableStatuses !== null) {
          console.log('availableStatuses is an object');
          statusesArray = Object.values(metricsData.availableStatuses)
            .filter(status => status !== null && status !== undefined)
            .map(status => String(status));
        } else if (typeof metricsData.availableStatuses === 'string') {
          console.log('availableStatuses is a string');
          statusesArray = metricsData.availableStatuses.split(',').map(s => s.trim());
        } else {
          console.log('availableStatuses is in an unknown format:', typeof metricsData.availableStatuses);
          // If we can't determine the format, use default statuses
          statusesArray = ['pending', 'confirmed', 'completed', 'cancelled'];
        }
        
        console.log('Processed statusesArray:', statusesArray);
        
        // Add only valid booking statuses to the array
        if (Array.isArray(statusesArray)) {
          for (const status of statusesArray) {
            if (typeof status === 'string' && status.trim() !== '') {
              const isValidStatus = [
                'pending', 'confirmed', 'assigned', 'payment_received', 
                'payment_pending', 'completed', 'continued', 'cancelled'
              ].includes(status);
              
              if (isValidStatus) {
                safeStatuses.push(status as BookingStatus);
              }
            }
          }
        }
      }
      
      // Always update with at least the default 'all' value
      console.log('Final statuses array:', safeStatuses);
      setAvailableStatuses(safeStatuses);
    } catch (err) {
      console.error('Error processing availableStatuses:', err);
      // Fallback to default statuses
      setAvailableStatuses(['all', 'pending', 'confirmed', 'completed', 'cancelled']);
    }
  }, [metricsData]);

  const handleStatusChange = (value: string) => {
    const newStatus = value as BookingStatus | 'all';
    setSelectedStatus(newStatus);
    if (onFilterChange) {
      onFilterChange(newStatus);
    } else if (onRefresh) {
      onRefresh();
    }
  };

  if (error) {
    return (
      <Card className="bg-red-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-700">Error Loading Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Dashboard Metrics
          {isLoading && (
            <span className="ml-2 text-sm font-normal text-gray-500 animate-pulse">
              Loading...
            </span>
          )}
        </h2>
        
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600">Filter by status:</p>
          <Select 
            value={selectedStatus} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {availableStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status === 'all' ? 'All Statuses' : 
                    status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Bookings"
          value={metricsData?.totalBookings}
          icon={<Calendar />}
          description={`${currentPeriod === 'today' ? 'Today' : currentPeriod === 'week' ? 'This week' : 'This month'}`}
          isLoading={isLoading}
          color="bg-blue-50"
          textColor="text-blue-700"
        />
        
        <MetricCard
          title="Active Rides"
          value={metricsData?.activeRides}
          icon={<CarTaxiFront />}
          description="Currently ongoing"
          isLoading={isLoading}
          color="bg-green-50"
          textColor="text-green-700"
        />
        
        <MetricCard
          title="Total Revenue"
          value={metricsData?.totalRevenue}
          icon={<CircleDollarSign />}
          description={`${currentPeriod === 'today' ? 'Today' : currentPeriod === 'week' ? 'This week' : 'This month'}`}
          isLoading={isLoading}
          color="bg-amber-50"
          textColor="text-amber-700"
          format={(val) => `₹${val?.toLocaleString('en-IN') || 0}`}
        />
        
        <MetricCard
          title="Upcoming Rides"
          value={metricsData?.upcomingRides}
          icon={<CarTaxiFront />}
          description="Next 24 hours"
          isLoading={isLoading}
          color="bg-purple-50"
          textColor="text-purple-700"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Available Drivers"
          value={metricsData?.availableDrivers}
          icon={<Users />}
          description="Ready for assignment"
          isLoading={isLoading}
          color="bg-emerald-50"
          textColor="text-emerald-700"
        />
        
        <MetricCard
          title="Busy Drivers"
          value={metricsData?.busyDrivers}
          icon={<Users />}
          description="Currently on duty"
          isLoading={isLoading}
          color="bg-pink-50"
          textColor="text-pink-700"
        />
        
        <MetricCard
          title="Average Rating"
          value={metricsData?.avgRating}
          icon={<Star />}
          description="Customer satisfaction"
          isLoading={isLoading}
          color="bg-yellow-50"
          textColor="text-yellow-700"
          format={(val) => val?.toFixed(1) || '0.0'}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value?: number;
  icon: React.ReactNode;
  description: string;
  isLoading: boolean;
  color: string;
  textColor: string;
  format?: (value: number | undefined) => string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  description, 
  isLoading, 
  color,
  textColor,
  format,
  trend
}: MetricCardProps) {
  const displayValue = format ? format(value) : value?.toString() || '0';
  
  return (
    <Card className={cn(color, "border")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn(textColor, "opacity-75")}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-[100px]" />
        ) : (
          <div className="text-2xl font-bold">{displayValue}</div>
        )}
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </CardContent>
      {trend && (
        <CardFooter className="pt-0">
          <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
            <span>{trend.value}%</span>
            <span className="ml-1 text-gray-600">from last period</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
