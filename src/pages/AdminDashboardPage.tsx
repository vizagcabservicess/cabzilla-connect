
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from '@/components/admin/AdminHeader';
import { TripTypeSelector } from '@/components/TripTypeSelector';
import VehicleManagement from '@/components/admin/VehicleManagement';
import AirportFareManagement from '@/components/admin/AirportFareManagement';
import LocalFareManagement from '@/components/admin/LocalFareManagement';
import OutstationFareManagement from '@/components/admin/OutstationFareManagement';
import BookingManagement from '@/components/admin/BookingManagement';
import { TripType } from '@/lib/tripTypes';

const AdminDashboardPage = () => {
  const [selectedTripType, setSelectedTripType] = useState<TripType>('outstation');

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminHeader />
      
      <div className="mt-8">
        <Tabs defaultValue="vehicles" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="fares">Fares</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vehicles">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Management</CardTitle>
                <CardDescription>Add, update, or remove vehicles from your fleet.</CardDescription>
              </CardHeader>
              <CardContent>
                <VehicleManagement />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="fares">
            <Card>
              <CardHeader>
                <CardTitle>Fare Management</CardTitle>
                <CardDescription>Manage pricing for different trip types.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <TripTypeSelector 
                    selectedTripType={selectedTripType}
                    onSelectTripType={setSelectedTripType}
                    showTourOption={false}
                    showLocalOption={true}
                    showAirportOption={true}
                  />
                </div>
                
                {selectedTripType === 'outstation' && <OutstationFareManagement />}
                {selectedTripType === 'local' && <LocalFareManagement />}
                {selectedTripType === 'airport' && <AirportFareManagement />}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>View and manage customer bookings.</CardDescription>
              </CardHeader>
              <CardContent>
                <BookingManagement />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>View booking and revenue reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Reports dashboard coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
