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
import { fareService } from '@/services/fareService';
import { FareUpdateError } from '../cab-options/FareUpdateError';
import axios from 'axios';

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
  const [isSyncing, setIsSyncing] = useState(false);
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
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load cab types
      const types = await loadCabTypes(true);
      setCabTypes(types);
      
      // Pre-select the first cab type if available
      if (types.length > 0 && !form.getValues('cabType')) {
        form.setValue('cabType', types[0].id);
        loadFaresForVehicle(types[0].id);
      }
      
    } catch (err) {
      console.error("Error loading cab types:", err);
      setError(err instanceof Error ? err : new Error('Failed to load cab types'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const initializeDatabase = async () => {
    try {
      setIsInitializingDB(true);
      setError(null);
      
      // First try to sync between tables to ensure consistency
      await forceSyncTables();
      
      const result = await fareService.initializeDatabase(true);
      console.log('Database initialization response:', result);
      
      toast.success("Database tables initialized successfully");
      await loadData();
    } catch (err) {
      console.error("Error initializing database:", err);
      toast.error(`Failed to initialize database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    } finally {
      setIsInitializingDB(false);
    }
  };
  
  const forceSyncTables = async (vehicleId?: string) => {
    try {
      setIsSyncing(true);
      setError(null);
      
      // Create URL for sync endpoint
      const params = new URLSearchParams();
      params.append('_t', Date.now().toString());
      params.append('direction', 'to_vehicle_pricing');
      
      if (vehicleId) {
        params.append('vehicle_id', vehicleId);
      }
      
      const syncEndpoint = `${apiBaseUrl}/api/admin/force-sync-outstation-fares.php?${params.toString()}`;
      console.log("Force syncing outstation fares tables:", syncEndpoint);
      
      const response = await axios.get(syncEndpoint, {
        headers: fareService.getBypassHeaders(),
        timeout: 15000 // 15 second timeout
      });
      
      console.log('Sync response:', response.data);
      
      if (response.data.status === 'success') {
        toast.success("Tables synchronized successfully");
        fareService.clearCache();
      } else {
        toast.error("Sync completed with issues, check console for details");
      }
      
      return response.data;
    } catch (err) {
      console.error("Error syncing outstation fares:", err);
      toast.error(`Failed to sync tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to sync tables'));
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating fares for ${values.cabType}...`);
      console.log('Starting fare update for outstation with vehicle ID', values.cabType);
      
      // First, try the direct outstation-fares-update.php endpoint
      try {
        const directEndpoint = `${apiBaseUrl}/api/admin/direct-outstation-fares.php`;
        console.log(`Trying direct endpoint: ${directEndpoint}`);
        
        const formData = new FormData();
        formData.append('vehicleId', values.cabType);
        formData.append('basePrice', values.oneWayBasePrice.toString());
        formData.append('pricePerKm', values.oneWayPricePerKm.toString());
        formData.append('roundTripBasePrice', values.roundTripBasePrice.toString());
        formData.append('roundTripPricePerKm', values.roundTripPricePerKm.toString());
        formData.append('driverAllowance', values.driverAllowance.toString());
        formData.append('nightHalt', values.nightHalt.toString());
        
        const directResponse = await axios.post(directEndpoint, formData, {
          headers: {
            ...fareService.getBypassHeaders(),
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000 // 15 second timeout
        });
        
        console.log('Direct update response:', directResponse.data);
        if (directResponse.data && directResponse.data.status === 'success') {
          console.log('Successfully updated fares via direct endpoint');
        } else {
          throw new Error('Direct update response was not successful');
        }
      } catch (directError) {
        console.error('Error using direct outstation endpoint:', directError);
        
        // Fallback to the standard directFareUpdate method
        try {
          const result = await fareService.directFareUpdate('outstation', values.cabType, {
            basePrice: values.oneWayBasePrice,
            pricePerKm: values.oneWayPricePerKm,
            roundTripBasePrice: values.roundTripBasePrice,
            roundTripPricePerKm: values.roundTripPricePerKm,
            driverAllowance: values.driverAllowance,
            nightHaltCharge: values.nightHalt,
          });
          
          console.log('Fare update result:', result);
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          throw new Error('Failed to update fares through both methods');
        }
      }
      
      // After updating, force sync between tables
      try {
        console.log("Force syncing tables after update");
        await forceSyncTables(values.cabType);
      } catch (syncError) {
        console.error('Error syncing tables after update:', syncError);
        // Continue anyway, we'll just show a warning
        toast.warning("Fares updated but table sync may be incomplete. Please try the 'Force Sync' button.");
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
      
      fareService.resetCabOptionsState();
      
      toast.success(`Fares updated for ${values.cabType}`);
      
      // Force a reload of the fares for this vehicle
      await loadFaresForVehicle(values.cabType);
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
      setError(null);
      
      // Try to get from cached cab types first (fastest)
      try {
        const vehicles = cabTypes.length > 0 ? cabTypes : await loadCabTypes(true);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (vehicle && vehicle.outstationFares) {
          console.log('Loaded outstation fares from vehicle data:', vehicle.outstationFares);
          
          form.setValue("oneWayBasePrice", vehicle.outstationFares.basePrice || 0);
          form.setValue("oneWayPricePerKm", vehicle.outstationFares.pricePerKm || 0);
          form.setValue("roundTripBasePrice", vehicle.outstationFares.roundTripBasePrice || 0);
          form.setValue("roundTripPricePerKm", vehicle.outstationFares.roundTripPricePerKm || 0);
          form.setValue("driverAllowance", vehicle.outstationFares.driverAllowance || 0);
          form.setValue("nightHalt", vehicle.outstationFares.nightHaltCharge || 0);
          setIsLoading(false);
          return;
        }
      } catch (vehicleError) {
        console.error('Error loading from cached vehicles:', vehicleError);
      }
      
      // Now try to get the fares via the API directly
      try {
        // First try the direct endpoint with sync param
        const timestamp = Date.now();
        const queryParams = new URLSearchParams({
          vehicle_id: vehicleId,
          check_sync: 'true',
          _t: timestamp.toString()
        });
        
        const response = await axios.get(`${apiBaseUrl}/api/outstation-fares.php?${queryParams.toString()}`, {
          headers: fareService.getBypassHeaders(),
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Fetching outstation fares for vehicle', vehicleId, 'with timestamp:', timestamp);
        console.log('Response:', response.data);
        
        if (response.data && response.data.fares && response.data.fares[vehicleId]) {
          const fare = response.data.fares[vehicleId];
          console.log('Outstation fares for vehicle', vehicleId, ':', fare);
          console.log('Source table:', response.data.sourceTable);
          
          form.setValue("oneWayBasePrice", fare.basePrice || 0);
          form.setValue("oneWayPricePerKm", fare.pricePerKm || 0);
          form.setValue("roundTripBasePrice", fare.roundTripBasePrice || 0);
          form.setValue("roundTripPricePerKm", fare.roundTripPricePerKm || 0);
          form.setValue("driverAllowance", fare.driverAllowance || 0);
          form.setValue("nightHalt", fare.nightHaltCharge || 0);
          setIsLoading(false);
          return;
        }
      } catch (directError) {
        console.error('Error fetching from direct endpoint:', directError);
      }
      
      // Fall back to the service method
      try {
        const fares = await fareService.getOutstationFaresForVehicle(vehicleId);
        console.log('Loaded outstation fares for vehicle:', fares);
        
        if (fares) {
          form.setValue("oneWayBasePrice", fares.basePrice || 0);
          form.setValue("oneWayPricePerKm", fares.pricePerKm || 0);
          form.setValue("roundTripBasePrice", fares.roundTripBasePrice || 0);
          form.setValue("roundTripPricePerKm", fares.roundTripPricePerKm || 0);
          form.setValue("driverAllowance", fares.driverAllowance || 0);
          form.setValue("nightHalt", fares.nightHaltCharge || 0);
          setIsLoading(false);
          return;
        }
      } catch (fareError) {
        console.error('Error fetching fares via service:', fareError);
      }
      
      // If all else fails, use default values
      console.log('No existing fares found for vehicle, using defaults');
      setDefaultPricesForVehicle(vehicleId);
      toast.warning("Could not fetch existing fares, using default values");
    } catch (error) {
      console.error('Error in loadFaresForVehicle:', error);
      setError(error instanceof Error ? error : new Error('Failed to load fares for vehicle'));
      toast.error("Failed to load fares, using default values");
      setDefaultPricesForVehicle(vehicleId);
    } finally {
      setIsLoading(false);
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
      form.setValue("oneWayBasePrice", 4500);
      form.setValue("oneWayPricePerKm", 15);
      form.setValue("roundTripBasePrice", 4000);
      form.setValue("roundTripPricePerKm", 13);
      form.setValue("driverAllowance", 250);
      form.setValue("nightHalt", 1000);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Outstation Fare Management</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => forceSyncTables()}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RotateCw className="mr-2 h-4 w-4" />
                Force Sync
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={initializeDatabase} 
            disabled={isInitializingDB || isLoading}
          >
            {isInitializingDB ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Init Database
              </>
            )}
          </Button>
        </div>
      </div>
      
      {error && (
        <FareUpdateError 
          error={error}
          onRetry={loadData}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Outstation Fares</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="cabType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cab Type</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={(value) => {
                        field.onChange(value);
                        loadFaresForVehicle(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cab type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cabTypes.map((cab) => (
                          <SelectItem key={cab.id} value={cab.id}>
                            {cab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Tabs defaultValue="one-way" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="one-way">One Way</TabsTrigger>
                  <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
                </TabsList>
                
                <TabsContent value="one-way" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="oneWayBasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="100" 
                            placeholder="0" 
                            {...field} 
                            disabled={isLoading} 
                          />
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
                        <FormLabel>Price Per Km (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="1" 
                            placeholder="0" 
                            {...field} 
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="round-trip" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="roundTripBasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Round Trip Base Price (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="100" 
                            placeholder="0" 
                            {...field} 
                            disabled={isLoading} 
                          />
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
                        <FormLabel>Round Trip Price Per Km (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="1" 
                            placeholder="0" 
                            {...field} 
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        <Input 
                          type="number" 
                          min="0" 
                          step="50" 
                          placeholder="0" 
                          {...field} 
                          disabled={isLoading} 
                        />
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
                        <Input 
                          type="number" 
                          min="0" 
                          step="100" 
                          placeholder="0" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Alert className="bg-yellow-50 text-yellow-800 border-yellow-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These fares will apply to all outstation trips for this cab type.
                </AlertDescription>
              </Alert>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isInitializingDB || isSyncing}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
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
