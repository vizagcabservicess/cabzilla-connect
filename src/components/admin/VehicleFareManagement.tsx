
import React, { useState } from 'react';
import { VehicleTripFaresForm } from './VehicleTripFaresForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function VehicleFareManagement() {
  const [activeTab, setActiveTab] = useState<'outstation' | 'local' | 'airport'>('outstation');

  const handleSuccess = () => {
    // Refresh or update data after successful operation
    console.log('Fare updated successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vehicle Fare Management</h1>
        <p className="text-gray-600">Manage pricing for different trip types and vehicle categories</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'outstation' | 'local' | 'airport')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="outstation">Outstation Fares</TabsTrigger>
          <TabsTrigger value="local">Local Fares</TabsTrigger>
          <TabsTrigger value="airport">Airport Fares</TabsTrigger>
        </TabsList>

        <TabsContent value="outstation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Outstation Trip Fares</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleTripFaresForm tripType="outstation" onSuccess={handleSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="local" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Local Trip Fares</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleTripFaresForm tripType="local" onSuccess={handleSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="airport" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Airport Transfer Fares</CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleTripFaresForm tripType="airport" onSuccess={handleSuccess} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
