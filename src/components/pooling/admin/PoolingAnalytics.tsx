import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Star, 
  AlertTriangle,
  RefreshCw,
  UserCheck
} from 'lucide-react';

const PoolingAnalytics = () => {
  // Mock data - in real implementation, this would come from API
  const analytics = {
    totalRides: 1248,
    activeRides: 45,
    completedRides: 1156,
    cancelledRides: 47,
    totalBookings: 2890,
    pendingBookings: 23,
    confirmedBookings: 2834,
    totalRevenue: 485670,
    commissionEarned: 72850,
    averageRating: 4.6,
    totalProviders: 156,
    verifiedProviders: 142,
    activeDisputes: 8,
    refundsProcessed: 23,
    cancellationRate: 3.8,
    monthlyGrowth: 15.6,
    revenueByType: {
      carpool: 285600,
      bus: 145800,
      sharedTaxi: 54270
    },
    topRoutes: [
      { route: 'Hyderabad → Visakhapatnam', bookings: 234, revenue: 78900 },
      { route: 'Visakhapatnam → Vijayawada', bookings: 189, revenue: 56700 },
      { route: 'Vijayawada → Hyderabad', bookings: 167, revenue: 45600 }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rides</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRides.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{analytics.monthlyGrowth}%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Commission: {formatCurrency(analytics.commissionEarned)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating}</div>
            <p className="text-xs text-muted-foreground">
              Across {analytics.totalProviders} providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeDisputes}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ride Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Ride Status Overview</CardTitle>
            <CardDescription>Current status of all rides</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Rides</span>
                <span className="font-medium">{analytics.activeRides}</span>
              </div>
              <Progress value={(analytics.activeRides / analytics.totalRides) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed Rides</span>
                <span className="font-medium">{analytics.completedRides}</span>
              </div>
              <Progress value={(analytics.completedRides / analytics.totalRides) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cancelled Rides</span>
                <span className="font-medium">{analytics.cancelledRides}</span>
              </div>
              <Progress value={(analytics.cancelledRides / analytics.totalRides) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service Type</CardTitle>
            <CardDescription>Breakdown of earnings by ride type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="text-sm">Car Pooling</span>
              </div>
              <span className="font-medium">{formatCurrency(analytics.revenueByType.carpool)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Bus Travel</span>
              </div>
              <span className="font-medium">{formatCurrency(analytics.revenueByType.bus)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="text-sm">Shared Taxi</span>
              </div>
              <span className="font-medium">{formatCurrency(analytics.revenueByType.sharedTaxi)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider & Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider Verification</CardTitle>
            <CardDescription>KYC and verification status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Providers</span>
                <Badge variant="outline">{analytics.totalProviders}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Verified</span>
                <Badge variant="default">{analytics.verifiedProviders}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Verification</span>
                <Badge variant="secondary">{analytics.totalProviders - analytics.verifiedProviders}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancellation Metrics</CardTitle>
            <CardDescription>Cancellation and refund tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cancellation Rate</span>
                <Badge variant={analytics.cancellationRate > 5 ? "destructive" : "default"}>
                  {analytics.cancellationRate}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Refunds Processed</span>
                <Badge variant="outline">{analytics.refundsProcessed}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Quality</CardTitle>
            <CardDescription>Customer satisfaction metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <Badge variant="default">{analytics.averageRating}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Disputes</span>
                <Badge variant={analytics.activeDisputes > 10 ? "destructive" : "secondary"}>
                  {analytics.activeDisputes}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Routes */}
      <Card>
        <CardHeader>
          <CardTitle>Top Routes</CardTitle>
          <CardDescription>Most popular routes by bookings and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topRoutes.map((route, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{route.route}</p>
                  <p className="text-sm text-gray-600">{route.bookings} bookings</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(route.revenue)}</p>
                  <Badge variant="outline">#{index + 1}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoolingAnalytics;
