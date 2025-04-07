
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface VehicleInfoProps {
  vehicleId: string;
  vehicleData: any;
}

export const VehicleInfo: React.FC<VehicleInfoProps> = ({ vehicleId, vehicleData }) => {
  if (!vehicleData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle: {vehicleId}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No vehicle data available. Vehicle may not be synced in the database.
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground">ID: {vehicleId}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>{vehicleData.name || vehicleId}</span>
          <Badge>{vehicleData.active ? 'Active' : 'Inactive'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm">Vehicle ID</h4>
            <p>{vehicleId}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Category</h4>
            <p>{vehicleData.category || 'Unknown'}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Capacity</h4>
            <p>{vehicleData.capacity || 'Unknown'} persons</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Luggage</h4>
            <p>{vehicleData.luggage || 'Unknown'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
