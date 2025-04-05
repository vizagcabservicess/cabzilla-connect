
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Save, Database } from "lucide-react";
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
        tier1Price: 600, tier2Price: 800, tier3Price: 1000, tier4Price: 1200, extraKmCharge: 12
      },
      ertiga: {
        basePrice: 3500, pricePerKm: 15, pickupPrice: 1000, dropPrice: 1000,
        tier1Price: 800, tier2Price: 1000, tier3Price: 1200, tier4Price: 1400, extraKmCharge: 15
      },
      innova_crysta: {
        basePrice: 4000, pricePerKm: 17, pickupPrice: 1200, dropPrice: 1200,
        tier1Price: 1000, tier2Price: 1200, tier3Price: 1400, tier4Price: 1600, extraKmCharge: 17
      },
      tempo: {
        basePrice: 6000, pricePerKm: 19, pickupPrice: 2000, dropPrice: 2000,
        tier1Price: 1600, tier2Price: 1800, tier3Price: 2000, tier4Price: 2500, extraKmCharge: 19
      },
      luxury: {
        basePrice: 7000, pricePerKm: 22, pickupPrice: 2500, dropPrice: 2500,
        tier1Price: 2000, tier2Price: 2200, tier3Price: 2500, tier4Price: 3000, extraKmCharge: 22
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
      }
    }
  };

  // Apply default values based on vehicle type
  const applyDefaultValues = (vehicleId: string): FareData => {
    const simpleVehicleId = vehicleId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    let vehicleType = simpleVehicleId;
    
    // Try to find matching vehicle type
    if (simpleVehicleId.includes('sedan') || simpleVehicleId === '1') {
      vehicleType = 'sedan';
    } else if (simpleVehicleId.includes('ertiga') || simpleVehicleId === '2') {
      vehicleType = 'ertiga';
    } else if (simpleVehicleId.includes('innova') || simpleVehicleId.includes('crysta') || simpleVehicleId === '1266') {
      vehicleType = 'innova_crysta';
    } else if (simpleVehicleId.includes('tempo') || simpleVehicleId === '592' || simpleVehicleId === '1270') {
      vehicleType = 'tempo';
    } else if (simpleVehicleId.includes('luxury')) {
      vehicleType = 'luxury';
    }
    
    // Get default values for the matched vehicle type or use sedan as fallback
    const defaults = defaultValues[fareType]?.[vehicleType] || 
                    defaultValues[fareType]?.['sedan'] || 
                    {};
    
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
          console.log(`Applying default values for ${vehicleId}:`, defaults);
          
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
          const updatedFare = {
            ...loadedFare,
            vehicleId: vehicleId,
            vehicle_id: vehicleId
          };
          
          setFareData(updatedFare);
        }
        
        setError(null);
      } else {
        console.warn('No fare data returned:', result);
        
        // Apply default values for this vehicle
        const defaultData = applyDefaultValues(vehicleId);
        console.log(`Applying default values for ${vehicleId}:`, defaultData);
        
        setFareData(defaultData);
        
        setError(`No ${fareType} fare data found in database. Using default values.`);
      }
    } catch (err) {
      console.error(`Error loading ${fareType} fare data:`, err);
      
      // Apply default values when there's an error
      const defaultData = applyDefaultValues(vehicleId);
      console.log(`Applying default values after error for ${vehicleId}:`, defaultData);
      
      setFareData(defaultData);
      
      setError(`Failed to load fare data. Using default values. ${err instanceof Error ? err.message : ''}`);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        requestInProgress.current = false;
      }
    }
  };
  
  const saveFareData = async () => {
    const now = Date.now();
    if (now - lastSaveTimeRef.current < saveCooldownMs) {
      toast.info("Please wait a moment before saving again");
      return;
    }
    
    if (!vehicleId || vehicleId.trim() === '' || isSaving) {
      if (!vehicleId || vehicleId.trim() === '') {
        setError("Vehicle ID is missing. Cannot save fares.");
      }
      return;
    }
    
    lastSaveTimeRef.current = now;
    setIsSaving(true);
    setError(null);
    
    try {
      const dataToSave = {
        ...fareData,
        vehicleId: vehicleId,
        vehicle_id: vehicleId
      };
      
      console.log(`Saving ${fareType} fare data:`, dataToSave);
      
      if (fareType === 'local') {
        await updateLocalFares(dataToSave);
      } else if (fareType === 'airport') {
        await updateAirportFares(dataToSave);
      }
      
      toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
      
      lastFetchTime.current = Date.now();
      fetchAttempts.current = 0;
      
      setTimeout(() => {
        if (mountedRef.current) {
          loadFareData();
        }
      }, 1500);
    } catch (err) {
      console.error(`Error saving ${fareType} fare data:`, err);
      toast.error(`Failed to update ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(`Failed to update fares. ${err instanceof Error ? err.message : ''}`);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };
  
  const syncFares = async () => {
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < refreshCooldownMs) {
      toast.info("Please wait a moment before syncing again");
      return;
    }
    
    if (isSyncingFares) return;
    
    lastRefreshTimeRef.current = now;
    setIsSyncingFares(true);
    setError(null);
    
    try {
      console.log(`Syncing ${fareType} fares from database tables`);
      
      let result;
      if (fareType === 'local') {
        result = await syncLocalFares();
      } else if (fareType === 'airport') {
        result = await syncAirportFares();
      }
      
      if (result && (result.status === 'success' || result.status === 'throttled')) {
        if (result.status === 'throttled') {
          toast.info(result.message || "Sync operation throttled. Please try again in a few moments.");
        } else {
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares synced successfully`);
          
          fetchAttempts.current = 0;
          
          setTimeout(() => {
            if (mountedRef.current) {
              loadFareData();
            }
          }, 1500);
        }
      } else {
        console.error('Error syncing fares:', result);
        toast.error(result?.message || 'Failed to sync fares');
        setError(result?.message || 'Failed to sync fares');
      }
    } catch (err) {
      console.error(`Error syncing ${fareType} fares:`, err);
      toast.error('Failed to sync fares');
      setError(`Failed to sync fares. ${err instanceof Error ? err.message : ''}`);
    } finally {
      if (mountedRef.current) {
        setIsSyncingFares(false);
      }
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    const numericValue = !isNaN(Number(value)) ? Number(value) : value;
    
    setFareData(prev => ({
      ...prev,
      [name]: numericValue,
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    }));
  };
  
  useEffect(() => {
    mountedRef.current = true;
    fetchAttempts.current = 0;
    
    setFareData(prev => ({
      ...prev,
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    }));
    
    if (vehicleId && vehicleId.trim() !== '') {
      loadFareData();
    }
    
    const handleFareDataUpdated = (event: Event) => {
      if (!mountedRef.current) return;
      
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail && detail.fareType === fareType && detail.vehicleId === vehicleId) {
        console.log('Fare data updated externally, reloading...');
        fetchAttempts.current = 0;
        loadFareData();
      }
    };
    
    window.addEventListener('fare-data-updated', handleFareDataUpdated);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('fare-data-updated', handleFareDataUpdated);
    };
  }, [vehicleId, fareType]);
  
  const renderFareFields = () => {
    if (fareType === 'local') {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price4hrs40km">4 Hours / 40 KM Package (₹)</Label>
              <Input
                id="price4hrs40km"
                name="price4hrs40km"
                type="number"
                value={fareData.price4hrs40km || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price8hrs80km">8 Hours / 80 KM Package (₹)</Label>
              <Input
                id="price8hrs80km"
                name="price8hrs80km"
                type="number"
                value={fareData.price8hrs80km || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price10hrs100km">10 Hours / 100 KM Package (₹)</Label>
              <Input
                id="price10hrs100km"
                name="price10hrs100km"
                type="number"
                value={fareData.price10hrs100km || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priceExtraKm">Extra KM Charge (₹)</Label>
              <Input
                id="priceExtraKm"
                name="priceExtraKm"
                type="number"
                value={fareData.priceExtraKm || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priceExtraHour">Extra Hour Charge (₹)</Label>
              <Input
                id="priceExtraHour"
                name="priceExtraHour"
                type="number"
                value={fareData.priceExtraHour || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </>
      );
    } else if (fareType === 'airport') {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (₹)</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                value={fareData.basePrice || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Price Per KM (₹)</Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                value={fareData.pricePerKm || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
              <Input
                id="pickupPrice"
                name="pickupPrice"
                type="number"
                value={fareData.pickupPrice || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dropPrice">Drop Price (₹)</Label>
              <Input
                id="dropPrice"
                name="dropPrice"
                type="number"
                value={fareData.dropPrice || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tier1Price">Tier 1 Price (≤ 10km) (₹)</Label>
              <Input
                id="tier1Price"
                name="tier1Price"
                type="number"
                value={fareData.tier1Price || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier2Price">Tier 2 Price (≤ 20km) (₹)</Label>
              <Input
                id="tier2Price"
                name="tier2Price"
                type="number"
                value={fareData.tier2Price || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tier3Price">Tier 3 Price (≤ 30km) (₹)</Label>
              <Input
                id="tier3Price"
                name="tier3Price"
                type="number"
                value={fareData.tier3Price || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier4Price">Tier 4 Price ({'>'}30km) (₹)</Label>
              <Input
                id="tier4Price"
                name="tier4Price"
                type="number"
                value={fareData.tier4Price || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
              <Input
                id="extraKmCharge"
                name="extraKmCharge"
                type="number"
                value={fareData.extraKmCharge || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nightCharges">Night Charges (₹)</Label>
              <Input
                id="nightCharges"
                name="nightCharges"
                type="number"
                value={fareData.nightCharges || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹/hr)</Label>
              <Input
                id="extraWaitingCharges"
                name="extraWaitingCharges"
                type="number"
                value={fareData.extraWaitingCharges || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </>
      );
    }
    
    return null;
  };
  
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {error && (
          <Alert variant={error.includes('default values') ? "default" : "destructive"} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error.includes('default values') ? 'Notice' : 'Error'}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner size="lg" />
            <span className="ml-2">Loading fare data...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold capitalize">
                {fareType} Fare Configuration
              </h3>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={syncFares}
                disabled={isSyncingFares || !vehicleId || (Date.now() - lastRefreshTimeRef.current < refreshCooldownMs)}
                className="flex items-center gap-2"
              >
                <Database className={`h-4 w-4 ${isSyncingFares ? 'animate-pulse' : ''}`} />
                <span>Sync {fareType.charAt(0).toUpperCase() + fareType.slice(1)} Fares</span>
              </Button>
            </div>
            
            {renderFareFields()}
            
            {!vehicleId && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Please select a vehicle to manage fares.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="bg-muted/50 px-6 py-4 border-t">
        <div className="flex justify-between w-full">
          <Button
            variant="outline"
            onClick={loadFareData}
            disabled={isLoading || !vehicleId || (Date.now() - lastRefreshTimeRef.current < refreshCooldownMs)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={saveFareData}
            disabled={isSaving || isLoading || !vehicleId || (Date.now() - lastSaveTimeRef.current < saveCooldownMs)}
          >
            {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
