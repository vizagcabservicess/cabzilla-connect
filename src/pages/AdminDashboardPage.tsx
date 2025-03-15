
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { authAPI, bookingAPI, fareAPI } from '@/services/api';
import { AdminBookingsList } from '@/components/admin/AdminBookingsList';
import { FareManagement } from '@/components/admin/FareManagement';
import { VehiclePricingManagement } from '@/components/admin/VehiclePricingManagement';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
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
    
    setIsLoading(false);
  }, [navigate, toast]);

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
          <p className="text-gray-500">Manage bookings, pricing and fares</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>User Dashboard</Button>
          <Button onClick={() => navigate('/')}>Book New Cab</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹-</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="tour-fares">Tour Fares</TabsTrigger>
          <TabsTrigger value="pricing">Vehicle Pricing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings">
          <AdminBookingsList />
        </TabsContent>
        
        <TabsContent value="tour-fares">
          <FareManagement />
        </TabsContent>
        
        <TabsContent value="pricing">
          <VehiclePricingManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
