
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { Car, Users, DollarSign, Star, Clock } from "lucide-react";

interface DashboardMetricsProps {
  initialMetrics?: DashboardMetricsType;
}

export function DashboardMetrics({ initialMetrics }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetricsType>(initialMetrics || {
    totalBookings: 120,
    activeRides: 10,
    totalRevenue: 50000,
    availableDrivers: 15,
    busyDrivers: 8,
    avgRating: 4.7,
    upcomingRides: 25
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" /> Total Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalBookings}</div>
          <p className="text-xs text-gray-500">+12% from last month</p>
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
          <p className="text-xs text-gray-500">+8% from last month</p>
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
          <div className="text-2xl font-bold">{metrics.avgRating} / 5</div>
          <p className="text-xs text-gray-500">Based on 230 reviews</p>
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
            <Clock className="h-4 w-4" /> Upcoming Rides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.upcomingRides}</div>
          <p className="text-xs text-gray-500">Scheduled for today</p>
        </CardContent>
      </Card>
    </div>
  );
}
