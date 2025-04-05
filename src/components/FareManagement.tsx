
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Save, Database, RotateCw } from "lucide-react";
import { fetchLocalFares, fetchAirportFares, updateLocalFares, updateAirportFares, syncAirportFares, syncLocalFares } from '@/services/fareManagementService';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  [key: string]: any;
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingFares, setIsSyncingFares] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fareData, setFareData] = useState<FareData>({
    vehicleId: vehicleId,
    vehicle_id: vehicleId
  });
  
  const lastFetchTime = useRef<number>(0);
  const requestInProgress = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const fetchAttempts = useRef<number>(0);
  const maxFetchAttempts = 3;
  const lastRefreshTimeRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const refreshCooldownMs = 5000;
  const saveCooldownMs = 2000;
  
  // Default values for different vehicle types
  const defaultValues: Record<string, Record<string, Record<string, number>>> = {
    airport: {
      sedan: {
        basePrice: 3000, pricePerKm: 12, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 12, nightCharges: 250, extraWaitingCharges: 150
      },
      ertiga: {
        basePrice: 3500, pricePerKm: 15, pickupPrice: 1000, dropPrice: 1000,
        tier1Price: 800, tier2Price: 1000, tier3Price: 1200, tier4Price: 1400, 
        extraKmCharge: 15, nightCharges: 300, extraWaitingCharges: 200
      },
      innova_crysta: {
        basePrice: 4000, pricePerKm: 17, pickupPrice: 1200, dropPrice: 1200,
        tier1Price: 1000, tier2Price: 1200, tier3Price: 1400, tier4Price: 1600, 
        extraKmCharge: 17, nightCharges: 350, extraWaitingCharges: 250
      },
      tempo: {
        basePrice: 6000, pricePerKm: 19, pickupPrice: 2000, dropPrice: 2000,
        tier1Price: 1600, tier2Price: 1800, tier3Price: 2000, tier4Price: 2500, 
        extraKmCharge: 19, nightCharges: 400, extraWaitingCharges: 300
      },
      luxury: {
        basePrice: 7000, pricePerKm: 22, pickupPrice: 2500, dropPrice: 2500,
        tier1Price: 2000, tier2Price: 2200, tier3Price: 2500, tier4Price: 3000, 
        extraKmCharge: 22, nightCharges: 450, extraWaitingCharges: 350
      },
      innova_hycross: {
        basePrice: 4500, pricePerKm: 18, pickupPrice: 1200, dropPrice: 1200,
        tier1Price: 1000, tier2Price: 1200, tier3Price: 1400, tier4Price: 1600, 
        extraKmCharge: 18, nightCharges: 350, extraWaitingCharges: 250
      },
      toyota: {
        basePrice: 4500, pricePerKm: 18, pickupPrice: 1200, dropPrice: 1200,
        tier1Price: 1000, tier2Price: 1200, tier3Price: 1400, tier4Price: 1600, 
        extraKmCharge: 18, nightCharges: 350, extraWaitingCharges: 250
      },
      etios: {
        basePrice: 3200, pricePerKm: 13, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 13, nightCharges: 250, extraWaitingCharges: 150
      },
      dzire_cng: {
        basePrice: 3200, pricePerKm: 13, pickupPrice: 800, dropPrice: 800,
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, 
        extraKmCharge: 13, nightCharges: 250, extraWaitingCharges: 150
      }
    },
    local: {
      sedan: {
        price4hrs40km: 1800, price8hrs80km: 3000, price10hrs100km: 3600, 
        priceExtraKm: 12, priceExtraHour: 200
      },
      ertiga: {
        price4hrs40km: 2200, price8hrs80km: 3600, price10hrs100km: 4500, 
        priceExtraKm: 15, priceExtraHour: 250
      },
      innova_crysta: {
        price4hrs40km: 2600, price8hrs80km: 4200, price10hrs100km: 5200, 
        priceExtraKm: 18, priceExtraHour: 300
      },
      tempo: {
        price4hrs40km: 4500, price8hrs80km: 7000, price10hrs100km: 8500, 
        priceExtraKm: 22, priceExtraHour: 400
      },
      luxury: {
        price4hrs40km: 3500, price8hrs80km: 5500, price10hrs100km: 6500, 
        priceExtraKm: 22, priceExtraHour: 350
      },
      innova_hycross: {
        price4hrs40km: 3000, price8hrs80km: 4500, price10hrs100km: 5500, 
        priceExtraKm: 18, priceExtraHour: 300
      },
      toyota: {
        price4hrs40km: 3000, price8hrs80km: 4500, price10hrs100km: 5500, 
        priceExtraKm: 18, priceExtraHour: 300
      },
      etios: {
        price4hrs40km: 2000, price8hrs80km: 3200, price10hrs100km: 4000, 
        priceExtraKm: 13, priceExtraHour: 200
      },
      dzire_cng: {
        price4hrs40km: 2000, price8hrs80km: 3200, price10hrs100km: 4000, 
        priceExtraKm: 13, priceExtraHour: 200
      }
    }
  };

  // Apply default values based on vehicle type and ID
  const applyDefaultValues = (vehicleId: string): FareData => {
    // Normalize vehicle ID for matching
    const normalizedId = vehicleId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    let vehicleType = 'sedan'; // Default to sedan if no match
    
    // Match vehicle type by keywords in ID
    if (normalizedId.includes('sedan')) {
      vehicleType = 'sedan';
    } else if (normalizedId.includes('ertiga')) {
      vehicleType = 'ertiga';
    } else if (normalizedId.includes('innova') && normalizedId.includes('hycross')) {
      vehicleType = 'innova_hycross';
    } else if (normalizedId.includes('innova') || normalizedId.includes('crysta')) {
      vehicleType = 'innova_crysta';
    } else if (normalizedId.includes('tempo')) {
      vehicleType = 'tempo';
    } else if (normalizedId.includes('luxury')) {
      vehicleType = 'luxury';
    } else if (normalizedId.includes('toyota')) {
      vehicleType = 'toyota';
    } else if (normalizedId.includes('etios')) {
      vehicleType = 'etios';
    } else if (normalizedId.includes('dzire')) {
      vehicleType = 'dzire_cng';
    } else if (normalizedId === '1') {
      vehicleType = 'sedan';
    } else if (normalizedId === '2') {
      vehicleType = 'ertiga';
    } else if (['1266', '3', '4'].includes(normalizedId)) {
      vehicleType = 'innova_crysta';
    } else if (['592', '1270', '5'].includes(normalizedId)) {
      vehicleType = 'tempo';
    } else if (normalizedId === '180') {
      vehicleType = 'etios';
    } else if (normalizedId === '1271') {
      vehicleType = 'dzire_cng';
    }
    
    // Get default values for the matched vehicle type or use sedan as fallback
    const defaults = defaultValues[fareType]?.[vehicleType] || 
                     defaultValues[fareType]?.['sedan'] || 
                     {};
    
    console.log(`Applied ${fareType} defaults for ${vehicleId} (matched as ${vehicleType}):`, defaults);
    
    return {
      vehicleId,
      vehicle_id: vehicleId,
      ...defaults
    };
  };
  
  const loadFareData = async () => {
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < refreshCooldownMs) {
      console.log(`Refresh throttled, last refresh was ${(now - lastRefreshTimeRef.current)/1000}s ago`);
      return;
    }
    
    if (requestInProgress.current) {
      console.log('Request already in progress, skipping...');
      return;
    }
    
    if (fetchAttempts.current >= maxFetchAttempts) {
      console.log('Max fetch attempts reached, not trying again');
      return;
    }
    
    if (!vehicleId || vehicleId.trim() === '') {
      setError('No vehicle selected');
      return;
    }
    
    lastRefreshTimeRef.current = now;
    lastFetchTime.current = now;
    requestInProgress.current = true;
    fetchAttempts.current += 1;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let result: FareData[] = [];
      
      if (fareType === 'local') {
        result = await fetchLocalFares(vehicleId);
      } else if (fareType === 'airport') {
        result = await fetchAirportFares(vehicleId);
      }
      
      if (result && result.length > 0) {
        const loadedFare = result[0];
        console.log(`Loaded ${fareType} fare data:`, loadedFare);
        
        // Check for zero or missing values
        const hasZeroValues = Object.entries(loadedFare).some(([key, value]) => {
          return typeof value === 'number' && 
                 value === 0 && 
                 key !== 'id' && 
                 !key.includes('_id') && 
                 !key.includes('vehicle');
        });
        
        // Apply defaults if any important values are zero
        if (hasZeroValues) {
          const defaults = applyDefaultValues(vehicleId);
          console.log(`Applying default values for ${vehicleId} due to zero values:`, defaults);
          
          const mergedFare = {
            ...loadedFare,
            ...Object.fromEntries(
              Object.entries(defaults).filter(([key, value]) => {
                return typeof value === 'number' && 
                      (loadedFare[key] === undefined || loadedFare[key] === 0);
              })
            ),
            vehicleId: vehicleId,
            vehicle_id: vehicleId
          };
          
          setFareData(mergedFare);
        } else {
          // Ensure vehicle ID is correctly set
          setFareData({
            ...loadedFare,
            vehicleId: vehicleId,
            vehicle_id: vehicleId
          });
        }
      } else {
        // No data found - apply all defaults
        const defaults = applyDefaultValues(vehicleId);
        console.log(`No fare data found. Using defaults for ${vehicleId}:`, defaults);
        setFareData(defaults);
      }
    } catch (err) {
      console.error(`Error loading ${fareType} fare data:`, err);
      setError(`Failed to load fare data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      
      // Apply defaults on error
      const defaults = applyDefaultValues(vehicleId);
      console.log(`Using defaults due to error for ${vehicleId}:`, defaults);
      setFareData(defaults);
    } finally {
      setIsLoading(false);
      requestInProgress.current = false;
    }
  };
  
  const syncFares = async () => {
    if (isSyncingFares) return;
    
    setIsSyncingFares(true);
    setError(null);
    
    try {
      console.log(`Syncing ${fareType} fares...`);
      
      if (fareType === 'local') {
        await syncLocalFares();
        toast.success('Local fares synced successfully');
      } else if (fareType === 'airport') {
        await syncAirportFares();
        toast.success('Airport fares synced successfully');
      }
      
      // Reload data after sync
      setTimeout(() => {
        loadFareData();
      }, 1000);
    } catch (err) {
      console.error(`Error syncing ${fareType} fares:`, err);
      setError(`Failed to sync fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(`Failed to sync ${fareType} fares`);
    } finally {
      setIsSyncingFares(false);
    }
  };
  
  const saveFareData = async () => {
    const now = Date.now();
    if (now - lastSaveTimeRef.current < saveCooldownMs) {
      console.log(`Save throttled, last save was ${(now - lastSaveTimeRef.current)/1000}s ago`);
      return;
    }
    
    if (isSaving) {
      console.log('Already saving, please wait...');
      return;
    }
    
    if (!vehicleId || vehicleId.trim() === '') {
      setError('No vehicle selected');
      return;
    }
    
    // Apply defaults to ensure no zero values
    const dataWithDefaults = { ...fareData };
    const defaults = applyDefaultValues(vehicleId);
    
    // Replace any zero values with defaults
    Object.entries(dataWithDefaults).forEach(([key, value]) => {
      if (typeof value === 'number' && 
          value === 0 && 
          key !== 'id' && 
          !key.includes('_id') && 
          !key.includes('vehicle') &&
          defaults[key]) {
        dataWithDefaults[key] = defaults[key];
      }
    });
    
    lastSaveTimeRef.current = now;
    setIsSaving(true);
    setError(null);
    
    try {
      console.log(`Saving ${fareType} fare data:`, dataWithDefaults);
      
      if (fareType === 'local') {
        await updateLocalFares(dataWithDefaults);
      } else if (fareType === 'airport') {
        await updateAirportFares(dataWithDefaults);
      }
      
      toast.success(`${fareType} fares updated successfully`);
      
      // Reload data after save to get server-side computed values
      setTimeout(() => {
        loadFareData();
      }, 1000);
    } catch (err) {
      console.error(`Error saving ${fareType} fare data:`, err);
      setError(`Failed to save fare data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(`Failed to update ${fareType} fares`);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    const numericValue = value === '' ? 0 : parseFloat(value);
    
    setFareData(prev => ({
      ...prev,
      [field]: numericValue,
    }));
  };
  
  // Load fare data when component mounts or vehicleId changes
  useEffect(() => {
    mountedRef.current = true;
    fetchAttempts.current = 0;
    loadFareData();
    
    return () => {
      mountedRef.current = false;
    };
  }, [vehicleId, fareType]);
  
  // Set up event listener for fare updates from other components
  useEffect(() => {
    const handleFareUpdate = (event: CustomEvent) => {
      if (
        event.detail?.fareType === fareType && 
        event.detail?.vehicleId === vehicleId &&
        mountedRef.current
      ) {
        console.log('Detected fare update event, reloading data...');
        setTimeout(() => {
          loadFareData();
        }, 1000);
      }
    };
    
    window.addEventListener('fare-data-updated', handleFareUpdate as EventListener);
    
    return () => {
      window.removeEventListener('fare-data-updated', handleFareUpdate as EventListener);
    };
  }, [fareType, vehicleId]);
  
  // Render different inputs based on fareType
  const renderFareInputs = () => {
    if (fareType === 'local') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price4hrs40km">4 Hours / 40 KM Package (₹)</Label>
              <Input
                id="price4hrs40km"
                type="number"
                value={fareData.price4hrs40km || 0}
                onChange={(e) => handleInputChange('price4hrs40km', e.target.value)}
                placeholder="e.g. 1800"
              />
            </div>
            <div>
              <Label htmlFor="price8hrs80km">8 Hours / 80 KM Package (₹)</Label>
              <Input
                id="price8hrs80km"
                type="number"
                value={fareData.price8hrs80km || 0}
                onChange={(e) => handleInputChange('price8hrs80km', e.target.value)}
                placeholder="e.g. 3000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price10hrs100km">10 Hours / 100 KM Package (₹)</Label>
              <Input
                id="price10hrs100km"
                type="number"
                value={fareData.price10hrs100km || 0}
                onChange={(e) => handleInputChange('price10hrs100km', e.target.value)}
                placeholder="e.g. 3600"
              />
            </div>
            <div>
              <Label htmlFor="priceExtraKm">Extra KM Charge (₹)</Label>
              <Input
                id="priceExtraKm"
                type="number"
                value={fareData.priceExtraKm || 0}
                onChange={(e) => handleInputChange('priceExtraKm', e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceExtraHour">Extra Hour Charge (₹)</Label>
              <Input
                id="priceExtraHour"
                type="number"
                value={fareData.priceExtraHour || 0}
                onChange={(e) => handleInputChange('priceExtraHour', e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
          </div>
        </>
      );
    } else if (fareType === 'airport') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basePrice">Base Price (₹)</Label>
              <Input
                id="basePrice"
                type="number"
                value={fareData.basePrice || 0}
                onChange={(e) => handleInputChange('basePrice', e.target.value)}
                placeholder="e.g. 3000"
              />
            </div>
            <div>
              <Label htmlFor="pricePerKm">Price Per KM (₹)</Label>
              <Input
                id="pricePerKm"
                type="number"
                value={fareData.pricePerKm || 0}
                onChange={(e) => handleInputChange('pricePerKm', e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
              <Input
                id="pickupPrice"
                type="number"
                value={fareData.pickupPrice || 0}
                onChange={(e) => handleInputChange('pickupPrice', e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
            <div>
              <Label htmlFor="dropPrice">Drop Price (₹)</Label>
              <Input
                id="dropPrice"
                type="number"
                value={fareData.dropPrice || 0}
                onChange={(e) => handleInputChange('dropPrice', e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tier1Price">Tier 1 Price (₹)</Label>
              <Input
                id="tier1Price"
                type="number"
                value={fareData.tier1Price || 0}
                onChange={(e) => handleInputChange('tier1Price', e.target.value)}
                placeholder="e.g. 800"
              />
            </div>
            <div>
              <Label htmlFor="tier2Price">Tier 2 Price (₹)</Label>
              <Input
                id="tier2Price"
                type="number"
                value={fareData.tier2Price || 0}
                onChange={(e) => handleInputChange('tier2Price', e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tier3Price">Tier 3 Price (₹)</Label>
              <Input
                id="tier3Price"
                type="number"
                value={fareData.tier3Price || 0}
                onChange={(e) => handleInputChange('tier3Price', e.target.value)}
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <Label htmlFor="tier4Price">Tier 4 Price (₹)</Label>
              <Input
                id="tier4Price"
                type="number"
                value={fareData.tier4Price || 0}
                onChange={(e) => handleInputChange('tier4Price', e.target.value)}
                placeholder="e.g. 1400"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
              <Input
                id="extraKmCharge"
                type="number"
                value={fareData.extraKmCharge || 0}
                onChange={(e) => handleInputChange('extraKmCharge', e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <div>
              <Label htmlFor="nightCharges">Night Charges (₹)</Label>
              <Input
                id="nightCharges"
                type="number"
                value={fareData.nightCharges || 0}
                onChange={(e) => handleInputChange('nightCharges', e.target.value)}
                placeholder="e.g. 300"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹)</Label>
              <Input
                id="extraWaitingCharges"
                type="number"
                value={fareData.extraWaitingCharges || 0}
                onChange={(e) => handleInputChange('extraWaitingCharges', e.target.value)}
                placeholder="e.g. 200"
              />
            </div>
          </div>
        </>
      );
    }
    
    return null;
  };
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="lg" />
            <span className="ml-2">Loading fare data...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {renderFareInputs()}
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadFareData}
            disabled={isLoading || isSaving}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            variant="outline" 
            onClick={syncFares}
            disabled={isLoading || isSaving || isSyncingFares}
          >
            <Database className={`mr-2 h-4 w-4 ${isSyncingFares ? 'animate-spin' : ''}`} />
            Sync Tables
          </Button>
        </div>
        
        <Button 
          variant="default" 
          onClick={saveFareData}
          disabled={isLoading || isSaving}
        >
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : `Save ${fareType === 'local' ? 'Local' : 'Airport'} Fare`}
        </Button>
      </CardFooter>
    </Card>
  );
};
