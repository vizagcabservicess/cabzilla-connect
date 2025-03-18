import { useState, useEffect, useCallback } from 'react';
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
  BarChart2, PieChart as PieChartIcon, Calendar, RefreshCcw, Settings,
  CalendarClock, CircleDollarSign, TrendingUp, BadgeCheck, UserCog, ShieldAlert
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserManagement } from '@/components/admin/UserManagement';
import { NetworkStatusMonitor } from '@/components/NetworkStatusMonitor';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    activeRides: 0,
    totalRevenue: 0,
    availableDrivers: 0,
    busyDrivers: 0,
    avgRating: 0,
    upcomingRides: 0
  });
  const [revenueData, setRevenueData] = useState([
    { name: 'Jan', revenue: 35000 },
    { name: 'Feb', revenue: 42000 },
    { name: 'Mar', revenue: 38000 },
    { name: 'Apr', revenue: 50000 },
    { name: 'May', revenue: 55000 },
    { name: 'Jun', revenue: 48000 }
  ]);
  const [vehicleDistribution, setVehicleDistribution] = useState([
    { name: 'Sedan', value: 35 },
    { name: 'SUV', value: 25 },
    { name: 'Hatchback', value: 20 },
    { name: 'Luxury', value: 10 },
    { name: 'Tempo', value: 10 }
  ]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const fetchDashboardData = useCallback(async () => {
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
    
    try {
      setIsLoading(true);
      const metricsData = await bookingAPI.getAdminDashboardMetrics(selectedPeriod);
      setMetrics(metricsData);
      
      // Simulate revenue data updates (in a real app, this would be fetched from the API)
      const updatedRevenueData = [...revenueData];
      updatedRevenueData[5].revenue = metricsData.totalRevenue * (0.8 + Math.random() * 0.4);
      setRevenueData(updatedRevenueData);
      
      // Simulate vehicle distribution updates
      const newVehicleDistribution = vehicleDistribution.map(item => ({
        ...item, 
        value: item.value + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3)
      }));
      setVehicleDistribution(newVehicleDistribution);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, revenueData, vehicleDistribution, selectedPeriod]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up automatic refreshing if enabled
    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        fetchDashboardData();
      }, 60000); // Refresh every minute
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchDashboardData, autoRefresh]);

  if (isLoading && !metrics.totalBookings) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <NetworkStatusMonitor />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage all aspects of your taxi service</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={(value: 'today' | 'week' | 'month') => setSelectedPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            className={autoRefresh ? "text-green-600" : ""}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>User Dashboard</Button>
          <Button onClick={() => navigate('/')}>Book New Cab</Button>
        </div>
      </div>

      {/* Dashboard Metrics with period parameter */}
      <DashboardMetrics 
        initialMetrics={metrics} 
        period={selectedPeriod} 
        onRefresh={fetchDashboardData} 
      />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Revenue Trend (Last 6 Months)
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
                <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
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
                <Tooltip formatter={(value) => [`${value} vehicles`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="bookings" className="flex items-center gap-1"><Car className="h-4 w-4" /> Bookings</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1"><UserCog className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-1"><Users className="h-4 w-4" /> Drivers</TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-1"><Users className="h-4 w-4" /> Customers</TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1"><BarChart2 className="h-4 w-4" /> Reports</TabsTrigger>
          <TabsTrigger value="financials" className="flex items-center gap-1"><CircleDollarSign className="h-4 w-4" /> Financials</TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-1"><Car className="h-4 w-4" /> Vehicles</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings">
          <AdminBookingsList />
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
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
        
        <TabsContent value="financials">
          <Tabs defaultValue="revenue">
            <TabsList className="mb-4">
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="payouts">Driver Payouts</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="revenue">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">This feature is under development</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="payouts">
              <Card>
                <CardHeader>
                  <CardTitle>Driver Payouts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">This feature is under development</p>
                </CardContent>
              </Card>
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
          </Tabs>
        </TabsContent>
        
        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is under development</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <AdminNotifications />
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This feature is under development</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
