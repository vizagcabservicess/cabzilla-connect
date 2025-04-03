
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VehicleManagement } from './VehicleManagement';
import { directVehicleOperation, fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface VehicleTabsProps {
  vehicleId: string;
}

export const VehicleTabs: React.FC<VehicleTabsProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        // Check if the vehicle exists first
        const vehicleData = await directVehicleOperation(`api/admin/check-vehicle.php?id=${vehicleId}`, 'GET');
        console.log('Vehicle check result:', vehicleData);
        setLoaded(true);
      } catch (err) {
        console.error('Error loading vehicle data:', err);
        setError('Failed to load vehicle data. The vehicle may not exist.');
        
        // Try to fix database tables
        try {
          toast.info('Attempting to fix database tables...');
          const fixed = await fixDatabaseTables();
          if (fixed) {
            toast.success('Database tables fixed successfully. Try again.');
          } else {
            toast.error('Could not fix database tables.');
          }
        } catch (fixErr) {
          console.error('Error fixing database tables:', fixErr);
        }
      }
    };

    if (vehicleId) {
      loadData();
    }
  }, [vehicleId]);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!vehicleId) {
    return (
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please select a vehicle to manage.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Vehicle ID: {vehicleId}</CardTitle>
      </CardHeader>
      <CardContent>
        {loaded ? (
          <VehicleManagement vehicleId={vehicleId} />
        ) : (
          <p>Loading vehicle data...</p>
        )}
      </CardContent>
    </Card>
  );
};
