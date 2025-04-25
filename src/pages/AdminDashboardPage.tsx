import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Database, Settings } from 'lucide-react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminOrdersChart } from '@/components/admin/AdminOrdersChart';
import { bookingAPI } from '@/services/api';
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await bookingAPI.getAdminDashboardMetrics('week');
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-6 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back, Admin</p>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
            <Link to="/admin/database">
              <Button variant="outline" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database
              </Button>
            </Link>
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsContent value="dashboard" className="space-y-6">
            <AdminStatsCards isLoading={isLoading} metrics={dashboardData} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Orders & Profits</h3>
                      <p className="text-sm text-gray-500">Monthly performance</p>
                    </div>
                    <Button variant="outline" size="sm">Monthly</Button>
                  </div>
                  <AdminOrdersChart data={dashboardData?.monthlyData} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">Total Income</h3>
                    <p className="text-sm text-gray-500">This month</p>
                  </div>
                  
                  <div className="text-3xl font-bold mb-6">
                    ₹{dashboardData?.totalRevenue?.toLocaleString('en-IN') || '0'}
                  </div>
                  
                  <div className="space-y-4">
                    {dashboardData?.revenueBreakdown?.map((item) => (
                      <div key={item.service} className="flex justify-between items-center">
                        <span className="text-gray-600">{item.service}</span>
                        <span className="font-medium">₹{item.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="bookings">
            <AdminBookingsList />
          </TabsContent>
          
          <TabsContent value="vehicles">
            <Tabs defaultValue="management">
              <TabsList className="mb-4">
                <TabsTrigger value="management">Vehicle Types</TabsTrigger>
                <TabsTrigger value="pricing">Vehicle Pricing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="management">
                <VehicleManagement />
              </TabsContent>
              
              <TabsContent value="pricing">
                <VehiclePricingManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="fares">
            <Tabs defaultValue="outstation">
              <TabsList className="mb-4">
                <TabsTrigger value="outstation">Outstation</TabsTrigger>
                <TabsTrigger value="local">Local Package</TabsTrigger>
                <TabsTrigger value="airport">Airport</TabsTrigger>
                <TabsTrigger value="all">All Fares</TabsTrigger>
              </TabsList>
              
              <TabsContent value="outstation">
                <OutstationFareManagement />
              </TabsContent>
              
              <TabsContent value="local">
                <LocalFareManagement />
              </TabsContent>
              
              <TabsContent value="airport">
                <AirportFareManagement />
              </TabsContent>
              
              <TabsContent value="all">
                <FareManagement />
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
          
          <TabsContent value="drivers">
            <DriverManagement />
          </TabsContent>
          
          <TabsContent value="reports">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Reports</h3>
                <p className="text-gray-500">View and generate reports</p>
                <p className="mt-4">Reporting functionality coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
