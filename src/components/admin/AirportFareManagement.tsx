import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import VehicleSelection from '@/components/admin/VehicleSelection';
import AirportFareForm from '@/components/admin/AirportFareForm';
import { updateAirportFares, syncAirportFares, parseNumericValue } from '@/services/fareManagementService';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader, RefreshCw, Database, Save } from 'lucide-react';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

// Define the interfaces locally to avoid type mismatches
interface FareData {
  [key: string]: any;
  vehicleId?: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

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

// Custom fetchAirportFares function directly in this component to avoid dependency issues
const fetchAirportFares = async (vehicleId?: string): Promise<FareData[]> => {
  try {
    console.log(`Fetching airport fares for vehicle ${vehicleId || 'all'}`);
    
    const params: Record<string, string> = {};
    if (vehicleId) {
      params.vehicleId = vehicleId;
      params.vehicle_id = vehicleId;
      params.id = vehicleId;
    }
    
    // Add timestamp to bust cache
    params._t = Date.now().toString();
    params._cb = Math.random().toString(36).substring(2, 15); // Add cache buster

    const response = await axios.get(getApiUrl('api/direct-airport-fares'), {
      params,
      headers: {
        ...forceRefreshHeaders,
        'X-Admin-Mode': 'true',
        'X-Debug': 'true',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    console.log('Airport fares API raw response:', response);
    console.log('Airport fares API response data:', response.data);
    
    // Basic response validation
    if (!response.data) {
      console.error('Empty response from airport fares API');
      throw new Error('Empty response from airport fares API');
    }

    let normalizedFares: FareData[] = [];
    
    try {
      // Normalize the response to a consistent format
      const responseData = response.data;
      
      if (responseData.fares && Array.isArray(responseData.fares)) {
        normalizedFares = responseData.fares.map(normalizeFare);
      } else if (responseData.fares && typeof responseData.fares === 'object') {
        normalizedFares = Object.values(responseData.fares).map(normalizeFare);
      } else if (responseData.data?.fares && Array.isArray(responseData.data.fares)) {
        normalizedFares = responseData.data.fares.map(normalizeFare);
      } else if (responseData.data?.fares && typeof responseData.data.fares === 'object') {
        normalizedFares = Object.values(responseData.data.fares).map(normalizeFare);
      } else if (responseData.data && Array.isArray(responseData.data)) {
        normalizedFares = responseData.data.map(normalizeFare);
      } else if (responseData.vehicles && Array.isArray(responseData.vehicles)) {
        normalizedFares = responseData.vehicles.map(normalizeFare);
      }
    } catch (error) {
      console.error('Error during response normalization:', error);
    }
      
    if (normalizedFares.length === 0 && vehicleId) {
      console.log('Creating default fare for vehicle:', vehicleId);
      return [{
        vehicleId,
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
      }];
    }
      
    // Filter for requested vehicle if we have a specific ID
    if (vehicleId && normalizedFares.length > 0) {
      const vehicleSpecificFares = normalizedFares.filter(fare => 
        (fare.vehicleId?.toString().toLowerCase() === vehicleId.toLowerCase()) || 
        (fare.vehicle_id?.toString().toLowerCase() === vehicleId.toLowerCase())
      );
      
      if (vehicleSpecificFares.length > 0) {
        return vehicleSpecificFares;
      }
      
      return [{
        vehicleId,
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
      }];
    }
    
    return normalizedFares;
  } catch (error) {
    console.error('Error fetching airport fares:', error);
    if (vehicleId) {
      return [{
        vehicleId,
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
      }];
    }
    throw error;
  }
};

// Function to normalize fare data with proper type handling
const normalizeFare = (fare: ApiResponseFare): FareData => {
  return {
    vehicleId: fare.vehicleId || fare.vehicle_id || '',
    vehicle_id: fare.vehicleId || fare.vehicle_id || '',
    basePrice: parseNumericValue(fare.basePrice ?? fare.base_price ?? 0),
    pricePerKm: parseNumericValue(fare.pricePerKm ?? fare.price_per_km ?? 0),
    pickupPrice: parseNumericValue(fare.pickupPrice ?? fare.pickup_price ?? 0),
    dropPrice: parseNumericValue(fare.dropPrice ?? fare.drop_price ?? 0),
    tier1Price: parseNumericValue(fare.tier1Price ?? fare.tier1_price ?? 0),
    tier2Price: parseNumericValue(fare.tier2Price ?? fare.tier2_price ?? 0),
    tier3Price: parseNumericValue(fare.tier3Price ?? fare.tier3_price ?? 0),
    tier4Price: parseNumericValue(fare.tier4Price ?? fare.tier4_price ?? 0),
    extraKmCharge: parseNumericValue(fare.extraKmCharge ?? fare.extra_km_charge ?? 0)
  };
};

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
      const fareData = await fetchAirportFares(vehicleId);
      console.log('Airport fares response:', fareData);
      
      if (fareData && fareData.length > 0) {
        // Get the first matching fare or just the first one if no match
        const matchingFare = fareData.find(fare => 
          (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase()) ||
          (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase())
        ) || fareData[0];
        
        console.log('Using fare data:', matchingFare);
        
        // Ensure all required fields are present
        const normalizedFare: FareData = {
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          basePrice: parseNumericValue(matchingFare.basePrice || 0),
          pricePerKm: parseNumericValue(matchingFare.pricePerKm || 0),
          pickupPrice: parseNumericValue(matchingFare.pickupPrice || 0),
          dropPrice: parseNumericValue(matchingFare.dropPrice || 0),
          tier1Price: parseNumericValue(matchingFare.tier1Price || 0),
          tier2Price: parseNumericValue(matchingFare.tier2Price || 0),
          tier3Price: parseNumericValue(matchingFare.tier3Price || 0),
          tier4Price: parseNumericValue(matchingFare.tier4Price || 0),
          extraKmCharge: parseNumericValue(matchingFare.extraKmCharge || 0)
        };
        
        console.log('Normalized fare data:', normalizedFare);
        setFares(normalizedFare);
        setInitialized(true);
      } else {
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
      }
    } catch (error) {
      console.error('Error loading airport fares:', error);
      toast({
        title: "Error",
        description: "Failed to load airport fares. Please try again.",
        variant: "destructive"
      });
      
      // Create default fare data on error
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
