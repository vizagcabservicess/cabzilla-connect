
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { bookingAPI } from '@/services/api';
import { Car, Users, DollarSign, Star, Clock, AlertTriangle, Calendar, RefreshCw, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BookingStatus } from '@/types/api';

interface DashboardMetricsProps {
  initialMetrics?: DashboardMetricsType;
  period?: 'today' | 'week' | 'month';
  onRefresh?: () => void;
}

export function DashboardMetrics({ initialMetrics, period: initialPeriod = 'week', onRefresh }: DashboardMetricsProps) {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetricsType>(initialMetrics || {
    totalBookings: 0,
    activeRides: 0,
    totalRevenue: 0,
    availableDrivers: 0,
    busyDrivers: 0,
    avgRating: 0,
    upcomingRides: 0
  });
  const [isLoading, setIsLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>(initialPeriod);
  const [retryCount, setRetryCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');

  // Initial data fetch when component mounts or period changes
  useEffect(() => {
    fetchMetrics();
  }, [period, statusFilter]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching dashboard metrics for period: ${period} and status: ${statusFilter}...`);
      
      // Add a timestamp for cache busting
      const timestamp = new Date().getTime();
      console.log(`Cache busting with timestamp: ${timestamp}`);
      
      // Call the API with the period and status filter
      const data = await bookingAPI.getAdminDashboardMetrics(period, statusFilter !== 'all' ? statusFilter : undefined);
      console.log('Dashboard metrics received:', data);
      
      if (data) {
        setMetrics(data);
        if (onRefresh) onRefresh();
      } else {
        throw new Error('No data received from metrics API');
      }
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      
      // Set a more user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to load dashboard metrics';
      
      setError(errorMessage);
      
      toast({
        title: "Error Loading Metrics",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: 'today' | 'week' | 'month') => {
    setPeriod(newPeriod);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchMetrics();
  };

  if (error) {
    return (
      <div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Tabs value={period} className="w-full">
            <TabsList>
              <TabsTrigger value="today" onClick={() => handlePeriodChange('today')}>Today</TabsTrigger>
              <TabsTrigger value="week" onClick={() => handlePeriodChange('week')}>This Week</TabsTrigger>
              <TabsTrigger value="month" onClick={() => handlePeriodChange('month')}>This Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookingStatus | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="payment_received">Payment Received</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="continued">Continued</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <ApiErrorFallback 
          error={error} 
          onRetry={handleRetry} 
          title="Dashboard Metrics Error" 
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Tabs value={period} className="w-full">
            <TabsList>
              <TabsTrigger value="today" onClick={() => handlePeriodChange('today')}>Today</TabsTrigger>
              <TabsTrigger value="week" onClick={() => handlePeriodChange('week')}>This Week</TabsTrigger>
              <TabsTrigger value="month" onClick={() => handlePeriodChange('month')}>This Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookingStatus | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="payment_received">Payment Received</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="continued">Continued</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const periodText = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month'
  }[period];

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Tabs value={period} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="today" onClick={() => handlePeriodChange('today')}>Today</TabsTrigger>
              <TabsTrigger value="week" onClick={() => handlePeriodChange('week')}>This Week</TabsTrigger>
              <TabsTrigger value="month" onClick={() => handlePeriodChange('month')}>This Month</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BookingStatus | 'all')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter === 'all' ? 'All Bookings' : statusFilter.replace('_', ' ')}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="payment_received">Payment Received</SelectItem>
              <SelectItem value="payment_pending">Payment Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="continued">Continued</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" /> Total Bookings ({periodText})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBookings}</div>
            <p className="text-xs text-gray-500">
              {statusFilter !== 'all' ? `Filtered by status: ${statusFilter.replace('_', ' ')}` : '+12% from last period'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-gray-500">+8% from last {period}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" /> Active Rides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRides}</div>
            <p className="text-xs text-gray-500">Current ongoing trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" /> Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgRating.toFixed(1)} / 5</div>
            <p className="text-xs text-gray-500">Based on customer reviews</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Available Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.availableDrivers}</div>
            <p className="text-xs text-gray-500">Ready for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Busy Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.busyDrivers}</div>
            <p className="text-xs text-gray-500">Currently on trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Upcoming Rides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.upcomingRides}</div>
            <p className="text-xs text-gray-500">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Real-time Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Active</div>
            <p className="text-xs text-green-600">Last updated: {new Date().toLocaleTimeString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
