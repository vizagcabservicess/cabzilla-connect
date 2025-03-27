
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FareManagement } from "@/components/admin/FareManagement";
import { AirportFareManagement } from "@/components/admin/AirportFareManagement";
import { LocalFareManagement } from "@/components/admin/LocalFareManagement";
import { OutstationFareManagement } from "@/components/admin/OutstationFareManagement";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";
import { AdminBookingsList } from "@/components/admin/AdminBookingsList";
import { VehicleManagement } from "@/components/admin/VehicleManagement";
import { VehiclePricingManagement } from "@/components/admin/VehiclePricingManagement";
import { UserManagement } from "@/components/admin/UserManagement";
import { DriverManagement } from "@/components/admin/DriverManagement";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { Database, CreditCard, Car, CalendarDays, Users, Map, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">Manage bookings, users, vehicles, and fare prices</p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/admin/database">
            <Button variant="outline" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Management
            </Button>
          </Link>
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
      
      <AdminNotifications />
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
          <TabsTrigger value="dashboard" className="flex gap-1 items-center">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex gap-1 items-center">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex gap-1 items-center">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicles</span>
          </TabsTrigger>
          <TabsTrigger value="fares" className="flex gap-1 items-center">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Fares</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex gap-1 items-center">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex gap-1 items-center">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Drivers</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex gap-1 items-center">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <DashboardMetrics />
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
            <CardHeader>
              <CardTitle>Reports</CardTitle>
              <CardDescription>View and generate reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Reporting functionality coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
