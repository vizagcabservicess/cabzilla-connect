import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Database, RefreshCw, Save, RotateCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService, syncVehicleData } from '@/lib';
import { FareUpdateError } from '../cab-options/FareUpdateError';
import axios from 'axios';
import { directVehicleOperation } from '@/utils/apiHelper';
import { getAllVehiclesForAdmin, clearVehicleDataCache } from '@/services/vehicleDataService';

const formSchema = z.object({
  cabType: z.string().min(1, { message: "Cab type is required" }),
  oneWayBasePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  oneWayPricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  roundTripBasePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  roundTripPricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
  nightHalt: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
});

export function OutstationFareManagement() {
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [isSyncingTables, setIsSyncingTables] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("one-way");
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabType: "",
      oneWayBasePrice: 0,
      oneWayPricePerKm: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0,
      driverAllowance: 0,
      nightHalt: 0,
    },
  });
  
  useEffect(() => {
    loadData();
    
    // Add event listener for fare updates
    const handleFareUpdate = () => {
      console.log('Fare update event detected, refreshing data');
      loadData();
    };
    
    window.addEventListener('trip-fares-updated', handleFareUpdate);
    window.addEventListener('fare-cache-cleared', handleFareUpdate);
    window.addEventListener('vehicles-updated', handleFareUpdate);
    window.addEventListener('vehicle-data-refreshed', handleFareUpdate);
    window.addEventListener('vehicle-data-cache-cleared', handleFareUpdate);
    
    return () => {
      window.removeEventListener('trip-fares-updated', handleFareUpdate);
      window.removeEventListener('fare-cache-cleared', handleFareUpdate);
      window.removeEventListener('vehicles-updated', handleFareUpdate);
      window.removeEventListener('vehicle-data-refreshed', handleFareUpdate);
      window.removeEventListener('vehicle-data-cache-cleared', handleFareUpdate);
    };
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clear cache before loading data
      fareService.clearCache();
      clearVehicleDataCache();
      
      // First try to forcefully sync between database and JSON
      try {
        console.log("Syncing vehicle data between database and JSON...");
        await syncVehicleData();
      } catch (syncErr) {
        console.warn("Failed to sync vehicle data:", syncErr);
      }
      
      // Use our enhanced vehicle service to get all vehicles
      const vehicles = await getAllVehiclesForAdmin(true);
      
      if (vehicles && vehicles.length > 0) {
        console.log('Loaded vehicles for outstation fare management:', vehicles);
        setCabTypes(vehicles);
        
        // Cache in localStorage for quick recovery
        try {
          localStorage.setItem('adminVehicles', JSON.stringify(vehicles));
        } catch (cacheErr) {
          console.warn('Could not cache admin vehicles:', cacheErr);
        }
      } else {
        throw new Error('No vehicles found in database');
      }
    } catch (err) {
      console.error("Error loading cab types:", err);
      setError(err instanceof Error ? err : new Error('Failed to load cab types'));
      
      // Try to load from local storage as fallback
      try {
        const cachedVehicles = localStorage.getItem('adminVehicles') || 
                              localStorage.getItem('cachedVehicles');
        if (cachedVehicles) {
          const vehicles = JSON.parse(cachedVehicles) as CabType[];
          console.log('Using cached vehicles from localStorage:', vehicles);
          setCabTypes(vehicles);
          toast.info('Using cached vehicle data from local storage');
        }
      } catch (cacheErr) {
        console.error('Error loading from cache:', cacheErr);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const initializeDatabase = async () => {
    try {
      setIsInitializingDB(true);
      setError(null);
      
      toast.info('Initializing database tables...');
      
      // First try to sync between tables to ensure consistency
      try {
        const syncEndpoint = `${apiBaseUrl}/api/admin/sync-outstation-fares.php?_t=${Date.now()}`;
        console.log("Syncing outstation fares tables:", syncEndpoint);
        await axios.get(syncEndpoint, {
          headers: fareService.getBypassHeaders(),
          timeout: 10000 // 10 second timeout
        });
        toast.success("Outstation fares tables synchronized");
      } catch (syncErr) {
        console.error("Error syncing outstation fares:", syncErr);
        toast.error("Failed to sync tables, will try database initialization");
      }
      
      // Try multiple initialization approaches
      try {
        // First try the direct endpoint
        const directEndpoint = `${apiBaseUrl}/api/init-database.php?_t=${Date.now()}`;
        console.log('Trying direct initialization endpoint:', directEndpoint);
        
        const directResponse = await axios.get(directEndpoint, {
          headers: fareService.getBypassHeaders(),
          timeout: 15000
        });
        
        console.log('Direct initialization response:', directResponse.data);
        toast.success('Database initialized via direct endpoint');
      } catch (directError) {
        console.error('Direct initialization failed:', directError);
        
        // Try the fareService method
        try {
          const result = await fareService.initializeDatabase(true);
          console.log('Database initialization response via service:', result);
          toast.success("Database tables initialized successfully via service");
        } catch (serviceError) {
          console.error('Service initialization failed:', serviceError);
          toast.error('Both initialization methods failed');
          throw serviceError;
        }
      }
      
      // After initialization, refresh data
      await loadData();
    } catch (err) {
      console.error("Error initializing database:", err);
      toast.error(`Failed to initialize database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    } finally {
      setIsInitializingDB(false);
    }
  };
  
  const syncTables = async () => {
    try {
      setIsSyncingTables(true);
      setError(null);
      
      const syncEndpoint = `${apiBaseUrl}/api/admin/sync-outstation-fares.php?_t=${Date.now()}`;
      toast.info("Syncing outstation fares tables...");
      
      const response = await axios.get(syncEndpoint, { 
        headers: fareService.getBypassHeaders(),
        timeout: 10000
      });
      
      console.log('Sync response:', response.data);
      toast.success("Tables synchronized successfully");
      
      // Clear caches after sync
      fareService.clearCache();
      
      // Reload data
      await loadData();
    } catch (err) {
      console.error("Error syncing tables:", err);
      toast.error(`Failed to sync tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to sync tables'));
    } finally {
      setIsSyncingTables(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating fares for ${values.cabType}...`);
      console.log('Starting fare update for outstation with vehicle ID', values.cabType);
      
      // Create FormData for better PHP compatibility
      const formData = new FormData();
      formData.append('vehicleId', values.cabType);
      formData.append('oneWayBasePrice', values.oneWayBasePrice.toString());
      formData.append('oneWayPricePerKm', values.oneWayPricePerKm.toString());
      formData.append('roundTripBasePrice', values.roundTripBasePrice.toString());
      formData.append('roundTripPricePerKm', values.roundTripPricePerKm.toString());
      formData.append('driverAllowance', values.driverAllowance.toString());
      formData.append('nightHalt', values.nightHalt.toString());
      formData.append('nightHaltCharge', values.nightHalt.toString()); // Add both name variants
      
      // Try multiple endpoints and approaches sequentially
      let success = false;
      
      // 1. Try direct PHP endpoint first with FormData
      try {
        const directEndpoint = `${apiBaseUrl}/api/admin/outstation-fares-update.php`;
        console.log(`Trying direct endpoint with FormData: ${directEndpoint}`);
        
        const directResponse = await fetch(directEndpoint, {
          method: 'POST',
          headers: {
            ...fareService.getBypassHeaders(),
            'X-Debug-Mode': 'true'
          },
          body: formData
        });
        
        const responseText = await directResponse.text();
        console.log('Direct update response text:', responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
          console.log('Parsed response:', responseData);
        } catch (e) {
          console.log('Could not parse as JSON:', e);
          responseData = { raw: responseText };
        }
        
        if (directResponse.ok) {
          console.log('Successfully updated fares via direct endpoint');
          success = true;
        } else {
          console.error('Direct endpoint returned error status:', directResponse.status);
        }
      } catch (directError) {
        console.error('Error using direct outstation endpoint:', directError);
      }
      
      // 2. Try the standard directFareUpdate method if direct endpoint failed
      if (!success) {
        try {
          console.log('Trying fareService.directFareUpdate method');
          const result = await fareService.directFareUpdate('outstation', values.cabType, {
            basePrice: values.oneWayBasePrice,
            pricePerKm: values.oneWayPricePerKm,
            roundTripBasePrice: values.roundTripBasePrice,
            roundTripPricePerKm: values.roundTripPricePerKm,
            driverAllowance: values.driverAllowance,
            nightHaltCharge: values.nightHalt,
          });
          
          console.log('Fare update result:', result);
          success = true;
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          
          // Try one more approach before giving up
          try {
            // Try with different content type
            const jsonEndpoint = `${apiBaseUrl}/api/admin/outstation-fares-update.php`;
            console.log(`Trying JSON endpoint: ${jsonEndpoint}`);
            
            const jsonResponse = await axios.post(jsonEndpoint, {
              vehicleId: values.cabType,
              oneWayBasePrice: values.oneWayBasePrice,
              oneWayPricePerKm: values.oneWayPricePerKm,
              roundTripBasePrice: values.roundTripBasePrice,
              roundTripPricePerKm: values.roundTripPricePerKm,
              driverAllowance: values.driverAllowance,
              nightHalt: values.nightHalt,
              nightHaltCharge: values.nightHalt
            }, {
              headers: {
                ...fareService.getBypassHeaders(),
                'Content-Type': 'application/json'
              }
            });
            
            console.log('JSON response:', jsonResponse.data);
            success = true;
          } catch (jsonError) {
            console.error('JSON approach failed:', jsonError);
            throw fallbackError;
          }
        }
      }
      
      // After updating, force sync between tables and also sync vehicle data
      try {
        console.log("Syncing outstation_fares with vehicle_pricing");
        const syncResponse = await axios.get(`${apiBaseUrl}/api/admin/sync-outstation-fares.php`, {
          params: { 
            _t: Date.now() // Cache busting
          },
          headers: fareService.getBypassHeaders()
        });
        console.log('Sync response:', syncResponse.data);
        
        // Also sync vehicle data between database and JSON file
        await syncVehicleData();
      } catch (syncError) {
        console.error('Error syncing tables after update:', syncError);
        // Continue anyway - this is just an additional step
      }
      
      // Clear all caches
      fareService.clearCache();
      
      // Dispatch events to update UI
      window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          vehicleId: values.cabType
        }
      }));
      window.dispatchEvent(new CustomEvent('vehicles-updated'));
      
      fareService.resetCabOptionsState();
      
      toast.success(`Fares updated for ${values.cabType}`);
      
      // Force a reload of the fares for this vehicle
      loadFaresForVehicle(values.cabType);
    } catch (err) {
      console.error('Error updating fares:', err);
      setError(err instanceof Error ? err : new Error('Failed to update fares'));
      toast.error(`Failed to update fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadFaresForVehicle = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    try {
      setIsLoading(true);
      
      // First try to get from cached cab types
      try {
        const vehicle = cabTypes.find(v => v.id === vehicleId);
        
        if (vehicle && vehicle.outstationFares) {
          console.log('Loaded outstation fares from vehicle data:', vehicle.outstationFares);
          
          form.setValue("oneWayBasePrice", vehicle.outstationFares.basePrice || 0);
          form.setValue("oneWayPricePerKm", vehicle.outstationFares.pricePerKm || 0);
          form.setValue("roundTripBasePrice", vehicle.outstationFares.roundTripBasePrice || 0);
          form.setValue("roundTripPricePerKm", vehicle.outstationFares.roundTripPricePerKm || 0);
          form.setValue("driverAllowance", vehicle.outstationFares.driverAllowance || 0);
          form.setValue("nightHalt", vehicle.outstationFares.nightHaltCharge || vehicle.outstationFares.nightHalt || 0);
          setIsLoading(false);
          return;
        }
      } catch (vehicleError) {
        console.error('Error loading from cached vehicles:', vehicleError);
      }
      
      // First try the direct endpoint with sync param
      try {
        await axios.get(`${apiBaseUrl}/api/outstation-fares.php`, {
          params: { 
            check_sync: 'true',
            vehicle_id: vehicleId,
            _t: Date.now()
          },
          headers: fareService.getBypassHeaders(),
          timeout: 8000 // 8 second timeout
        });
      } catch (directError) {
        console.error('Error fetching from direct endpoint:', directError);
        // Continue anyway - we'll try another approach
      }
      
      // Now try to get the fares via the service
      try {
        const fares = await fareService.getOutstationFaresForVehicle(vehicleId);
        console.log('Loaded outstation fares for vehicle:', fares);
        
        if (fares) {
          form.setValue("oneWayBasePrice", fares.basePrice || 0);
          form.setValue("oneWayPricePerKm", fares.pricePerKm || 0);
          form.setValue("roundTripBasePrice", fares.roundTripBasePrice || 0);
          form.setValue("roundTripPricePerKm", fares.roundTripPricePerKm || 0);
          form.setValue("driverAllowance", fares.driverAllowance || 0);
          form.setValue("nightHalt", fares.nightHaltCharge || fares.nightHalt || 0);
          setIsLoading(false);
          return;
        }
      } catch (fareError) {
        console.error('Error fetching fares via service:', fareError);
        // Continue to fallback options
      }
      
      // If all else fails, use default values
      console.log('No existing fares found for vehicle, using defaults');
      setDefaultPricesForVehicle(vehicleId);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in loadFaresForVehicle:', error);
      setError(error instanceof Error ? error : new Error('Failed to load fares for vehicle'));
      setIsLoading(false);
      setDefaultPricesForVehicle(vehicleId);
    }
  };
  
  const setDefaultPricesForVehicle = (vehicleId: string) => {
    if (vehicleId === 'sedan') {
      form.setValue("oneWayBasePrice", 4200);
      form.setValue("oneWayPricePerKm", 14);
      form.setValue("roundTripBasePrice", 4000);
      form.setValue("roundTripPricePerKm", 12);
      form.setValue("driverAllowance", 250);
      form.setValue("nightHalt", 700);
    } else if (vehicleId === 'ertiga' || vehicleId === 'suv') {
      form.setValue("oneWayBasePrice", 5400);
      form.setValue("oneWayPricePerKm", 18);
      form.setValue("roundTripBasePrice", 5000);
      form.setValue("roundTripPricePerKm", 15);
      form.setValue("driverAllowance", 250);
      form.setValue("nightHalt", 1000);
    } else if (vehicleId === 'innova' || vehicleId === 'innova_crysta') {
      form.setValue("oneWayBasePrice", 6000);
      form.setValue("oneWayPricePerKm", 20);
      form.setValue("roundTripBasePrice", 5600);
      form.setValue("roundTripPricePerKm", 17);
      form.setValue("driverAllowance", 250);
      form.setValue("nightHalt", 1000);
    } else if (vehicleId === 'luxury') {
      form.setValue("oneWayBasePrice", 10500);
      form.setValue("oneWayPricePerKm", 25);
      form.setValue("roundTripBasePrice", 10000);
      form.setValue("roundTripPricePerKm", 22);
      form.setValue("driverAllowance", 300);
      form.setValue("nightHalt", 1500);
    } else if (vehicleId === 'tempo' || vehicleId === 'tempo_traveller') {
      form.setValue("oneWayBasePrice", 9000);
      form.setValue("oneWayPricePerKm", 22);
      form.setValue("roundTripBasePrice", 8500);
      form.setValue("roundTripPricePerKm", 19);
      form.setValue("driverAllowance", 300);
      form.setValue("nightHalt", 1500);
    } else {
      form.setValue("oneWayBasePrice", 4200);
      form.setValue("oneWayPricePerKm", 14);
      form.setValue("roundTripBasePrice", 4000);
      form.setValue("roundTripPricePerKm", 12);
      form.setValue("driverAllowance", 250);
      form.setValue("nightHalt", 700);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Outstation Fare Management</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              disabled={isLoading}
            >
              <RotateCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <FareUpdateError 
              error={error} 
              onRetry={loadData}
              title="Fare Update Failed"
              description="There was a problem updating the fares. This could be due to network issues or server problems."
            />
          )}
          
          <div className="flex space-x-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeDatabase} 
              disabled={isInitializingDB}
            >
              {isInitializingDB ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Initialize DB Tables
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={syncTables}
              disabled={isSyncingTables}
            >
              {isSyncingTables ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Tables
                </>
              )}
            </Button>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="one-way" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="one-way">One Way</TabsTrigger>
                  <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
                </TabsList>
                
                <TabsContent value="one-way" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="cabType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            loadFaresForVehicle(value);
                          }}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a vehicle type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cabTypes.length > 0 ? (
                              cabTypes.map((cab) => (
                                <SelectItem key={cab.id} value={cab.id}>
                                  {cab.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="loading" disabled>
                                {isLoading ? "Loading vehicles..." : "No vehicles found"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="oneWayBasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="oneWayPricePerKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Per KM (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="round-trip" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roundTripBasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="roundTripPricePerKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Per KM (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driverAllowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Allowance (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nightHalt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Night Halt Charge (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Fares
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
