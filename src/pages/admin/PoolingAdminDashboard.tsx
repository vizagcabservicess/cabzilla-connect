
import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PoolingRidesManager from '@/components/pooling/admin/PoolingRidesManager';
import { PoolingBookingsManager } from '@/components/pooling/admin/PoolingBookingsManager';
import PoolingAnalytics from '@/components/pooling/admin/PoolingAnalytics';
import PoolingSettings from '@/components/pooling/admin/PoolingSettings';
import DisputeManager from '@/components/pooling/admin/DisputeManager';
import ProviderManager from '@/components/pooling/admin/ProviderManager';
import { CancellationPolicyManager } from '@/components/pooling/admin/CancellationPolicyManager';
import { Car, Users, TrendingUp, Settings, AlertTriangle, UserCheck, XCircle } from 'lucide-react';
import { Booking } from '@/types/api';

const PoolingAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock bookings data for the PoolingBookingsManager
  const mockBookings: Booking[] = [];

  const handleUpdateBooking = async (id: number, updates: Partial<Booking>) => {
    console.log('Updating booking:', id, updates);
  };

  const handleCreatePooling = async (bookingIds: number[]) => {
    console.log('Creating pooling for bookings:', bookingIds);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Pooling Administration
          </h1>
          <p className="text-gray-600">
            Comprehensive management system for ride sharing and bus booking services
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rides" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Rides
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Providers
            </TabsTrigger>
            <TabsTrigger value="disputes" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Cancellations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <PoolingAnalytics />
          </TabsContent>

          <TabsContent value="rides" className="space-y-6">
            <PoolingRidesManager />
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <PoolingBookingsManager 
              bookings={mockBookings}
              onUpdateBooking={handleUpdateBooking}
              onCreatePooling={handleCreatePooling}
            />
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <ProviderManager />
          </TabsContent>

          <TabsContent value="disputes" className="space-y-6">
            <DisputeManager />
          </TabsContent>

          <TabsContent value="cancellations" className="space-y-6">
            <CancellationPolicyManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <PoolingSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PoolingAdminDashboard;
