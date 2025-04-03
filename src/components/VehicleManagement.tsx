
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { directVehicleOperation, fixDatabaseTables, isPreviewMode } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("local");
  const [refreshCount, setRefreshCount] = useState(0);
  const maxAttempts = 3;
  
  // Check if vehicle exists
  useEffect(() => {
    const checkVehicle = async () => {
      // Only try to check a few times to avoid infinite loops
      if (refreshCount >= maxAttempts) {
        console.log(`Max refresh attempts (${maxAttempts}) reached, skipping vehicle check`);
        return;
      }

      try {
        // Add timestamp to URL to prevent caching
        const endpoint = `api/admin/check-vehicle.php?id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
        console.log(`Checking vehicle with endpoint: ${endpoint}`);
        
        const result = await directVehicleOperation(endpoint, 'GET', {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true'
          }
        });
        
        console.log('Vehicle check result:', result);
        
        if (result && result.status === 'success') {
          setError(null);
        } else {
          setError(`Could not verify vehicle with ID: ${vehicleId}. Some features might not work correctly.`);
        }
      } catch (err) {
        console.error('Error checking vehicle:', err);
        setError(`Could not verify vehicle with ID: ${vehicleId}. Some features might not work correctly.`);
      } finally {
        // Increment refresh count regardless of outcome
        setRefreshCount(prev => prev + 1);
      }
    };
    
    if (vehicleId) {
      checkVehicle();
    }
  }, [vehicleId, refreshCount]);
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      toast.info('Attempting to fix database...');
      console.log('Fixing database...');
      
      // Clear the vehicle data cache before fixing the database
      clearVehicleDataCache();
      
      const fixed = await fixDatabaseTables();
      
      if (fixed) {
        toast.success('Database fixed successfully');
        setError(null);
        // Reset refresh count to trigger a new check
        setRefreshCount(0);
      } else {
        toast.error('Failed to fix database');
        
        // Try alternate method
        try {
          console.log('Trying alternate fix method...');
          const result = await directVehicleOperation('api/admin/fix-database.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true'
            }
          });
          
          if (result && result.status === 'success') {
            toast.success('Database fixed successfully with alternate method');
            setError(null);
            setRefreshCount(0);
          } else {
            toast.error('All database fix attempts failed');
          }
        } catch (altError) {
          console.error('Error with alternate fix:', altError);
          toast.error('All database fix attempts failed');
        }
      }
    } catch (err) {
      console.error('Error fixing database:', err);
      toast.error('Failed to fix database');
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFixDatabase}
              disabled={isFixing}
            >
              {isFixing ? 'Fixing...' : 'Fix Database'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {!vehicleId && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium">No Vehicle Selected</h3>
                <p className="text-muted-foreground mt-1">
                  Please select a vehicle to manage its fare settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {vehicleId && (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
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
      )}
    </div>
  );
};
