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

interface ApiResponseFare {
  id?: number;
  vehicleId?: string;
  vehicle_id?: string;
  name?: string;
  basePrice?: number | string;
  base_price?: number | string;
  pricePerKm?: number | string;
  price_per_km?: number | string;
  pickupPrice?: number | string;
  pickup_price?: number | string;
  dropPrice?: number | string;
  drop_price?: number | string;
  tier1Price?: number | string;
  tier1_price?: number | string;
  tier2Price?: number | string;
  tier2_price?: number | string;
  tier3Price?: number | string;
  tier3_price?: number | string;
  tier4Price?: number | string;
  tier4_price?: number | string;
  extraKmCharge?: number | string;
  extra_km_charge?: number | string;
  [key: string]: any;
}

interface ApiResponse {
  data?: {
    fares?: ApiResponseFare[] | Record<string, ApiResponseFare>
  };
  fares?: ApiResponseFare[] | Record<string, ApiResponseFare>;
  status?: string;
  message?: string;
  [key: string]: any;
}

const AirportFareManagement: React.FC = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fares, setFares] = useState<FareData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();

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
      const response: ApiResponse = await fetchAirportFares(vehicleId);
      console.log('Airport fares response:', response);
      
      let fareData: ApiResponseFare | null = null;
      let foundMatch = false;
      
      // Check if response is an array
      if (Array.isArray(response)) {
        console.log('Response is an array with length:', response.length);
        if (response.length > 0) {
          const exactMatch = response.find((fare: ApiResponseFare) => 
            (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase()) || 
            (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase())
          );
          
          if (exactMatch) {
            console.log('Found exact match by vehicle ID:', exactMatch);
            fareData = exactMatch;
            foundMatch = true;
          } else if (response[0]) {
            console.log('No exact match found, using first item:', response[0]);
            fareData = response[0];
            foundMatch = true;
          }
        }
      } 
      // Check if response is an object
      else if (response && typeof response === 'object') {
        console.log('Response is an object, checking for structured data');
        
        // Check if response has data.fares structure
        if (response.data && response.data.fares) {
          console.log('Found nested data.fares structure:', response.data.fares);
          
          if (Array.isArray(response.data.fares)) {
            const matchedFare = response.data.fares.find((fare: ApiResponseFare) => 
              (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase()) || 
              (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase())
            );
            
            if (matchedFare) {
              console.log('Found exact match in data.fares array:', matchedFare);
              fareData = matchedFare;
              foundMatch = true;
            } else if (response.data.fares.length > 0) {
              console.log('No exact match in data.fares array, using first item:', response.data.fares[0]);
              fareData = response.data.fares[0];
              foundMatch = true;
            }
          } 
          else if (typeof response.data.fares === 'object' && response.data.fares !== null) {
            const directFare = response.data.fares[vehicleId];
            if (directFare) {
              console.log('Found direct fare match in data.fares object:', directFare);
              fareData = directFare;
              foundMatch = true;
            } else {
              const vehicleKeys = Object.keys(response.data.fares);
              const matchingKey = vehicleKeys.find(key => 
                key.toLowerCase() === vehicleId.toLowerCase()
              );
              
              if (matchingKey) {
                console.log('Found case-insensitive match in data.fares object:', response.data.fares[matchingKey]);
                fareData = response.data.fares[matchingKey];
                foundMatch = true;
              } else if (vehicleKeys.length > 0) {
                console.log('No match found in data.fares object, using first item:', response.data.fares[vehicleKeys[0]]);
                fareData = response.data.fares[vehicleKeys[0]];
                foundMatch = true;
              }
            }
          }
        } 
        // Check if response has direct fares property
        else if (response.fares) {
          console.log('Found direct fares property:', response.fares);
          
          if (Array.isArray(response.fares)) {
            const matchedFare = response.fares.find((fare: ApiResponseFare) => 
              (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase()) || 
              (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase())
            );
            
            if (matchedFare) {
              console.log('Found exact match in fares array:', matchedFare);
              fareData = matchedFare;
              foundMatch = true;
            } else if (response.fares.length > 0) {
              console.log('No exact match in fares array, using first item:', response.fares[0]);
              fareData = response.fares[0];
              foundMatch = true;
            }
          } 
          else if (typeof response.fares === 'object' && response.fares !== null) {
            const directFare = response.fares[vehicleId];
            if (directFare) {
              console.log('Found direct fare match in fares object:', directFare);
              fareData = directFare;
              foundMatch = true;
            } else {
              const vehicleKeys = Object.keys(response.fares);
              const matchingKey = vehicleKeys.find(key => 
                key.toLowerCase() === vehicleId.toLowerCase()
              );
              
              if (matchingKey) {
                console.log('Found case-insensitive match in fares object:', response.fares[matchingKey]);
                fareData = response.fares[matchingKey];
                foundMatch = true;
              } else if (vehicleKeys.length > 0) {
                console.log('No match found in fares object, using first item:', response.fares[vehicleKeys[0]]);
                fareData = response.fares[vehicleKeys[0]];
                foundMatch = true;
              }
            }
          }
        } 
        // Check if response itself is a fare object
        else if (response.vehicleId || response.vehicle_id || response.basePrice || response.base_price) {
          console.log('Response appears to be a direct fare object:', response);
          if ((response.vehicleId && response.vehicleId.toLowerCase() === vehicleId.toLowerCase()) ||
              (response.vehicle_id && response.vehicle_id.toLowerCase() === vehicleId.toLowerCase()) ||
              !response.vehicleId && !response.vehicle_id) {
            fareData = response as ApiResponseFare;
            foundMatch = true;
          }
        }
      }
      
      console.log('Extracted fare data:', fareData, 'Match found:', foundMatch);
      
      if (fareData && foundMatch) {
        const hasAnyFareProperty = 
          fareData.basePrice !== undefined || 
          fareData.base_price !== undefined ||
          fareData.pickupPrice !== undefined || 
          fareData.pickup_price !== undefined ||
          fareData.dropPrice !== undefined || 
          fareData.drop_price !== undefined ||
          fareData.tier1Price !== undefined || 
          fareData.tier1_price !== undefined;
        
        if (hasAnyFareProperty) {
          console.log('Valid fare data found, preparing to display');
          
          const cleanedFareData: FareData = {
            vehicleId: vehicleId,
            vehicle_id: vehicleId,
            basePrice: parseNumericValue(fareData.basePrice ?? fareData.base_price),
            pricePerKm: parseNumericValue(fareData.pricePerKm ?? fareData.price_per_km),
            pickupPrice: parseNumericValue(fareData.pickupPrice ?? fareData.pickup_price),
            dropPrice: parseNumericValue(fareData.dropPrice ?? fareData.drop_price),
            tier1Price: parseNumericValue(fareData.tier1Price ?? fareData.tier1_price),
            tier2Price: parseNumericValue(fareData.tier2Price ?? fareData.tier2_price),
            tier3Price: parseNumericValue(fareData.tier3Price ?? fareData.tier3_price),
            tier4Price: parseNumericValue(fareData.tier4Price ?? fareData.tier4_price),
            extraKmCharge: parseNumericValue(fareData.extraKmCharge ?? fareData.extra_km_charge)
          };
          
          console.log('Cleaned fare data to display:', cleanedFareData);
          setFares(cleanedFareData);
          setInitialized(true);
          setLoading(false);
          return;
        }
      }
      
      console.log('No valid fare data found, creating default');
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
    } catch (error) {
      console.error('Error loading airport fares:', error);
      toast({
        title: "Error",
        description: "Failed to load airport fares. Please try again.",
        variant: "destructive"
      });
      
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
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    console.log('Vehicle selection changed to:', vehicleId);
    setSelectedVehicleId(vehicleId);
    setFares(null);
    setInitialized(false);
  };

  const handleFareChange = (fareData: FareData) => {
    console.log("Fare data changed:", fareData);
    const updatedFareData: FareData = {
      ...fareData,
      vehicleId: selectedVehicleId,
      vehicle_id: selectedVehicleId,
      basePrice: parseFloat(String(fareData.basePrice ?? 0)),
      pricePerKm: parseFloat(String(fareData.pricePerKm ?? 0)),
      pickupPrice: parseFloat(String(fareData.pickupPrice ?? 0)),
      dropPrice: parseFloat(String(fareData.dropPrice ?? 0)),
      tier1Price: parseFloat(String(fareData.tier1Price ?? 0)),
      tier2Price: parseFloat(String(fareData.tier2Price ?? 0)),
      tier3Price: parseFloat(String(fareData.tier3Price ?? 0)),
      tier4Price: parseFloat(String(fareData.tier4Price ?? 0)),
      extraKmCharge: parseFloat(String(fareData.extraKmCharge ?? 0))
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

    const fareToSave: FareData = {
      ...fares,
      vehicleId: selectedVehicleId,
      vehicle_id: selectedVehicleId,
      basePrice: parseFloat(String(fares.basePrice ?? 0)),
      pricePerKm: parseFloat(String(fares.pricePerKm ?? 0)),
      pickupPrice: parseFloat(String(fares.pickupPrice ?? 0)),
      dropPrice: parseFloat(String(fares.dropPrice ?? 0)),
      tier1Price: parseFloat(String(fares.tier1Price ?? 0)),
      tier2Price: parseFloat(String(fares.tier2Price ?? 0)),
      tier3Price: parseFloat(String(fares.tier3Price ?? 0)),
      tier4Price: parseFloat(String(fares.tier4Price ?? 0)),
      extraKmCharge: parseFloat(String(fares.extraKmCharge ?? 0))
    };

    console.log("Saving fare data:", fareToSave);
    
    setLoading(true);
    try {
      await updateAirportFares(fareToSave);
      toast({
        title: "Success",
        description: "Airport fares saved successfully.",
      });
      
      setTimeout(() => {
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
      
      if (selectedVehicleId) {
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

  const handleFixDatabase = async () => {
    setSyncing(true);
    try {
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
        
        await syncAirportFares();
        
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
