import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { VehicleLoadingError } from '@/components/VehicleLoadingError';
import { PaymentFailedBanner, CustomerComplaintBanner, BookingCancelledBanner, SystemNotificationBanner } from '@/components/NotificationBanner';
import { LayoutDashboard, Calendar, Car, DollarSign, Users, UserCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { fixDatabaseTables, forceRefreshVehicles } from '@/utils/apiHelper';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [activeFareTab, setActiveFareTab] = useState<string>("outstation");
  const [showError, setShowError] = useState(true);
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'payment', visible: true },
    { id: 2, type: 'complaint', visible: true },
    { id: 3, type: 'booking', visible: true },
    { id: 4, type: 'system', visible: true },
  ]);
  
  const handleCloseNotification = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, visible: false } : n
    ));
  };
  
  const handleTryAgain = async () => {
    toast.info('Refreshing vehicle data...');
    try {
      await forceRefreshVehicles();
      toast.success('Vehicle data refreshed successfully');
      setShowError(false);
    } catch (error) {
      toast.error('Failed to refresh vehicle data');
    }
  };
  
  const handleFixDatabase = async () => {
    toast.info('Fixing database...');
    try {
      const success = await fixDatabaseTables();
      if (success) {
        toast.success('Database fixed successfully');
        setShowError(false);
      } else {
        toast.error('Failed to fix database');
      }
    } catch (error) {
      toast.error('Failed to fix database');
    }
  };
  
  return (
    <div className="container py-8">
      {/* Notification Banners */}
      <div className="space-y-4 mb-8">
        {notifications[0].visible && (
          <PaymentFailedBanner
            customer="Sunita Reddy"
            booking="#BK12345"
            amount="₹850"
            time="3 hours ago"
            onClose={() => handleCloseNotification(1)}
          />
        )}
        
        {notifications[1].visible && (
          <CustomerComplaintBanner
            customer="Venkat Rao"
            issue="Driver behavior"
            booking="#BK12340"
            time="5 hours ago"
            onClose={() => handleCloseNotification(2)}
          />
        )}
        
        {notifications[2].visible && (
          <BookingCancelledBanner
            customer="Priya Sharma"
            booking="#BK12338"
            status="Refund processed"
            time="8 hours ago"
            onClose={() => handleCloseNotification(3)}
          />
        )}
        
        {notifications[3].visible && (
          <SystemNotificationBanner
            title="System maintenance completed"
            message="Server maintenance completed successfully. All systems operational."
            time="1 day ago"
            onClose={() => handleCloseNotification(4)}
          />
        )}
      </div>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-7 w-full mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicles</span>
          </TabsTrigger>
          <TabsTrigger value="fares" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Fares</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Drivers</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Dashboard Content */}
        <TabsContent value="dashboard">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
              <p>Welcome to your admin dashboard. Use the tabs above to navigate.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Vehicles Content */}
        <TabsContent value="vehicles">
          {showError ? (
            <VehicleLoadingError 
              onRetry={handleTryAgain}
              onFixDatabase={handleFixDatabase}
            />
          ) : (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4">Vehicle Management</h2>
                <p>Vehicle data loaded successfully.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Fares Content */}
        <TabsContent value="fares">
          <Tabs value={activeFareTab} onValueChange={setActiveFareTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="outstation">Outstation</TabsTrigger>
              <TabsTrigger value="local">Local Package</TabsTrigger>
              <TabsTrigger value="airport">Airport</TabsTrigger>
              <TabsTrigger value="all">All Fares</TabsTrigger>
            </TabsList>
            
            {showError ? (
              <VehicleLoadingError 
                onRetry={handleTryAgain}
                onFixDatabase={handleFixDatabase}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Fare Management</h2>
                  <p>Fares content for {activeFareTab} trips.</p>
                </CardContent>
              </Card>
            )}
          </Tabs>
        </TabsContent>
        
        {/* Other tabs would go here */}
      </Tabs>
    </div>
  );
}
