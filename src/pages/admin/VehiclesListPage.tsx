
import React from 'react';
import { VehiclesList } from '@/components/admin/VehiclesList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleManagement } from '@/components/admin/VehicleManagement';

export const VehiclesListPage = () => {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Vehicle Management</h1>
      
      <Tabs defaultValue="list" className="w-full mb-8">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="list">Vehicle List</TabsTrigger>
          <TabsTrigger value="manage">Manage Vehicle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card className="bg-background mb-6">
            <CardHeader>
              <CardTitle>All Vehicles</CardTitle>
              <CardDescription>
                View and manage all vehicles in your fleet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehiclesList />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage">
          <Card className="bg-background mb-6">
            <CardHeader>
              <CardTitle>Manage Vehicle</CardTitle>
              <CardDescription>
                Edit or add vehicle details, pricing, and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VehicleManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VehiclesListPage;
