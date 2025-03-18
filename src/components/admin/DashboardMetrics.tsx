
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatus, DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { ArrowDown, ArrowUp, Calendar, CarTaxiFront, CircleDollarSign, Star, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricsProps {
  metrics: DashboardMetricsType | null;
  isLoading: boolean;
  error: Error | null;
  onFilterChange: (status: BookingStatus | 'all') => void;
  selectedPeriod: 'today' | 'week' | 'month';
}

export function DashboardMetrics({ 
  metrics, 
  isLoading, 
  error, 
  onFilterChange, 
  selectedPeriod 
}: DashboardMetricsProps) {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>('all');
  const [availableStatuses, setAvailableStatuses] = useState<Array<BookingStatus | 'all'>>(['all']);

  useEffect(() => {
    if (metrics?.availableStatuses) {
      // Ensure 'all' is always the first option
      const statuses: Array<BookingStatus | 'all'> = ['all'];
      
      // Add all statuses from metrics that are valid BookingStatus types or can be cast as such
      metrics.availableStatuses.forEach(status => {
        // Check if the status is a valid BookingStatus
        const isValidStatus = [
          'pending', 'confirmed', 'assigned', 'payment_received', 
          'payment_pending', 'completed', 'continued', 'cancelled'
        ].includes(status);
        
        if (isValidStatus) {
          statuses.push(status as BookingStatus);
        }
      });
      
      setAvailableStatuses(statuses);
    }
  }, [metrics]);

  // Handle status change (fix the type issue)
  const handleStatusChange = (value: string) => {
    // Cast the string value to the appropriate type
    const newStatus = value as BookingStatus | 'all';
    setSelectedStatus(newStatus);
    onFilterChange(newStatus);
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
          value={metrics?.totalBookings}
          icon={<Calendar />}
          description={`${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This week' : 'This month'}`}
          isLoading={isLoading}
          color="bg-blue-50"
          textColor="text-blue-700"
        />
        
        <MetricCard
          title="Active Rides"
          value={metrics?.activeRides}
          icon={<CarTaxiFront />}
          description="Currently ongoing"
          isLoading={isLoading}
          color="bg-green-50"
          textColor="text-green-700"
        />
        
        <MetricCard
          title="Total Revenue"
          value={metrics?.totalRevenue}
          icon={<CircleDollarSign />}
          description={`${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This week' : 'This month'}`}
          isLoading={isLoading}
          color="bg-amber-50"
          textColor="text-amber-700"
          format={(val) => `₹${val?.toLocaleString('en-IN') || 0}`}
        />
        
        <MetricCard
          title="Upcoming Rides"
          value={metrics?.upcomingRides}
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
          value={metrics?.availableDrivers}
          icon={<Users />}
          description="Ready for assignment"
          isLoading={isLoading}
          color="bg-emerald-50"
          textColor="text-emerald-700"
        />
        
        <MetricCard
          title="Busy Drivers"
          value={metrics?.busyDrivers}
          icon={<Users />}
          description="Currently on duty"
          isLoading={isLoading}
          color="bg-pink-50"
          textColor="text-pink-700"
        />
        
        <MetricCard
          title="Average Rating"
          value={metrics?.avgRating}
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
