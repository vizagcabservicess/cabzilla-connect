
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import VehicleSelection from '@/components/admin/VehicleSelection';
import AirportFareForm from '@/components/admin/AirportFareForm';
import { FareData, updateAirportFares, syncAirportFares, fetchAirportFares } from '@/services/fareManagementService';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, RefreshCw, Database, Save } from 'lucide-react';

const AirportFareManagement: React.FC = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fares, setFares] = useState<FareData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Add a refresh key to force re-render without continuous refresh
  const { toast } = useToast();

  // Load fares when vehicle selection changes or refresh key changes
  useEffect(() => {
    if (selectedVehicleId) {
      loadFares(selectedVehicleId);
    } else {
      setFares(null);
    }
  }, [selectedVehicleId, refreshKey]);

  // Separate effect for preventing continuous reload
  useEffect(() => {
    const handleFareDataUpdated = (event: CustomEvent) => {
      if (event.detail?.fareType === 'airport' && 
          event.detail?.vehicleId === selectedVehicleId) {
        // Instead of directly loading fares, update the refresh key
        setRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('fare-data-updated', handleFareDataUpdated as EventListener);
    
    return () => {
      window.removeEventListener('fare-data-updated', handleFareDataUpdated as EventListener);
    };
  }, [selectedVehicleId]);

  const loadFares = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      const fareDatas = await fetchAirportFares(vehicleId);
      
      if (fareDatas && fareDatas.length > 0) {
        setFares(fareDatas[0]);
      } else {
        // If no fare data found, create a default entry
        setFares({
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          basePrice: 0,
          pricePerKm: 0,
          pickupPrice: 0,
          dropPrice: 0,
          tier1Price: 0,
          tier2Price: 0,
          tier3Price: 0,
          tier4Price: 0,
          extraKmCharge: 0
        });
      }
      setInitialized(true);
    } catch (error) {
      console.error('Error loading airport fares:', error);
      toast({
        title: "Error",
        description: "Failed to load airport fares. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleFareChange = (fareData: FareData) => {
    setFares(fareData);
  };

  const handleSaveFare = async () => {
    if (!fares || !selectedVehicleId) {
      toast({
        title: "Error",
        description: "Please select a vehicle and provide fare details.",
        variant: "destructive"
      });
      return;
    }

    // Ensure vehicle ID is set correctly
    const fareToSave = {
      ...fares,
      vehicleId: selectedVehicleId,
      vehicle_id: selectedVehicleId
    };

    setLoading(true);
    try {
      await updateAirportFares(fareToSave);
      toast({
        title: "Success",
        description: "Airport fares saved successfully.",
      });
      // Update refresh key instead of directly reloading
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving fares:', error);
      toast({
        title: "Error",
        description: `Failed to save airport fares: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTables = async () => {
    setSyncing(true);
    try {
      await syncAirportFares();
      toast({
        title: "Success",
        description: "Airport fare tables synchronized successfully.",
      });
      
      // Update refresh key instead of directly reloading
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error syncing airport fare tables:', error);
      toast({
        title: "Error",
        description: `Failed to sync airport fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  // Fix database collation
  const handleFixDatabase = async () => {
    setSyncing(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/admin/fix-collation.php?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: `Database collation fixed successfully for ${result.data?.tables_count || 0} tables.`,
        });
        
        // Sync tables after fixing collation
        await syncAirportFares();
        
        // Update refresh key instead of directly reloading
        setRefreshKey(prev => prev + 1);
      } else {
        throw new Error(result.message || 'Failed to fix database collation');
      }
    } catch (error) {
      console.error('Error fixing database collation:', error);
      toast({
        title: "Error",
        description: `Failed to fix database collation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-blue-500">✈️</span> Airport Transfer Fare Management
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFixDatabase}
            disabled={syncing || loading}
            className="flex items-center gap-1"
          >
            {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Fix Database
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncTables}
            disabled={syncing || loading}
            className="flex items-center gap-1"
          >
            {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Tables
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="grid gap-2">
          <label className="font-medium">Cab Type</label>
          <VehicleSelection
            onVehicleSelect={handleVehicleChange}
            selectedVehicleId={selectedVehicleId}
          />
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : fares && selectedVehicleId ? (
          <AirportFareForm 
            fareData={fares} 
            onChange={handleFareChange} 
          />
        ) : initialized ? (
          <div className="border border-gray-200 rounded-md p-6 text-center">
            <p className="text-gray-500">Please select a vehicle to manage airport fares</p>
          </div>
        ) : null}
        
        {selectedVehicleId && (
          <Button 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSaveFare}
            disabled={loading || syncing || !fares}
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Airport Fare
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AirportFareManagement;
