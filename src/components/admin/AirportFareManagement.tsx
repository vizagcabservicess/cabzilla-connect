
import React, { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { AirportFareForm } from '@/components/AirportFareForm';
import { FareUpdateError } from '@/components/cab-options/FareUpdateError';
import { useVehicleList } from '@/hooks/useVehicleList';
import { CabType, AirportFare } from '@/types/cab';
import { toast } from 'sonner';
import { Loader2, RefreshCw, DatabaseZap, Database } from 'lucide-react';
import { fareService } from '@/services/fareService';

export function AirportFareManagement() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [fareData, setFareData] = useState<AirportFare | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Get the list of vehicles
  const { vehicles, isLoading: isLoadingVehicles, error: vehicleError, refetch: refetchVehicles } = useVehicleList();
  
  // Load the fare data for the selected vehicle
  const loadFareData = async (vehicleId: string, forceRefresh = false) => {
    if (!vehicleId) {
      setFareData(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Loading airport fare data for vehicle: ${vehicleId}`);
      const data = await fareService.getAirportFares(vehicleId, forceRefresh);
      console.log('Loaded fare data:', data);
      setFareData(data);
    } catch (error: any) {
      console.error('Error loading airport fare data:', error);
      setError(error);
      toast.error(`Failed to load fare data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Monitor for vehicle changes
  useEffect(() => {
    if (selectedVehicleId) {
      loadFareData(selectedVehicleId);
    }
  }, [selectedVehicleId]);
  
  // Listen for fare updates
  useEffect(() => {
    const handleFareUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log('Airport fares updated event:', detail);
      
      if (detail && detail.vehicleId === selectedVehicleId) {
        console.log('Reloading fare data due to update event');
        loadFareData(selectedVehicleId, true);
      }
    };
    
    const handleFaresSynced = () => {
      console.log('Airport fares synced event received');
      if (selectedVehicleId) {
        loadFareData(selectedVehicleId, true);
      }
      refetchVehicles();
    };
    
    window.addEventListener('airport-fares-updated', handleFareUpdated);
    window.addEventListener('airport-fares-synced', handleFaresSynced);
    
    return () => {
      window.removeEventListener('airport-fares-updated', handleFareUpdated);
      window.removeEventListener('airport-fares-synced', handleFaresSynced);
    };
  }, [selectedVehicleId, refetchVehicles]);
  
  // Handle vehicle selection
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    toast.success('Airport fare updated successfully');
    loadFareData(selectedVehicleId, true);
  };
  
  // Handle form error
  const handleFormError = (error: Error) => {
    console.error('Error from fare form:', error);
    toast.error(`Failed to update fare: ${error.message}`);
  };
  
  // Handle sync all airport fares
  const handleSyncAirportFares = async (forceRefresh = false) => {
    setIsSyncing(true);
    
    try {
      const response = await fareService.syncAirportFares(forceRefresh);
      console.log('Sync response:', response);
      
      toast.success(
        `Airport fares synced successfully: ${response.stats.created} created, ${response.stats.updated} updated`
      );
      
      // Reload current vehicle data if selected
      if (selectedVehicleId) {
        loadFareData(selectedVehicleId, true);
      }
      
      // Refresh the vehicle list
      refetchVehicles();
    } catch (error: any) {
      console.error('Error syncing airport fares:', error);
      toast.error(`Failed to sync fares: ${error.message}`);
      setError(error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Handle refresh fares
  const handleRefreshFares = () => {
    if (selectedVehicleId) {
      loadFareData(selectedVehicleId, true);
    } else {
      toast.info('Please select a vehicle first');
    }
  };
  
  // Fix database issues
  const handleFixDatabase = async () => {
    try {
      const response = await fareService.fixDatabase();
      toast.success('Database fixed successfully');
      console.log('Database fix response:', response);
      
      // Reload current vehicle data if selected
      if (selectedVehicleId) {
        loadFareData(selectedVehicleId, true);
      }
      
      // Refresh vehicle list to get the latest data
      refetchVehicles();
    } catch (error: any) {
      console.error('Error fixing database:', error);
      toast.error(`Failed to fix database: ${error.message}`);
    }
  };
  
  // If there's an error loading vehicles, show error
  if (vehicleError) {
    return (
      <FareUpdateError 
        error={vehicleError as Error}
        onRetry={refetchVehicles}
        isAdmin={true}
        title="Error Loading Vehicles"
        description="There was a problem loading the vehicle list. Please try again."
        fixDatabaseHandler={handleFixDatabase}
      />
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Airport Transfer Fare Management</CardTitle>
          <CardDescription>
            Configure the fares for airport transfer services
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSyncAirportFares(false)}
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseZap className="h-4 w-4" />}
            Sync Fares
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFixDatabase}
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            Fix Database
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Cab Type</label>
          <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingVehicles ? (
                <SelectItem value="loading" disabled>
                  Loading vehicles...
                </SelectItem>
              ) : vehicles && vehicles.length > 0 ? (
                vehicles.map((vehicle: CabType) => (
                  <SelectItem 
                    key={vehicle.id || vehicle.vehicle_id} 
                    value={vehicle.id || vehicle.vehicle_id || ''}
                  >
                    {vehicle.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No vehicles available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        {error ? (
          <FareUpdateError 
            error={error}
            onRetry={() => loadFareData(selectedVehicleId, true)}
            isAdmin={true}
            title="Error Loading Airport Fares"
            description="There was a problem loading the airport fare data."
            fixDatabaseHandler={handleFixDatabase}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading fare data...</span>
          </div>
        ) : selectedVehicleId ? (
          <AirportFareForm 
            vehicleId={selectedVehicleId}
            initialData={fareData}
            onSuccess={handleFormSuccess}
            onError={handleFormError}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Please select a vehicle to manage its airport transfer fares
          </div>
        )}
      </CardContent>
      
      {selectedVehicleId && !isLoading && !error && (
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshFares}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
