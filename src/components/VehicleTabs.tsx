
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VehicleManagement } from './VehicleManagement';
import { directVehicleOperation, fixDatabaseTables, isPreviewMode } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataCache';
import { Button } from "@/components/ui/button";

interface VehicleTabsProps {
  vehicleId: string;
}

export const VehicleTabs: React.FC<VehicleTabsProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isSyncingTables, setIsSyncingTables] = useState(false);
  const maxAttempts = 3;

  // Function to force a reload of vehicles from persistent storage
  const resyncVehicles = useCallback(async () => {
    if (isResyncing) return;
    
    try {
      setIsResyncing(true);
      toast.info('Syncing vehicle data from persistent storage...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      // Call the reload-vehicles.php endpoint to force a reload from persistent storage
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
        setRefreshAttempts(0); // Reset attempts counter
        setError(null); // Clear any errors
        
        // Force a refresh of the current view
        setTimeout(() => {
          setLoaded(false);
          setLoaded(true);
        }, 500);
      } else {
        toast.error('Failed to resync vehicles from persistent storage');
      }
    } catch (err) {
      console.error('Error resyncing vehicles:', err);
      toast.error('Failed to resync vehicles from persistent storage');
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing]);
  
  // Function to sync tables
  const handleSyncTables = async () => {
    if (isSyncingTables) return;
    
    setIsSyncingTables(true);
    setError(null);
    
    try {
      toast.info('Syncing database tables...');
      console.log('Syncing database tables...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      // Call the fix-collation endpoint to repair all table collations
      const response = await directVehicleOperation(
        'api/admin/fix-collation.php',
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Debug': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      if (response && response.status === 'success') {
        const count = response.data?.fixedTables?.length || 0;
        toast.success(`Successfully synced ${count} database tables`);
        setError(null);
        setRefreshAttempts(0);
        
        // Force a reload of vehicles after syncing the tables
        await resyncVehicles();
      } else {
        toast.error('Failed to sync database tables');
        console.error('Sync tables response:', response);
      }
    } catch (err) {
      console.error('Error syncing tables:', err);
      toast.error('Failed to sync database tables');
    } finally {
      setIsSyncingTables(false);
    }
  };

  // Function to fix database tables
  const tryFixDatabase = async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    toast.info('Attempting to fix database tables...');
    
    try {
      // Clear the vehicle data cache before fixing
      clearVehicleDataCache();
      
      const fixed = await fixDatabaseTables();
      
      if (fixed) {
        toast.success('Database tables fixed successfully. Try again.');
        // Try loading data again
        try {
          const vehicleData = await directVehicleOperation(
            `api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`,
            'GET',
            {
              headers: {
                'X-Admin-Mode': 'true',
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            }
          );
          console.log('Vehicle check result after database fix:', vehicleData);
          setLoaded(true);
          setError(null);
          
          // Force a resync from persistent storage to ensure we have the latest data
          await resyncVehicles();
        } catch (loadErr) {
          console.error('Error loading vehicle data after fix:', loadErr);
          // Try a resync as a backup plan
          await resyncVehicles();
        }
      } else {
        // Try to resync from persistent storage even if the fix fails
        toast.warning('Database fix not fully successful. Trying to sync from persistent storage...');
        await resyncVehicles();
        
        // Next, try to sync tables
        await handleSyncTables();
        
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
      
      // Try to resync from persistent storage as a fallback
      toast.warning('Database fix failed. Trying to sync from persistent storage...');
      await resyncVehicles();
      
      // Even if fix fails, still show the management screen in preview mode
      if (isPreviewMode()) {
        setLoaded(true);
        setError(null);
      }
    } finally {
      setIsFixing(false);
    }
  };

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
        const response = await directVehicleOperation(
          `api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`, 
          'GET',
          { 
            headers: {
              'X-Admin-Mode': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          }
        );
        
        console.log('Vehicle check result:', response);
        
        if (response && response.vehicles && response.vehicles.length > 0) {
          setLoaded(true);
        } else {
          if (isPreviewMode()) {
            console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
            setLoaded(true);
            return;
          }
          
          // Try to resync from persistent storage before showing error
          await resyncVehicles();
          
          // Check again after resync
          const retryResponse = await directVehicleOperation(
            `api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}`, 
            'GET',
            { 
              headers: {
                'X-Admin-Mode': 'true',
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            }
          );
          
          if (retryResponse && retryResponse.vehicles && retryResponse.vehicles.length > 0) {
            setLoaded(true);
            return;
          }
          
          setError('Failed to load vehicle data. The vehicle may not exist.');
          
          // Try to fix database tables if we haven't exceeded max attempts
          if (refreshAttempts < maxAttempts) {
            setRefreshAttempts(prev => prev + 1);
            tryFixDatabase();
          }
        }
      } catch (err) {
        console.error('Error loading vehicle data:', err);
        
        if (isPreviewMode()) {
          console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
          setLoaded(true);
          return;
        }
        
        // Try to resync from persistent storage before showing error
        await resyncVehicles();
        
        setError('Failed to load vehicle data. The vehicle may not exist.');
        
        // Try to fix database tables if we haven't exceeded max attempts
        if (refreshAttempts < maxAttempts) {
          setRefreshAttempts(prev => prev + 1);
          tryFixDatabase();
        }
      }
    };

    loadData();
  }, [vehicleId, refreshAttempts, resyncVehicles]);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-2">
          <div>{error}</div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => tryFixDatabase()}
              disabled={isFixing}
            >
              {isFixing ? 'Fixing...' : 'Fix Database'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncTables}
              disabled={isSyncingTables}
            >
              {isSyncingTables ? 'Syncing...' : 'Sync Tables'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resyncVehicles}
              disabled={isResyncing}
            >
              {isResyncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </AlertDescription>
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicle ID: {vehicleId}</CardTitle>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={resyncVehicles}
            disabled={isResyncing}
          >
            {isResyncing ? 'Syncing...' : 'Sync from Persistent Storage'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncTables}
            disabled={isSyncingTables}
          >
            {isSyncingTables ? 'Syncing...' : 'Sync Tables'}
          </Button>
          <Info 
            className="h-4 w-4 text-blue-500 cursor-help" 
            aria-label="If changes don't persist after refresh, click these buttons to reload data from persistent storage and fix database tables"
          />
        </div>
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
