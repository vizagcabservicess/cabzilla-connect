import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddVehicleForm } from '@/components/admin/AddVehicleForm';
import { VehicleManagement as AdminVehicleManagement } from '@/components/admin/VehicleManagement';

export function VehicleManagement() {
  const [activeTab, setActiveTab] = useState("list");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Function to trigger refresh of the vehicle list
  const refreshVehicleList = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab("list");
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Vehicle Management</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Vehicle List</TabsTrigger>
          <TabsTrigger value="add">Add New Vehicle</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Available Vehicles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div key={refreshTrigger}>
                  <div className="admin-vehicle-management">
                    <AdminVehicleManagement />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add">
          <AddVehicleForm onSuccess={refreshVehicleList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VehicleManagement;
