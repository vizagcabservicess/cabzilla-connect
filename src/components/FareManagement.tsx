import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Save } from "lucide-react";

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  // Local fare fields
  price4hrs40km?: number;
  price8hrs80km?: number;
  price10hrs100km?: number;
  priceExtraKm?: number;
  priceExtraHour?: number;
  // Airport fare fields
  priceOneWay?: number;
  priceRoundTrip?: number;
  nightCharges?: number;
  extraWaitingCharges?: number;
  // Additional fields
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
  
  // Use refs to prevent unnecessary re-renders and infinite loops
  const lastFetchTime = useRef<number>(0);
  const requestInProgress = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const fetchAttempts = useRef<number>(0);
  const maxFetchAttempts = 3;
  const lastRefreshTimeRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const refreshCooldownMs = 5000; // 5 seconds between refreshes
  const saveCooldownMs = 2000; // 2 seconds between saves
  
  // Load fare data based on fare type
  const loadFareData = async () => {
    // Strict throttling for API requests
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < refreshCooldownMs) {
      console.log(`Refresh throttled, last refresh was ${(now - lastRefreshTimeRef.current)/1000}s ago`);
      return;
    }
    
    // Prevent concurrent requests
    if (requestInProgress.current) {
      console.log('Request already in progress, skipping...');
      return;
    }
    
    // Prevent excessive attempts
    if (fetchAttempts.current >= maxFetchAttempts) {
      console.log('Max fetch attempts reached, not trying again');
      return;
    }
    
    // ENSURE VEHICLE ID IS VALID BEFORE PROCEEDING
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
      let endpoint = '';
      
      if (fareType === 'local') {
        endpoint = `api/admin/direct-local-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
      } else if (fareType === 'airport') {
        endpoint = `api/admin/direct-airport-fares.php?vehicle_id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`;
      }
      
      console.log(`Loading ${fareType} fare data from ${endpoint}`);
      
      const result = await directVehicleOperation(endpoint, 'GET', {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      });
      
      if (result && result.status === 'success' && result.fares && result.fares.length > 0) {
        const loadedFare = result.fares[0];
        console.log(`Loaded ${fareType} fare data:`, loadedFare);
        
        // Ensure we always have the vehicle ID set correctly in both formats
        const updatedFare = {
          ...loadedFare,
          vehicleId: vehicleId,
          vehicle_id: vehicleId
        };
        
        setFareData(updatedFare);
        setError(null);
      } else {
        console.warn('No fare data returned:', result);
        
        // Initialize with default structure but keep vehicleId
        setFareData({ 
          vehicleId,
          vehicle_id: vehicleId 
        });
        
        if (result && result.status === 'error') {
          setError(result.message || 'Failed to load fare data');
        }
      }
    } catch (err) {
      console.error(`Error loading ${fareType} fare data:`, err);
      setError(`Failed to load fare data. ${err instanceof Error ? err.message : ''}`);
      
      // Set default empty fare data
      setFareData({ 
        vehicleId,
        vehicle_id: vehicleId 
      });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        requestInProgress.current = false;
      }
    }
  };
  
  // Save fare data with throttling
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
      let endpoint = '';
      
      if (fareType === 'local') {
        endpoint = 'api/admin/local-fares-update.php';
      } else if (fareType === 'airport') {
        endpoint = 'api/admin/airport-fares-update.php';
      }
      
      console.log(`Saving ${fareType} fare data to ${endpoint}:`, fareData);
      
      // ENSURE BOTH VEHICLE ID FORMATS ARE INCLUDED
      const dataToSave = {
        ...fareData,
        vehicleId: vehicleId,
        vehicle_id: vehicleId
      };
      
      console.log('Final fare data being sent:', dataToSave);
      
      const result = await directVehicleOperation(endpoint, 'POST', {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      }, dataToSave);
      
      if (result && result.status === 'success') {
        toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
        
        // Update lastFetchTime to prevent immediate reload after save
        lastFetchTime.current = Date.now();
        
        // Reset fetch attempts counter after successful save
        fetchAttempts.current = 0;
      } else {
        console.error('Error saving fare data:', result);
        toast.error(result?.message || 'Failed to update fares');
        setError(result?.message || 'Failed to update fares');
      }
    } catch (err) {
      console.error(`Error saving ${fareType} fare data:`, err);
      toast.error('Failed to update fares');
      setError(`Failed to update fares. ${err instanceof Error ? err.message : ''}`);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  };
  
  // Sync fares from pricing tables with strict throttling
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
      let endpoint = '';
      
      if (fareType === 'local') {
        endpoint = 'api/admin/sync-local-fares.php';
      } else if (fareType === 'airport') {
        endpoint = 'api/admin/sync-airport-fares.php';
      }
      
      console.log(`Syncing ${fareType} fares from database tables`);
      
      const result = await directVehicleOperation(endpoint, 'GET', {
        'X-Admin-Mode': 'true',
        'X-Debug': 'true'
      });
      
      if (result && (result.status === 'success' || result.status === 'throttled')) {
        if (result.status === 'throttled') {
          toast.info(result.message || "Sync operation throttled. Please try again in a few moments.");
        } else {
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares synced successfully`);
          
          // Reset the fetch attempts counter after successful sync
          fetchAttempts.current = 0;
          
          // Wait a moment before reloading data to allow database to update
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
  
  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    // Convert to number if it's a numeric field
    const numericValue = !isNaN(Number(value)) ? Number(value) : value;
    
    setFareData(prev => ({
      ...prev,
      [name]: numericValue,
      // ALWAYS maintain both vehicle ID formats
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    }));
  };
  
  // Load data on mount and vehicle/type change
  useEffect(() => {
    mountedRef.current = true;
    fetchAttempts.current = 0;
    
    // ALWAYS set both vehicle ID formats in the fare data when vehicleId changes
    setFareData(prev => ({
      ...prev,
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    }));
    
    if (vehicleId && vehicleId.trim() !== '') {
      loadFareData();
    }
    
    // Setup event listeners for fare updates
    const handleFareDataUpdated = (event: Event) => {
      if (!mountedRef.current) return;
      
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail && detail.fareType === fareType && detail.vehicleId === vehicleId) {
        console.log('Fare data updated externally, reloading...');
        // Reset the fetch attempts counter to allow immediate reload
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

  // Render different forms based on fare type
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
              <Label htmlFor="priceOneWay">One Way Transfer (₹)</Label>
              <Input
                id="priceOneWay"
                name="priceOneWay"
                type="number"
                value={fareData.priceOneWay || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priceRoundTrip">Round Trip Transfer (₹)</Label>
              <Input
                id="priceRoundTrip"
                name="priceRoundTrip"
                type="number"
                value={fareData.priceRoundTrip || 0}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
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
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold capitalize">
                {fareType} Fare Configuration
              </h3>
              
              <Button
                variant="outline"
                size="sm"
                onClick={syncFares}
                disabled={isSyncingFares || !vehicleId || (Date.now() - lastRefreshTimeRef.current < refreshCooldownMs)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingFares ? 'animate-spin' : ''}`} />
                Sync Fares
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
        <div className="flex justify-end w-full">
          <Button
            onClick={saveFareData}
            disabled={isSaving || isLoading || !vehicleId || (Date.now() - lastSaveTimeRef.current < saveCooldownMs)}
            className="mr-2"
          >
            {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={loadFareData}
            disabled={isLoading || !vehicleId || (Date.now() - lastRefreshTimeRef.current < refreshCooldownMs)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
