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
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  useEffect(() => {
    if (selectedVehicleId) {
      loadFares(selectedVehicleId);
    } else {
      setFares(null);
    }

    // Clear any retry timeout when component unmounts or selection changes
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [selectedVehicleId, refreshKey]);

  const loadFares = async (vehicleId: string, isRetry = false) => {
    if (!vehicleId) return;
    
    if (isRetry) {
      retryCountRef.current++;
    } else {
      retryCountRef.current = 0;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching airport fares for vehicle ID: ${vehicleId}${isRetry ? ` (retry attempt ${retryCountRef.current})` : ''}`);
      
      // Generate a unique timestamp to avoid caching
      const timestamp = new Date().getTime();
      const response: ApiResponse = await fetchAirportFares(vehicleId, { 
        forceRefresh: true, 
        timestamp: timestamp 
      });
      console.log('Airport fares response:', response);
      
      const extractFareData = (response: ApiResponse): ApiResponseFare | null => {
        // Check for fares in data.fares array
        if (response.data?.fares) {
          if (Array.isArray(response.data.fares) && response.data.fares.length > 0) {
            console.log('Found fares in data.fares array:', response.data.fares.length);
            
            const matchingFare = response.data.fares.find(fare => 
              (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase()) ||
              (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase())
            );
            
            if (matchingFare) {
              console.log('Found matching fare in data.fares array', matchingFare);
              return matchingFare;
            }
            
            console.log('No exact match, using first fare in data.fares array', response.data.fares[0]);
            return response.data.fares[0];
          }
          
          // Check for fares in data.fares object
          if (typeof response.data.fares === 'object' && response.data.fares !== null) {
            console.log('Found fares in data.fares object');
            
            if (response.data.fares[vehicleId]) {
              console.log('Found direct match in data.fares object', response.data.fares[vehicleId]);
              return response.data.fares[vehicleId];
            }
            
            const keys = Object.keys(response.data.fares);
            const matchingKey = keys.find(key => key.toLowerCase() === vehicleId.toLowerCase());
            
            if (matchingKey) {
              console.log('Found case-insensitive match in data.fares object', response.data.fares[matchingKey]);
              return response.data.fares[matchingKey];
            }
            
            if (keys.length > 0) {
              console.log('No match in data.fares object, using first entry', response.data.fares[keys[0]]);
              return response.data.fares[keys[0]];
            }
          }
        }
        
        // Check for fares directly in the response
        if (response.fares) {
          if (Array.isArray(response.fares) && response.fares.length > 0) {
            console.log('Found fares in direct fares array:', response.fares.length);
            
            const matchingFare = response.fares.find(fare => 
              (fare.vehicle_id?.toLowerCase() === vehicleId.toLowerCase()) ||
              (fare.vehicleId?.toLowerCase() === vehicleId.toLowerCase())
            );
            
            if (matchingFare) {
              console.log('Found matching fare in direct fares array', matchingFare);
              return matchingFare;
            }
            
            console.log('No exact match, using first fare in direct fares array', response.fares[0]);
            return response.fares[0];
          }
          
          if (typeof response.fares === 'object' && response.fares !== null && !Array.isArray(response.fares)) {
            console.log('Found fares in direct fares object');
            
            if (response.fares[vehicleId]) {
              console.log('Found direct match in fares object', response.fares[vehicleId]);
              return response.fares[vehicleId];
            }
            
            const keys = Object.keys(response.fares);
            const matchingKey = keys.find(key => key.toLowerCase() === vehicleId.toLowerCase());
            
            if (matchingKey) {
              console.log('Found case-insensitive match in fares object', response.fares[matchingKey]);
              return response.fares[matchingKey];
            }
            
            if (keys.length > 0) {
              console.log('No match in fares object, using first entry', response.fares[keys[0]]);
              return response.fares[keys[0]];
            }
          }
        }
        
        return null;
      };
      
      const fareData = extractFareData(response);
      console.log('Extracted fare data:', fareData, 'Match found:', !!fareData);
      
      if (fareData) {
        const normalizedFareData: FareData = {
          vehicleId: vehicleId,
          vehicle_id: vehicleId,
          basePrice: parseNumericValue(fareData.basePrice ?? fareData.base_price ?? 0),
          pricePerKm: parseNumericValue(fareData.pricePerKm ?? fareData.price_per_km ?? 0),
          pickupPrice: parseNumericValue(fareData.pickupPrice ?? fareData.pickup_price ?? 0),
          dropPrice: parseNumericValue(fareData.dropPrice ?? fareData.drop_price ?? 0),
          tier1Price: parseNumericValue(fareData.tier1Price ?? fareData.tier1_price ?? 0),
          tier2Price: parseNumericValue(fareData.tier2Price ?? fareData.tier2_price ?? 0),
          tier3Price: parseNumericValue(fareData.tier3Price ?? fareData.tier3_price ?? 0),
          tier4Price: parseNumericValue(fareData.tier4Price ?? fareData.tier4_price ?? 0),
          extraKmCharge: parseNumericValue(fareData.extraKmCharge ?? fareData.extra_km_charge ?? 0)
        };
        
        console.log('Normalized fare data:', normalizedFareData);
        setFares(normalizedFareData);
        setInitialized(true);
        retryCountRef.current = 0; // Reset retry count on success
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
      
      // If we haven't reached the maximum number of retries, try again after a delay
      if (retryCountRef.current < maxRetries) {
        console.log(`Retry ${retryCountRef.current + 1}/${maxRetries} will be attempted in 2 seconds...`);
        
        toast({
          title: "Loading fares failed",
          description: `Retrying (${retryCountRef.current + 1}/${maxRetries})...`,
          variant: "default"
        });
        
        // Schedule a retry
        retryTimeoutRef.current = setTimeout(() => {
          loadFares(vehicleId, true);
        }, 2000);
        
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load airport fares after multiple attempts. Using default values.",
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
    setInitialized(false);
    
    // Reset retry count when vehicle changes
    retryCountRef.current = 0;
    
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
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
    
    // Reset retry count
    retryCountRef.current = 0;
    setLoading(true);
    
    try {
      // Generate a unique timestamp to avoid caching
      const timestamp = new Date().getTime();
      await updateAirportFares({
        ...fareToSave,
        timestamp
      });
      
      toast({
        title: "Success",
        description: "Airport fares saved successfully.",
      });
      
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error saving fares:', error);
      
      // Try a direct API call as fallback
      try {
        console.log("Attempting direct API call as fallback...");
        const directApiUrl = `/api/direct-airport-fares.php?_t=${Date.now()}`;
        
        const response = await fetch(directApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Force-Refresh': 'true'
          },
          body: JSON.stringify(fareToSave)
        });
        
        if (response.ok) {
          toast({
            title: "Success",
            description: "Airport fares saved successfully using fallback method.",
          });
          
          setTimeout(() => {
            setRefreshKey(prev => prev + 1);
          }, 1000);
          
          return;
        } else {
          console.error('Fallback API call failed:', await response.text());
          throw new Error('Fallback API call failed');
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast({
          title: "Error",
          description: `Failed to save airport fares: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
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
        retryCountRef.current = 0;
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
        
        retryCountRef.current = 0;
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
