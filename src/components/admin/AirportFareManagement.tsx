
import React, { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import VehicleSelection from '@/components/admin/VehicleSelection';
import AirportFareForm from '@/components/admin/AirportFareForm';
import { FareData, updateAirportFares, syncAirportFares, fetchAirportFares } from '@/services/fareManagementService';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, RefreshCw, Database, Save } from 'lucide-react';
import { parseNumericValue } from '@/utils/safeStringUtils';

const AirportFareManagement: React.FC = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fares, setFares] = useState<FareData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();

  // Load fares when vehicle selection changes or refresh key changes
  useEffect(() => {
    if (selectedVehicleId) {
      loadFares(selectedVehicleId);
    } else {
      setFares(null);
    }
  }, [selectedVehicleId, refreshKey]);

  const loadFares = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching airport fares for vehicle ID: ${vehicleId}`);
      const fareDatas = await fetchAirportFares(vehicleId);
      
      if (fareDatas && fareDatas.length > 0) {
        const fareData = fareDatas[0];
        console.log('Retrieved fare data:', fareData);
        
        // Create a new object with explicit number conversions to ensure numeric values
        // Handle all possible property name formats due to API inconsistency
        const cleanedFareData: FareData = {
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          basePrice: parseNumericValue(fareData.basePrice || fareData.base_price, 0),
          pricePerKm: parseNumericValue(fareData.pricePerKm || fareData.price_per_km, 0),
          pickupPrice: parseNumericValue(fareData.pickupPrice || fareData.pickup_price, 0),
          dropPrice: parseNumericValue(fareData.dropPrice || fareData.drop_price, 0),
          tier1Price: parseNumericValue(fareData.tier1Price || fareData.tier1_price, 0),
          tier2Price: parseNumericValue(fareData.tier2Price || fareData.tier2_price, 0),
          tier3Price: parseNumericValue(fareData.tier3Price || fareData.tier3_price, 0),
          tier4Price: parseNumericValue(fareData.tier4Price || fareData.tier4_price, 0),
          extraKmCharge: parseNumericValue(fareData.extraKmCharge || fareData.extra_km_charge, 0)
        };
        
        console.log('Cleaned fare data to display:', cleanedFareData);
        setFares(cleanedFareData);
        setInitialized(true);
      } else {
        // If no fare data found, create a default entry
        console.log('No fare data found, creating default');
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
        setInitialized(true);
      }
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
    console.log('Vehicle selection changed to:', vehicleId);
    setSelectedVehicleId(vehicleId);
    // Clear current fares to prevent old data showing while loading
    setFares(null);
    setInitialized(false);
  };

  const handleFareChange = (fareData: FareData) => {
    console.log("Fare data changed:", fareData);
    // Ensure we're preserving numeric values
    const updatedFareData: FareData = {
      ...fareData,
      vehicleId: selectedVehicleId,
      vehicle_id: selectedVehicleId,
      basePrice: parseNumericValue(fareData.basePrice, 0),
      pricePerKm: parseNumericValue(fareData.pricePerKm, 0),
      pickupPrice: parseNumericValue(fareData.pickupPrice, 0),
      dropPrice: parseNumericValue(fareData.dropPrice, 0),
      tier1Price: parseNumericValue(fareData.tier1Price, 0),
      tier2Price: parseNumericValue(fareData.tier2Price, 0),
      tier3Price: parseNumericValue(fareData.tier3Price, 0),
      tier4Price: parseNumericValue(fareData.tier4Price, 0),
      extraKmCharge: parseNumericValue(fareData.extraKmCharge, 0)
    };
    setFares(updatedFareData);
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

    // Ensure vehicle ID is set correctly and all values are numbers
    const fareToSave: FareData = {
      ...fares,
      vehicleId: selectedVehicleId,
      vehicle_id: selectedVehicleId,
      basePrice: parseNumericValue(fares.basePrice, 0),
      pricePerKm: parseNumericValue(fares.pricePerKm, 0),
      pickupPrice: parseNumericValue(fares.pickupPrice, 0),
      dropPrice: parseNumericValue(fares.dropPrice, 0),
      tier1Price: parseNumericValue(fares.tier1Price, 0),
      tier2Price: parseNumericValue(fares.tier2Price, 0),
      tier3Price: parseNumericValue(fares.tier3Price, 0),
      tier4Price: parseNumericValue(fares.tier4Price, 0),
      extraKmCharge: parseNumericValue(fares.extraKmCharge, 0)
    };

    console.log("Saving fare data:", fareToSave);
    
    setLoading(true);
    try {
      await updateAirportFares(fareToSave);
      toast({
        title: "Success",
        description: "Airport fares saved successfully.",
      });
      
      // Force a reload of data to ensure we have the latest values
      // Add a short delay to allow the backend to process the update
      setTimeout(() => {
        // Increment refresh key to trigger a reload
        setRefreshKey(prev => prev + 1);
      }, 1000);
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
      
      // Reload data if we have a selected vehicle
      if (selectedVehicleId) {
        // Increment refresh key to trigger a reload
        setRefreshKey(prev => prev + 1);
      }
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
        
        // Increment refresh key to trigger a reload
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
