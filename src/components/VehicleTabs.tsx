
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VehicleManagement } from './VehicleManagement';
import { directVehicleOperation, fixDatabaseTables, isPreviewMode, getMockVehicleData } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
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
  const [isPreview, setIsPreview] = useState(false);
  const maxAttempts = 3;

  useEffect(() => {
    // Check if we're in preview mode on component mount
    const preview = isPreviewMode();
    setIsPreview(preview);
    
    // If we're in preview mode, we can load immediately
    if (preview) {
      setLoaded(true);
      setError(null);
    }
  }, []);

  // Function to force a reload of vehicles from persistent storage
  const resyncVehicles = useCallback(async () => {
    if (isResyncing) return;
    
    try {
      setIsResyncing(true);
      toast.info('Syncing vehicle data...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      if (isPreviewMode()) {
        // In preview mode, simulate success after a short delay
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Successfully synced vehicles (preview mode)');
        setLoaded(true);
        setError(null);
      } else {
        try {
          // Call the reload-vehicles.php endpoint to force a reload from database
          const response = await directVehicleOperation(
            `api/admin/reload-vehicles.php?_t=${Date.now()}&source=database`, 
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
          
          if (response && response.status === 'success' && response.vehicles && response.vehicles.length > 0) {
            toast.success(`Successfully resynced ${response.count || 0} vehicles from ${response.source || 'database'}`);
            setRefreshAttempts(0); // Reset attempts counter
            setError(null); // Clear any errors
            setLoaded(true);
            
            // Force a refresh of the current view
            setTimeout(() => {
              setLoaded(false);
              setLoaded(true);
            }, 500);
          } else {
            toast.warning('Data may be coming from cache - database connection issue');
            setLoaded(true); // Still show UI with available data
          }
        } catch (err) {
          console.error('Error resyncing vehicles:', err);
          
          if (isPreviewMode()) {
            // In preview mode, we can proceed with mock data
            toast.info('Using static data (preview mode)');
            setLoaded(true);
            setError(null);
          } else {
            toast.error('Failed to sync with database - using cached data');
            // Try to load anyway
            setLoaded(true);
          }
        }
      }
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing]);

  // Function to fix database tables
  const tryFixDatabase = async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    
    // In preview mode, simulate success after a delay
    if (isPreviewMode()) {
      toast.info('Simulating database fix (preview mode)...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Database tables fixed successfully (simulation)');
      setLoaded(true);
      setError(null);
      setIsFixing(false);
      return;
    }
    
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
            `api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}&source=database`,
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
          
          // Force a resync from database to ensure we have the latest data
          await resyncVehicles();
        } catch (loadErr) {
          console.error('Error loading vehicle data after fix:', loadErr);
          // Try a resync as a backup plan
          await resyncVehicles();
        }
      } else {
        // Try to resync from database even if the fix fails
        toast.warning('Database fix not fully successful. Trying to sync from cache...');
        await resyncVehicles();
        
        // Even if fix fails, still show the management screen in preview mode
        if (isPreviewMode()) {
          console.log('In preview mode, proceeding despite database fix failure');
          setLoaded(true);
          setError(null);
        } else {
          toast.error('Could not fix database tables. Using cached data.');
          setLoaded(true); // Still attempt to show UI with available data
        }
      }
    } catch (fixErr) {
      console.error('Error fixing database tables:', fixErr);
      
      // Try to resync from database as a fallback
      toast.warning('Database fix failed. Trying to use cached data...');
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
      
      // In preview mode, we can proceed with mock data
      if (isPreviewMode()) {
        console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
        setLoaded(true);
        setError(null);
        return;
      }
      
      try {
        setError(null);
        console.log(`Loading data for vehicle: ${vehicleId}`);
        
        // Check if the vehicle exists first
        try {
          const response = await directVehicleOperation(
            `api/admin/vehicles-data.php?id=${vehicleId}&_t=${Date.now()}&source=database`, 
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
            return;
          }
          
          // If we reach here, no valid vehicle data was found
          throw new Error('No valid vehicle data returned');
        } catch (apiError) {
          console.error('API Error:', apiError);
          
          // In preview mode, proceed anyway
          if (isPreviewMode()) {
            console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
            setLoaded(true);
            return;
          }
          
          // Try to resync from database before showing error
          await resyncVehicles();
          
          // If we're still having issues after resync, try to use static data
          try {
            const mockData = await getMockVehicleData(vehicleId);
            if (mockData && mockData.vehicles && mockData.vehicles.length > 0) {
              console.log('Using mock data as fallback');
              setLoaded(true);
              setError('Using cached data - database connection unavailable');
              return;
            }
          } catch (mockErr) {
            console.error('Error loading mock data:', mockErr);
          }
          
          setError('Failed to load vehicle data. The vehicle may not exist or the database is unavailable.');
          
          // Try to fix database tables if we haven't exceeded max attempts
          if (refreshAttempts < maxAttempts) {
            setRefreshAttempts(prev => prev + 1);
            tryFixDatabase();
          } else {
            // Last resort, still show UI
            setLoaded(true);
          }
        }
      } catch (err) {
        console.error('Error loading vehicle data:', err);
        
        if (isPreviewMode()) {
          console.log('In preview mode, proceeding with mock data for vehicle:', vehicleId);
          setLoaded(true);
          setError(null);
          return;
        }
        
        // Try to resync from database before showing error
        await resyncVehicles();
        
        setError('Failed to load vehicle data. Database connection might be unavailable.');
        
        // Try to fix database tables if we haven't exceeded max attempts
        if (refreshAttempts < maxAttempts) {
          setRefreshAttempts(prev => prev + 1);
          tryFixDatabase();
        } else {
          // Last resort, still show UI
          setLoaded(true);
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
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => tryFixDatabase()}
              disabled={isFixing}
              className="flex items-center gap-1"
            >
              {isFixing ? 'Fixing...' : 'Fix Database'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resyncVehicles}
              disabled={isResyncing}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isResyncing ? 'animate-spin' : ''}`} />
              {isResyncing ? 'Syncing...' : 'Continue with Available Data'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!vehicleId) {
    return (
      <Alert className="my-4">
        <Info className="h-4 w-4" />
        <AlertDescription>Please select a vehicle to manage.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Vehicle ID: {vehicleId}</CardTitle>
        <div className="flex gap-2 items-center">
          {isPreview && (
            <Alert variant="default" className="py-1 px-2">
              <span className="text-xs">Preview Mode</span>
            </Alert>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resyncVehicles}
            disabled={isResyncing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isResyncing ? 'animate-spin' : ''}`} />
            {isResyncing ? 'Syncing...' : 'Refresh Data'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loaded ? (
          <VehicleManagement vehicleId={vehicleId} />
        ) : (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <p>Loading vehicle data...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
