
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

  // Safe function to ensure we always have an array of valid statuses
  const getValidStatuses = (rawData: any): Array<BookingStatus | 'all'> => {
    console.log('Processing statuses from raw data:', rawData);
    
    // Default statuses to include if we can't extract from raw data
    const defaultStatuses: Array<BookingStatus | 'all'> = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
    
    // If no data provided, return defaults
    if (!rawData) {
      console.log('No raw data provided, using default statuses');
      return defaultStatuses;
    }
    
    try {
      // If the data is already an array, process it
      if (Array.isArray(rawData)) {
        console.log('Raw data is an array with length:', rawData.length);
        
        if (rawData.length === 0) {
          console.log('Empty array provided, using default statuses');
          return defaultStatuses;
        }
        
        // Filter out invalid items and convert all to strings
        const validStatuses: Array<BookingStatus | 'all'> = rawData
          .filter(item => item !== null && item !== undefined)
          .map(item => String(item) as BookingStatus)
          .filter(status => {
            // Check if it's a valid status
            return ['all', 'pending', 'confirmed', 'assigned', 'payment_received', 
                   'payment_pending', 'completed', 'cancelled'].includes(status);
          });
        
        // Always ensure 'all' is included
        if (!validStatuses.includes('all')) {
          validStatuses.unshift('all');
        }
        
        console.log('Processed valid statuses:', validStatuses);
        return validStatuses.length > 1 ? validStatuses : defaultStatuses;
      } 
      // If it's a string, try to split it and process
      else if (typeof rawData === 'string') {
        console.log('Raw data is a string:', rawData);
        const parts = rawData.split(',').map(s => s.trim()).filter(Boolean);
        
        if (parts.length === 0) {
          console.log('No valid parts after splitting string, using default statuses');
          return defaultStatuses;
        }
        
        const validStatuses: Array<BookingStatus | 'all'> = parts
          .filter(status => {
            return ['all', 'pending', 'confirmed', 'assigned', 'payment_received', 
                   'payment_pending', 'completed', 'cancelled'].includes(status);
          }) as Array<BookingStatus | 'all'>;
        
        // Always ensure 'all' is included
        if (!validStatuses.includes('all')) {
          validStatuses.unshift('all');
        }
        
        console.log('Processed valid statuses from string:', validStatuses);
        return validStatuses.length > 1 ? validStatuses : defaultStatuses;
      }
      // If it's an object, try to extract values
      else if (typeof rawData === 'object' && rawData !== null) {
        console.log('Raw data is an object, extracting values');
        const objectValues = Object.values(rawData);
        return getValidStatuses(objectValues);
      }
    } catch (err) {
      console.error('Error processing statuses:', err);
    }
    
    console.log('Unable to process raw data, using default statuses');
    return defaultStatuses;
  };

  useEffect(() => {
    if (metricsData) {
      console.log('Processing metrics data for statuses:', metricsData);
      try {
        const processedStatuses = getValidStatuses(metricsData.availableStatuses);
        setAvailableStatuses(processedStatuses);
      } catch (err) {
        console.error('Error setting available statuses:', err);
        setAvailableStatuses(['all', 'pending', 'confirmed', 'completed', 'cancelled']);
      }
    } else {
      console.log('No metrics data available, using default statuses');
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
