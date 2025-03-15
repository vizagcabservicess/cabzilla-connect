
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Car, Users, DollarSign, Star, Clock, AlertTriangle, Bell, MapPin, 
  BarChart2, PieChart as PieChartIcon, Calendar
} from "lucide-react";
import { authAPI, bookingAPI, fareAPI } from '@/services/api';
import { AdminBookingsList } from '@/components/admin/AdminBookingsList';
import { FareManagement } from '@/components/admin/FareManagement';
import { VehiclePricingManagement } from '@/components/admin/VehiclePricingManagement';
import { DriverManagement } from '@/components/admin/DriverManagement';
import { CustomerManagement } from '@/components/admin/CustomerManagement';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { ReportingAnalytics } from '@/components/admin/ReportingAnalytics';
import { AdminNotifications } from '@/components/admin/AdminNotifications';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalBookings: 120,
    activeRides: 10,
    totalRevenue: 50000,
    availableDrivers: 15,
    busyDrivers: 8,
    avgRating: 4.7,
    upcomingRides: 25
  });
  
  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    if (!authAPI.isAdmin()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }
    
    // Simulation of fetching metrics
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, [navigate, toast]);

  // Sample data for charts
  const revenueData = [
    { name: 'Jan', revenue: 35000 },
    { name: 'Feb', revenue: 42000 },
    { name: 'Mar', revenue: 38000 },
    { name: 'Apr', revenue: 50000 },
    { name: 'May', revenue: 55000 },
    { name: 'Jun', revenue: 48000 }
  ];

  const vehicleDistribution = [
    { name: 'Sedan', value: 35 },
    { name: 'SUV', value: 25 },
    { name: 'Hatchback', value: 20 },
    { name: 'Luxury', value: 10 },
    { name: 'Tempo', value: 10 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage all aspects of your taxi service</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>User Dashboard</Button>
          <Button onClick={() => navigate('/')}>Book New Cab</Button>
        </div>
      </div>

      {/* Dashboard Metrics */}
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart2 className="h-5 w-5" /> Revenue Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" /> Vehicle Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="bookings" className="flex items-center gap-1"><Car className="h-4 w-4" /> Bookings</TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-1"><Users className="h-4 w-4" /> Drivers</TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1"><Users className="h-4 w-4" /> Customers</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart2 className="h-4 w-4" /> Reports</TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-1"><DollarSign className="h-4 w-4" /> Pricing</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings">
          <AdminBookingsList />
        </TabsContent>
        
        <TabsContent value="drivers">
          <DriverManagement />
        </TabsContent>
        
        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>
        
        <TabsContent value="reports">
          <ReportingAnalytics />
        </TabsContent>
        
        <TabsContent value="pricing">
          <Tabs defaultValue="tour-fares">
            <TabsList className="mb-4">
              <TabsTrigger value="tour-fares">Tour Fares</TabsTrigger>
              <TabsTrigger value="vehicle-pricing">Vehicle Pricing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tour-fares">
              <FareManagement />
            </TabsContent>
            
            <TabsContent value="vehicle-pricing">
              <VehiclePricingManagement />
            </TabsContent>
          </Tabs>
        </TabsContent>
        
        <TabsContent value="notifications">
          <AdminNotifications />
        </TabsContent>
      </Tabs>
    </div>
  );
}
