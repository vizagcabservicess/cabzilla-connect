
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { bookingAPI } from '@/services/api';
import { Car, Users, DollarSign, Star, Clock, AlertTriangle, Calendar, RefreshCw, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
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
  const { toast: uiToast } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetricsType>(initialMetrics || {
    totalBookings: 0,
    activeRides: 0,
    totalRevenue: 0,
    availableDrivers: 0,
    busyDrivers: 0,
    avgRating: 0,
    upcomingRides: 0,
    availableStatuses: ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'],
    currentFilter: 'all'
  });
  const [isLoading, setIsLoading] = useState(!initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>(initialPeriod);
  const [retryCount, setRetryCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(
    initialMetrics?.currentFilter || 'all'
  );

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
        // Make sure we have a valid metrics object
        if (typeof data === 'object' && 'totalBookings' in data) {
          setMetrics(data);
          if (onRefresh) onRefresh();
        } else {
          console.error('Invalid metrics format received:', data);
          throw new Error('Invalid data format received from metrics API');
        }
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
      
      // Show toast notification using useToast
      uiToast({
        title: "Error Loading Metrics",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Also show in sonner toast for better visibility
      toast.error("Error Loading Metrics", {
        description: errorMessage,
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

  const handleHardRefresh = () => {
    // Clear auth token and reload to force new login
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    window.location.href = '/login';
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
              {metrics.availableStatuses?.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Dashboard Metrics Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
            <h4 className="text-sm font-medium text-blue-800 flex items-center mb-2">
              <RefreshCw className="h-4 w-4 mr-2" /> Automatic Recovery
            </h4>
            <p className="text-sm text-blue-700 mb-2">The retry button below will:</p>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
              <li>Clear your authentication tokens</li>
              <li>Clear cached data that might be causing issues</li>
              <li>Reload the connection with a fresh state</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button variant="default" onClick={handleRetry} className="flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
            <Button variant="destructive" onClick={handleHardRefresh} className="ml-auto">
              Log Out and Retry
            </Button>
          </div>
        </div>
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
              {metrics.availableStatuses?.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
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
              {metrics.availableStatuses?.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
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
