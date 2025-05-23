
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { directVehicleOperation, fixDatabaseTables, isPreviewMode, forceRefreshVehicles } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
import { initializeDatabaseTables } from '@/services/fareManagementService';

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("local");
  const [refreshCount, setRefreshCount] = useState(0);
  const maxAttempts = 3;
  
  // Initialize database tables
  const initializeDatabase = useCallback(async () => {
    if (isInitializingDB) return;
    
    setIsInitializingDB(true);
    setError(null);
    
    try {
      toast.info('Initializing database tables...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      // Use the initializeDatabaseTables function
      const success = await initializeDatabaseTables();
      
      if (success) {
        toast.success('Database tables initialized successfully');
        setError(null);
        // Reset refresh count to trigger a new check
        setRefreshCount(0);
        
        // Force a reload of vehicles after fixing the database
        await resyncVehicles();
      } else {
        toast.error('Failed to initialize database tables');
        
        // Try alternate method - direct API call
        try {
          console.log('Trying alternate init method...');
          const result = await directVehicleOperation('api/admin/db_setup.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (result && result.status === 'success') {
            toast.success('Database initialized successfully with alternate method');
            setError(null);
            setRefreshCount(0);
            
            // Force a reload of vehicles after fixing the database
            await resyncVehicles();
          } else {
            // Try one last method - reload from persistent storage
            await resyncVehicles();
          }
        } catch (altError) {
          console.error('Error with alternate init:', altError);
          // Try resyncing as a last resort
          await resyncVehicles();
        }
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      toast.error('Failed to initialize database tables');
      // Try resyncing as a last resort
      await resyncVehicles();
    } finally {
      setIsInitializingDB(false);
    }
  }, [isInitializingDB]);
  
  // Function to force a reload of vehicles from persistent storage
  const resyncVehicles = useCallback(async () => {
    if (isResyncing) return;
    
    try {
      setIsResyncing(true);
      toast.info('Syncing vehicle data from persistent storage...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      // Use the enhanced forceRefreshVehicles function
      const success = await forceRefreshVehicles();
      
      if (success) {
        toast.success(`Successfully resynced vehicles from persistent storage`);
        setRefreshCount(prev => prev + 1); // Increment to trigger a fresh check
        setError(null); // Clear any errors
      } else {
        // Try direct API call as fallback
        try {
          const response = await directVehicleOperation(
            `api/admin/reload-vehicles.php?_t=${Date.now()}`, 
            'GET',
            {
              headers: {
                'X-Admin-Mode': 'true',
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            }
          );
          
          console.log('Vehicle resync result:', response);
          
          if (response && response.status === 'success') {
            toast.success(`Successfully resynced ${response.count || 0} vehicles from persistent storage`);
            setRefreshCount(prev => prev + 1); // Increment to trigger a fresh check
            setError(null); // Clear any errors
          } else {
            toast.error('Failed to resync vehicles from persistent storage');
          }
        } catch (directError) {
          console.error('Direct API call failed:', directError);
          toast.error('Failed to resync vehicles from persistent storage');
        }
      }
    } catch (err) {
      console.error('Error resyncing vehicles:', err);
      toast.error('Failed to resync vehicles from persistent storage');
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing]);
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      toast.info('Attempting to fix database...');
      console.log('Fixing database...');
      
      // Clear the vehicle data cache before fixing the database
      clearVehicleDataCache();
      
      // First try to initialize database tables
      await initializeDatabase();
      
      // Use the enhanced fixDatabaseTables function
      const fixed = await fixDatabaseTables();
      
      if (fixed) {
        toast.success('Database fixed successfully');
        setError(null);
        // Reset refresh count to trigger a new check
        setRefreshCount(0);
        
        // Force a reload of vehicles after fixing the database
        await resyncVehicles();
      } else {
        toast.error('Failed to fix database');
        
        // Try alternate method - direct API call
        try {
          console.log('Trying alternate fix method...');
          const result = await directVehicleOperation('api/admin/fix-database.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (result && result.status === 'success') {
            toast.success('Database fixed successfully with alternate method');
            setError(null);
            setRefreshCount(0);
            
            // Force a reload of vehicles after fixing the database
            await resyncVehicles();
          } else {
            // Try one last method - reload from persistent storage
            await resyncVehicles();
          }
        } catch (altError) {
          console.error('Error with alternate fix:', altError);
          // Try resyncing as a last resort
          await resyncVehicles();
        }
      }
    } catch (err) {
      console.error('Error fixing database:', err);
      toast.error('Failed to fix database tables');
      // Try resyncing as a last resort
      await resyncVehicles();
    } finally {
      setIsFixing(false);
    }
  };
  
  // Initialize database on component mount
  useEffect(() => {
    const runInitialization = async () => {
      try {
        await initializeDatabase();
      } catch (err) {
        console.error('Failed to initialize database on mount:', err);
      }
    };
    
    runInitialization();
  }, [initializeDatabase]);
  
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
            'X-Debug': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        console.log('Vehicle check result:', result);
        
        if (result && result.status === 'success') {
          setError(null);
        } else {
          setError(`Could not verify vehicle with ID: ${vehicleId}. Some features might not work correctly.`);
          
          // Try resyncing from persistent storage
          await resyncVehicles();
          
          // Check again after resync
          const retryEndpoint = `api/admin/check-vehicle.php?id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
          const retryResult = await directVehicleOperation(retryEndpoint, 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (retryResult && retryResult.status === 'success') {
            setError(null);
          }
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
  }, [vehicleId, refreshCount, resyncVehicles]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFixDatabase}
                disabled={isFixing}
              >
                {isFixing ? 'Fixing...' : 'Fix Database'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resyncVehicles}
                disabled={isResyncing}
              >
                {isResyncing ? 'Syncing...' : 'Resync Data'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={initializeDatabase}
                disabled={isInitializingDB}
              >
                {isInitializingDB ? 'Initializing...' : 'Initialize DB'}
              </Button>
            </div>
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
            <FareManagement vehicleId={vehicleId} fareType="local" key={`local-${refreshCount}`} />
          </TabsContent>
          <TabsContent value="airport">
            <FareManagement vehicleId={vehicleId} fareType="airport" key={`airport-${refreshCount}`} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
