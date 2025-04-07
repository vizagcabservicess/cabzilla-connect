
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { directVehicleOperation, fixDatabaseTables, isPreviewMode, forceRefreshVehicles } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
import { syncAirportFares } from '@/services/fareUpdateService';

interface Vehicle {
  id: string;
  vehicle_id: string;
  name: string;
}

interface VehicleManagementProps {
  vehicleId?: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId: initialVehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isSyncingAirport, setIsSyncingAirport] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("local");
  const [refreshCount, setRefreshCount] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || '');
  const maxAttempts = 3;
  
  // Function to load vehicles
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true);
    try {
      // First try to fetch from the standard endpoint
      let response;
      try {
        response = await fetch('/api/vehicles.php', {
          headers: {
            'Content-Type': 'application/json',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      } catch (e) {
        console.error('Error fetching from main endpoint:', e);
        // Try fallback
        response = await fetch('/api/admin/vehicles.php', {
          headers: {
            'Content-Type': 'application/json',
            'X-Debug': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch vehicles: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Vehicles response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        
        if (data.status === 'success' && Array.isArray(data.vehicles)) {
          const formattedVehicles = data.vehicles.map((v: any) => ({
            id: v.vehicle_id || v.id,
            vehicle_id: v.vehicle_id || v.id,
            name: v.name || `Vehicle ${v.id}`
          }));
          
          setVehicles(formattedVehicles);
          console.log('Loaded vehicles:', formattedVehicles);
          
          // Set the selected vehicle if not already set
          if (!selectedVehicleId && formattedVehicles.length > 0) {
            setSelectedVehicleId(formattedVehicles[0].id);
          }
          
          return formattedVehicles;
        } else {
          throw new Error('Invalid vehicle data format');
        }
      } catch (jsonError) {
        console.error('Error parsing vehicles JSON:', jsonError);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
      }
    } catch (error) {
      console.error('Failed to load vehicles:', error);
      toast.error('Failed to load vehicles. Using default values.');
      
      // Create some default vehicles for testing
      const defaultVehicles = [
        { id: 'sedan', vehicle_id: 'sedan', name: 'Sedan' },
        { id: 'ertiga', vehicle_id: 'ertiga', name: 'Ertiga' },
        { id: 'innova_crysta', vehicle_id: 'innova_crysta', name: 'Innova Crysta' },
        { id: 'tempo_traveller', vehicle_id: 'tempo_traveller', name: 'Tempo Traveller' },
        { id: 'luxury', vehicle_id: 'luxury', name: 'Luxury Sedan' }
      ];
      
      setVehicles(defaultVehicles);
      
      // Set the selected vehicle if not already set
      if (!selectedVehicleId) {
        setSelectedVehicleId(defaultVehicles[0].id);
      }
      
      return defaultVehicles;
    } finally {
      setLoadingVehicles(false);
    }
  }, [selectedVehicleId]);
  
  // Function to force a reload of vehicles from persistent storage
  const resyncVehicles = useCallback(async () => {
    if (isResyncing) return;
    
    try {
      setIsResyncing(true);
      toast.info('Syncing vehicle data from persistent storage...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      // Try to reload vehicles via both paths
      await loadVehicles();
      
      // Use the enhanced forceRefreshVehicles function
      try {
        const success = await forceRefreshVehicles();
        
        if (success) {
          toast.success(`Successfully resynced vehicles from persistent storage`);
          setRefreshCount(prev => prev + 1); // Increment to trigger a fresh check
          setError(null); // Clear any errors
          
          // Reload vehicles again to get fresh data
          await loadVehicles();
        }
      } catch (refreshError) {
        console.error('Error refreshing vehicles:', refreshError);
        // Already loaded vehicles in first step, so not critical
      }
    } catch (err) {
      console.error('Error resyncing vehicles:', err);
      toast.error('Failed to resync vehicles from persistent storage');
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing, loadVehicles]);
  
  const handleSyncAirportFares = async () => {
    if (isSyncingAirport) return;
    
    try {
      setIsSyncingAirport(true);
      toast.info('Syncing airport fares data...');
      
      const success = await syncAirportFares(true);
      
      if (success) {
        toast.success('Airport fares synced successfully');
        // Refresh to get updated data
        setRefreshCount(prev => prev + 1);
      } else {
        toast.error('Failed to sync airport fares');
      }
    } catch (err: any) {
      console.error('Error syncing airport fares:', err);
      toast.error(`Error syncing airport fares: ${err.message}`);
    } finally {
      setIsSyncingAirport(false);
    }
  };
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      toast.info('Attempting to fix database...');
      console.log('Fixing database...');
      
      // Clear the vehicle data cache before fixing the database
      clearVehicleDataCache();
      
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
        toast.error('Failed to fix database through standard method, trying direct API call');
        
        // Try alternate method - direct API call
        try {
          console.log('Trying alternate fix method...');
          const response = await fetch('/api/admin/fix-database.php', {
            method: 'GET',
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          
          const responseText = await response.text();
          console.log('Database fix response:', responseText);
          
          try {
            const data = JSON.parse(responseText);
            
            if (data.status === 'success') {
              toast.success('Database fixed successfully with alternate method');
              setError(null);
              setRefreshCount(0);
              
              // Force a reload of vehicles after fixing the database
              await resyncVehicles();
            } else {
              throw new Error(data.message || 'Unknown error');
            }
          } catch (jsonError) {
            console.error('Error parsing fix database response:', jsonError);
            throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
          }
        } catch (altError) {
          console.error('Error with alternate fix:', altError);
          toast.error(`Database fix failed: ${altError.message}`);
          // Try resyncing as a last resort
          await resyncVehicles();
        }
      }
    } catch (err: any) {
      console.error('Error fixing database:', err);
      toast.error(`Failed to fix database tables: ${err.message}`);
      // Try resyncing as a last resort
      await resyncVehicles();
    } finally {
      setIsFixing(false);
    }
  };
  
  // Load vehicles on initial render
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);
  
  // Set initial vehicle ID if provided
  useEffect(() => {
    if (initialVehicleId) {
      setSelectedVehicleId(initialVehicleId);
    }
  }, [initialVehicleId]);
  
  const handleVehicleChange = (value: string) => {
    setSelectedVehicleId(value);
  };
  
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
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Fare Management</h2>
            <p className="text-muted-foreground">
              Manage pricing for local packages and airport transfers
            </p>
          </div>
          
          <div className="flex flex-col gap-2 md:flex-row">
            <Button
              variant="outline"
              onClick={handleFixDatabase}
              disabled={isFixing}
              className="flex items-center gap-2"
            >
              <Loader2 className={`h-4 w-4 ${isFixing ? 'animate-spin' : ''}`} />
              {isFixing ? 'Fixing Database...' : 'Fix Database'}
            </Button>
            <Button
              variant="outline"
              onClick={handleSyncAirportFares}
              disabled={isSyncingAirport}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncingAirport ? 'animate-spin' : ''}`} />
              {isSyncingAirport ? 'Syncing...' : 'Sync Airport Fares'}
            </Button>
            <Button
              variant="outline"
              onClick={resyncVehicles}
              disabled={isResyncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
              {isResyncing ? 'Syncing...' : 'Sync Vehicles'}
            </Button>
          </div>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-medium">Select Vehicle</h3>
        </CardHeader>
        <CardContent>
          <Select value={selectedVehicleId} onValueChange={handleVehicleChange} disabled={loadingVehicles}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingVehicles ? "Loading vehicles..." : "Select a vehicle"} />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {!selectedVehicleId && (
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
      
      {selectedVehicleId && (
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
            <FareManagement vehicleId={selectedVehicleId} fareType="local" key={`local-${selectedVehicleId}-${refreshCount}`} />
          </TabsContent>
          <TabsContent value="airport">
            <FareManagement vehicleId={selectedVehicleId} fareType="airport" key={`airport-${selectedVehicleId}-${refreshCount}`} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
