
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { bookingAPI } from '@/services/api';
import { Car, Users, DollarSign, Star, Clock, AlertTriangle, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DashboardMetricsProps {
  initialMetrics?: DashboardMetricsType;
  period?: 'today' | 'week' | 'month';
  onRefresh?: () => void;
}

export function DashboardMetrics({ initialMetrics, period = 'week', onRefresh }: DashboardMetricsProps) {
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

  // Initial data fetch when component mounts (only if no initialMetrics provided)
  useEffect(() => {
    if (!initialMetrics) {
      fetchMetrics();
    }
  }, [initialMetrics]);

  // Fetch metrics data when period changes
  useEffect(() => {
    if (!initialMetrics || period) {
      fetchMetrics();
    }
  }, [period]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching dashboard metrics for period: ${period}...`);
      const data = await bookingAPI.getAdminDashboardMetrics();
      console.log('Dashboard metrics received:', data);
      setMetrics(data);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      setError('Failed to load dashboard metrics');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load dashboard metrics',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Card className="mb-8 border-red-200 bg-red-50">
        <CardContent className="pt-6 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const periodText = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month'
  }[period];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" /> Total Bookings ({periodText})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalBookings}</div>
          <p className="text-xs text-gray-500">+12% from last {period}</p>
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
  );
}
