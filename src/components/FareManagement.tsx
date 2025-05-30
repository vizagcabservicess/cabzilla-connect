
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Save, Database, ChevronDown } from "lucide-react";
import { 
  fetchLocalFares, 
  fetchAirportFares, 
  updateLocalFares, 
  updateAirportFares, 
  syncLocalFares, 
  syncAirportFares, 
  initializeDatabaseTables 
} from '@/services/fareManagementService';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  // Additional fields for multi-tier pricing
  basePrice?: number;
  pricePerKm?: number;
  pickupPrice?: number;
  dropPrice?: number;
  tier1Price?: number;
  tier2Price?: number;
  tier3Price?: number;
  tier4Price?: number;
  extraKmCharge?: number;
  // For flexible property access
  [key: string]: any;
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingFares, setIsSyncingFares] = useState(false);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fareData, setFareData] = useState<FareData>({
    vehicleId: vehicleId,
    vehicle_id: vehicleId
  });
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicleId || '');
  const [availableVehicles, setAvailableVehicles] = useState<{id: string, name: string}[]>([]);
  
  const lastFetchTime = useRef<number>(0);
  const requestInProgress = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const fetchAttempts = useRef<number>(0);
  const maxFetchAttempts = 3;
  const lastRefreshTimeRef = useRef<number>(0);
  const lastSaveTimeRef = useRef<number>(0);
  const refreshCooldownMs = 5000; // 5 seconds between refreshes
  const saveCooldownMs = 2000; // 2 seconds between saves
  
  // Fetch available vehicles for selection
  const fetchAvailableVehicles = async () => {
    try {
      console.log("Fetching available vehicles...");
      const response = await directVehicleOperation(
        'api/admin/get-vehicles.php', 
        'GET', 
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      if (response && response.vehicles && Array.isArray(response.vehicles)) {
        const vehicles = response.vehicles.map((v: any) => ({
          id: v.vehicle_id || v.id,
          name: v.name || v.vehicle_id || v.id
        }));
        console.log("Available vehicles:", vehicles);
        setAvailableVehicles(vehicles);
        
        // If no vehicle is selected but we have vehicles available, select the first one
        if ((!selectedVehicle || selectedVehicle === '') && vehicles.length > 0) {
          const firstVehicle = vehicles[0].id;
          console.log("Auto-selecting first vehicle:", firstVehicle);
          setSelectedVehicle(firstVehicle);
          setFareData(prev => ({
            ...prev,
            vehicleId: firstVehicle,
            vehicle_id: firstVehicle
          }));
        }
      } else {
        console.warn("No vehicles returned or invalid format:", response);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
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
    
    const effectiveVehicleId = selectedVehicle || vehicleId;
    
    if (!effectiveVehicleId || effectiveVehicleId.trim() === '') {
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
      
      console.log(`Loading ${fareType} fare data for vehicle ID: ${effectiveVehicleId}`);
      
      if (fareType === 'local') {
        result = await fetchLocalFares(effectiveVehicleId);
      } else if (fareType === 'airport') {
        result = await fetchAirportFares(effectiveVehicleId);
      }
      
      if (result && result.length > 0) {
        const loadedFare = result[0];
        console.log(`Loaded ${fareType} fare data:`, loadedFare);
        
        const updatedFare = {
          ...loadedFare,
          vehicleId: effectiveVehicleId,
          vehicle_id: effectiveVehicleId
        };
        
        setFareData(updatedFare);
        setError(null);
      } else {
        console.warn('No fare data returned:', result);
        
        setFareData({ 
          vehicleId: effectiveVehicleId,
          vehicle_id: effectiveVehicleId 
        });
        
        setError(`No ${fareType} fare data found for this vehicle.`);
      }
    } catch (err) {
      console.error(`Error loading ${fareType} fare data:`, err);
      setError(`Failed to load fare data. ${err instanceof Error ? err.message : ''}`);
      
      setFareData({ 
        vehicleId: effectiveVehicleId,
        vehicle_id: effectiveVehicleId
      });
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
    
    const effectiveVehicleId = selectedVehicle || vehicleId;
    
    if (!effectiveVehicleId || effectiveVehicleId.trim() === '' || isSaving) {
      if (!effectiveVehicleId || effectiveVehicleId.trim() === '') {
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
        vehicleId: effectiveVehicleId,
        vehicle_id: effectiveVehicleId
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
          
          // Refresh vehicle list after sync
          await fetchAvailableVehicles();
          
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
  
  const initializeDatabase = async () => {
    if (isInitializingDB) return;
    
    setIsInitializingDB(true);
    setError(null);
    toast.info("Initializing database tables...");
    
    try {
      const success = await initializeDatabaseTables();
      
      if (success) {
        toast.success("Database tables initialized successfully");
        fetchAttempts.current = 0;
        
        // After successful initialization, sync fares
        try {
          if (fareType === 'airport') {
            await syncAirportFares();
          } else {
            await syncLocalFares();
          }
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares synced after initialization`);
          
          // Refresh vehicle list after initialization
          await fetchAvailableVehicles();
        } catch (syncError) {
          console.warn('Warning: Post-init sync failed:', syncError);
          // Continue anyway
        }
        
        // Then reload fare data
        setTimeout(() => {
          if (mountedRef.current) {
            loadFareData();
          }
        }, 1500);
      } else {
        toast.error("Failed to initialize database tables");
        setError("Failed to initialize database tables");
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      toast.error('Failed to initialize database');
      setError(`Failed to initialize database. ${err instanceof Error ? err.message : ''}`);
    } finally {
      if (mountedRef.current) {
        setIsInitializingDB(false);
      }
    }
  };
  
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    const numericValue = !isNaN(Number(value)) ? Number(value) : value;
    
    setFareData(prev => ({
      ...prev,
      [name]: numericValue,
      vehicleId: selectedVehicle || vehicleId,
      vehicle_id: selectedVehicle || vehicleId
    }));
  };
  
  const handleVehicleChange = (value: string) => {
    console.log("Selected vehicle changed to:", value);
    setSelectedVehicle(value);
    setFareData(prev => ({
      ...prev,
      vehicleId: value,
      vehicle_id: value
    }));
    
    // Load fare data for the selected vehicle
    fetchAttempts.current = 0;
    setTimeout(() => loadFareData(), 100);
  };
  
  useEffect(() => {
    mountedRef.current = true;
    fetchAttempts.current = 0;
    
    // Initialize vehicle selection
    setSelectedVehicle(vehicleId || '');
    setFareData(prev => ({
      ...prev,
      vehicleId: vehicleId,
      vehicle_id: vehicleId
    }));
    
    // First fetch available vehicles
    fetchAvailableVehicles().then(() => {
      // Then initialize database tables
      return initializeDatabaseTables();
    }).then(() => {
      // Finally load fare data
      if (vehicleId && vehicleId.trim() !== '') {
        loadFareData();
      }
    }).catch(err => {
      console.error('Error during component initialization:', err);
    });
    
    const handleFareDataUpdated = (event: Event) => {
      if (!mountedRef.current) return;
      
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      
      if (detail && detail.fareType === fareType && detail.vehicleId === (selectedVehicle || vehicleId)) {
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
  
  useEffect(() => {
    // When selectedVehicle changes, update the fare data
    if (selectedVehicle) {
      setFareData(prev => ({
        ...prev,
        vehicleId: selectedVehicle,
        vehicle_id: selectedVehicle
      }));
    }
  }, [selectedVehicle]);
  
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
              <Label htmlFor="tier2Price">Tier 2 Price (11-20km) (₹)</Label>
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
              <Label htmlFor="tier3Price">Tier 3 Price (21-30km) (₹)</Label>
              <Input
                id="tier3Price"
                name="tier3Price"
                type="number"
                value={fareData.tier3Price || 0}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier4Price">Tier 4 Price (&gt; 30km) (₹)</Label>
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
          </div>
        </>
      );
    }
    
    return null;
  };
  
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-6">
          <div className="mb-6">
            <Label htmlFor="vehicle-select">Select Vehicle</Label>
            <Select 
              value={selectedVehicle} 
              onValueChange={handleVehicleChange}
            >
              <SelectTrigger id="vehicle-select" className="w-full">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.length > 0 ? (
                  availableVehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-vehicles" disabled>No vehicles available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {renderFareFields()}
        </div>
      </CardContent>
      
      <CardFooter className="px-6 py-4 border-t flex justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={loadFareData}
            disabled={isLoading || !selectedVehicle}
          >
            {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          
          <Button 
            variant="outline"
            onClick={syncFares}
            disabled={isSyncingFares}
          >
            {isSyncingFares ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync Tables
          </Button>
          
          <Button 
            variant="outline"
            onClick={initializeDatabase}
            disabled={isInitializingDB}
          >
            {isInitializingDB ? <Spinner className="mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />}
            Initialize DB
          </Button>
        </div>
        
        <Button 
          onClick={saveFareData}
          disabled={isSaving || !selectedVehicle}
        >
          {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};
