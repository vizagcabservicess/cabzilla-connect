
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local">Local Fares</TabsTrigger>
          <TabsTrigger value="airport">Airport Fares</TabsTrigger>
        </TabsList>
        <TabsContent value="local">
          <FareManagement vehicleId={vehicleId} fareType="local" />
        </TabsContent>
        <TabsContent value="airport">
          <FareManagement vehicleId={vehicleId} fareType="airport" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
