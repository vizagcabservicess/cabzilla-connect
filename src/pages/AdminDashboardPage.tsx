
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FareManagement } from "@/components/admin/FareManagement";
import AirportFareManagement from "@/components/admin/AirportFareManagement";
import { LocalFareManagement } from "@/components/admin/LocalFareManagement";
import OutstationFareManagement from "@/components/admin/OutstationFareManagement";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";
import { VehicleManagement } from '@/components/admin/VehicleManagement';
import { VehiclePricingManagement } from "@/components/admin/VehiclePricingManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { DriverManagement } from "@/components/admin/DriverManagement";
import { Database, Settings, LayoutDashboard, LogOut, 
  BarChart3, User, FileText, Tag, BellRing, CreditCard, Car, CalendarDays, Users, 
  Map, Fuel, Wrench, Book } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminOrdersChart } from '@/components/admin/AdminOrdersChart';
import { AdminNotifications } from '@/components/admin/AdminNotifications';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sample data for recent orders
  const recentOrders = [
    { id: 'ORD-#5428', customer: 'Anil Kumar', date: '25 Apr 2025', status: 'Completed', amount: 1850 },
    { id: 'ORD-#5427', customer: 'Priya Sharma', date: '25 Apr 2025', status: 'In Progress', amount: 2400 },
    { id: 'ORD-#5426', customer: 'Raj Patel', date: '24 Apr 2025', status: 'Pending', amount: 1250 },
    { id: 'ORD-#5425', customer: 'Sunita Reddy', date: '24 Apr 2025', status: 'Completed', amount: 3200 },
  ];
  
  // Sample data for fleet management (quick overview)
  const fleetSummary = {
    totalVehicles: 12,
    activeVehicles: 10,
    inMaintenance: 2
  };
  
  // Sample data for fuel management (quick overview)
  const fuelSummary = {
    totalCost: 42500,
    totalLiters: 396.5,
    averagePrice: 107.2
  };
  
  // Sample data for maintenance (quick overview)
  const maintenanceSummary = {
    totalCost: 54500,
    pendingServices: 3,
    completedServices: 18
  };
  
  // Sample data for financial ledger (quick overview)
  const ledgerSummary = {
    income: 285000,
    expenses: 152000,
    balance: 133000
  };

  // Function to get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-amber-100 text-amber-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

        {/* Dashboard Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Row */}
            <AdminStatsCards />

            {/* Performance Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Orders Chart */}
              <Card className="col-span-2">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Orders & Profits</h3>
                      <p className="text-sm text-gray-500">Monthly performance</p>
                    </div>
                    <Button variant="outline" size="sm">Monthly</Button>
                  </div>
                  <AdminOrdersChart />
                </CardContent>
              </Card>

              {/* Income Summary */}
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold">Total Income</h3>
                    <p className="text-sm text-gray-500">This month</p>
                  </div>
                  
                  <div className="text-3xl font-bold mb-6">₹245,000</div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Taxi Services</span>
                      <span className="font-medium">₹178,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Airport Transfer</span>
                      <span className="font-medium">₹42,500</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Local Packages</span>
                      <span className="font-medium">₹24,000</span>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 bg-blue-600 rounded-full w-3/4"></div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm">
                      <span className="text-gray-600">Current target</span>
                      <span className="font-medium">75% achieved</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Orders */}
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Recent Orders</h3>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.date}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">₹{order.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            {/* Original Dashboard Metrics */}
            <DashboardMetrics />
          </TabsContent>
          
          <TabsContent value="bookings">
            <AdminBookingsList />
          </TabsContent>
          
          <TabsContent value="vehicles">
            <Tabs defaultValue="management" className="w-full">
              <TabsList className="mb-4 w-full justify-start">
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
            <Tabs defaultValue="outstation" className="w-full">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="outstation" className="mr-1">Outstation</TabsTrigger>
                <TabsTrigger value="local" className="mr-1">Local Package</TabsTrigger>
                <TabsTrigger value="airport" className="mr-1">Airport</TabsTrigger>
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
          
          <TabsContent value="fleet">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Fleet Management Overview</h3>
                  <Link to="/admin/fleet">
                    <Button>Go to Fleet Management</Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Vehicles</p>
                    <h3 className="text-2xl font-bold">{fleetSummary.totalVehicles}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Active Vehicles</p>
                    <h3 className="text-2xl font-bold">{fleetSummary.activeVehicles}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">In Maintenance</p>
                    <h3 className="text-2xl font-bold">{fleetSummary.inMaintenance}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center py-6">
              <Link to="/admin/fleet">
                <Button size="lg">Manage Fleet</Button>
              </Link>
            </div>
          </TabsContent>
          
          <TabsContent value="fuel">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Fuel Management Overview</h3>
                  <Link to="/admin/fuel">
                    <Button>Go to Fuel Management</Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Fuel Cost (This Month)</p>
                    <h3 className="text-2xl font-bold">₹{fuelSummary.totalCost.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Liters</p>
                    <h3 className="text-2xl font-bold">{fuelSummary.totalLiters.toFixed(1)} L</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Average Price Per Liter</p>
                    <h3 className="text-2xl font-bold">₹{fuelSummary.averagePrice.toFixed(2)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center py-6">
              <Link to="/admin/fuel">
                <Button size="lg">Manage Fuel Records</Button>
              </Link>
            </div>
          </TabsContent>
          
          <TabsContent value="maintenance">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Vehicle Maintenance Overview</h3>
                  <Link to="/admin/maintenance">
                    <Button>Go to Maintenance</Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Maintenance Cost</p>
                    <h3 className="text-2xl font-bold">₹{maintenanceSummary.totalCost.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Pending Services</p>
                    <h3 className="text-2xl font-bold">{maintenanceSummary.pendingServices}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Completed Services</p>
                    <h3 className="text-2xl font-bold">{maintenanceSummary.completedServices}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center py-6">
              <Link to="/admin/maintenance">
                <Button size="lg">Manage Maintenance</Button>
              </Link>
            </div>
          </TabsContent>
          
          <TabsContent value="ledger">
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Financial Ledger Overview</h3>
                  <Link to="/admin/ledger">
                    <Button>Go to Ledger</Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Income</p>
                    <h3 className="text-2xl font-bold text-green-600">₹{ledgerSummary.income.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Total Expenses</p>
                    <h3 className="text-2xl font-bold text-red-600">₹{ledgerSummary.expenses.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <p className="text-sm text-gray-500">Net Balance</p>
                    <h3 className="text-2xl font-bold text-green-600">₹{ledgerSummary.balance.toFixed(2)}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="text-center py-6">
              <Link to="/admin/ledger">
                <Button size="lg">Manage Ledger</Button>
              </Link>
            </div>
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
