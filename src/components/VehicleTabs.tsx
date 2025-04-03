
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VehicleManagement } from './VehicleManagement';
import { directVehicleOperation, fixDatabaseTables, isPreviewMode } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface VehicleTabsProps {
  vehicleId: string;
}

export const VehicleTabs: React.FC<VehicleTabsProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!vehicleId) {
        setLoaded(true);
        return;
      }
      
      try {
        setError(null);
        console.log(`Loading data for vehicle: ${vehicleId}`);
        
        // Check if the vehicle exists first
        const response = await directVehicleOperation(`api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`, 'GET');
        console.log('Vehicle check result:', response);
        
        if (response && response.vehicles && response.vehicles.length > 0) {
          setLoaded(true);
        } else {
          if (isPreviewMode()) {
            console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
            setLoaded(true);
            return;
          }
          
          setError('Failed to load vehicle data. The vehicle may not exist.');
          
          // Try to fix database tables
          tryFixDatabase();
        }
      } catch (err) {
        console.error('Error loading vehicle data:', err);
        
        if (isPreviewMode()) {
          console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
          setLoaded(true);
          return;
        }
        
        setError('Failed to load vehicle data. The vehicle may not exist.');
        
        // Try to fix database tables
        tryFixDatabase();
      }
    };

    const tryFixDatabase = async () => {
      try {
        if (isFixing) return;
        
        setIsFixing(true);
        toast.info('Attempting to fix database tables...');
        
        const fixed = await fixDatabaseTables();
        
        if (fixed) {
          toast.success('Database tables fixed successfully. Try again.');
          // Try loading data again
          try {
            const vehicleData = await directVehicleOperation(`api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`, 'GET');
            console.log('Vehicle check result after database fix:', vehicleData);
            setLoaded(true);
            setError(null);
          } catch (loadErr) {
            console.error('Error loading vehicle data after fix:', loadErr);
          }
        } else {
          // Even if fix fails, still show the management screen in preview mode
          if (isPreviewMode()) {
            console.log('In preview mode, proceeding despite database fix failure');
            setLoaded(true);
            setError(null);
          } else {
            toast.error('Could not fix database tables.');
          }
        }
      } catch (fixErr) {
        console.error('Error fixing database tables:', fixErr);
        
        // Even if fix fails, still show the management screen in preview mode
        if (isPreviewMode()) {
          setLoaded(true);
          setError(null);
        }
      } finally {
        setIsFixing(false);
      }
    };

    loadData();
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
