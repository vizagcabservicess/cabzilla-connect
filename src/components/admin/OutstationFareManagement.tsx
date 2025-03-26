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
import { AlertCircle, Database, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { FareUpdateError } from '../cab-options/FareUpdateError';

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
      
      // Force clear caches to ensure we get fresh data
      fareService.clearCache();
      
      // Load cab types
      const types = await loadCabTypes();
      setCabTypes(types);
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cab types'));
      setIsLoading(false);
    }
  };
  
  const initializeDatabase = async () => {
    try {
      setIsInitializingDB(true);
      setError(null);
      
      const apiUrl = `${apiBaseUrl}/api/admin/init-database.php`;
      console.log('Initializing database with API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to initialize database: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error('Non-JSON response received from server');
      }
      
      const data = await response.json();
      console.log('Database initialization response:', data);
      
      if (data.status === 'success') {
        toast.success("Database tables initialized successfully");
        // Reload cab types after successful initialization
        await loadData();
      } else {
        throw new Error(data.message || "Failed to initialize database");
      }
    } catch (err) {
      console.error("Error initializing database:", err);
      toast.error(`Failed to initialize database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    } finally {
      setIsInitializingDB(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating fares for ${values.cabType}...`);
      console.log('Starting fare update for outstation with vehicle ID', values.cabType);
      
      // First attempt - use the fare-update.php endpoint
      try {
        const endpoint = `${apiBaseUrl}/api/admin/fare-update.php`;
        
        // Create form data
        const formData = new FormData();
        formData.append('vehicleId', values.cabType);
        formData.append('tripType', 'outstation');
        formData.append('basePrice', values.oneWayBasePrice.toString());
        formData.append('pricePerKm', values.oneWayPricePerKm.toString());
        formData.append('roundTripBasePrice', values.roundTripBasePrice.toString());
        formData.append('roundTripPricePerKm', values.roundTripPricePerKm.toString());
        formData.append('driverAllowance', values.driverAllowance.toString());
        formData.append('nightHaltCharge', values.nightHalt.toString());
        
        console.log('Submitting form data:', Object.fromEntries(formData));
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          const text = await response.text();
          console.error('Error response:', text);
          throw new Error(`Server returned ${response.status}: ${text}`);
        }
        
        const data = await response.json();
        console.log('Fare update response:', data);
        
        if (data.status === 'success') {
          // Clear cache and trigger refresh events
          fareService.clearCache();
          
          // Dispatch events to refresh UI
          window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
          window.dispatchEvent(new CustomEvent('trip-fares-updated', {
            detail: { 
              timestamp: Date.now(),
              vehicleId: values.cabType
            }
          }));
          
          toast.success(`Fares updated for ${values.cabType}`);
        } else {
          throw new Error(data.message || 'Update failed');
        }
      } catch (fetchError) {
        console.error('Error with fare update:', fetchError);
        throw fetchError;
      }
    } catch (err) {
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
      
      // Fetch all vehicle data - fixing the error by removing the boolean argument
      const vehicles = await loadCabTypes();
      const vehicle = vehicles.find(v => v.id === vehicleId);
      
      if (vehicle && vehicle.outstationFares) {
        console.log('Loaded existing outstation fares for vehicle:', vehicle.outstationFares);
        form.setValue("oneWayBasePrice", vehicle.outstationFares.basePrice || 0);
        form.setValue("oneWayPricePerKm", vehicle.outstationFares.pricePerKm || 0);
        form.setValue("roundTripBasePrice", vehicle.outstationFares.roundTripBasePrice || 0);
        form.setValue("roundTripPricePerKm", vehicle.outstationFares.roundTripPricePerKm || 0);
        form.setValue("driverAllowance", vehicle.outstationFares.driverAllowance || 0);
        form.setValue("nightHalt", vehicle.outstationFares.nightHaltCharge || 0);
      } else {
        console.log('No existing fares found for vehicle, using defaults');
        // Set default values based on vehicle type
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
          // Default values for any other vehicle
          form.setValue("oneWayBasePrice", 4200);
          form.setValue("oneWayPricePerKm", 14);
          form.setValue("roundTripBasePrice", 4000);
          form.setValue("roundTripPricePerKm", 12);
          form.setValue("driverAllowance", 250);
          form.setValue("nightHalt", 700);
        }
      }
    } catch (error) {
      console.error("Error loading fares for vehicle:", error);
      toast.error("Failed to load fare data for vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Outstation Fare Management</CardTitle>
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
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={initializeDatabase} 
            disabled={isInitializingDB}
            className="mb-4"
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
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cabType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Load existing fare data for this cab type
                        loadFaresForVehicle(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vehicle type" />
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
              
              <Tabs defaultValue="one-way" onValueChange={setActiveTab} value={activeTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="one-way">One Way</TabsTrigger>
                  <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
                </TabsList>
                
                <TabsContent value="one-way" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="oneWayBasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="font-mono"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <FormLabel>Price Per KM</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="font-mono"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="round-trip" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="roundTripBasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Round Trip Base Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="font-mono"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <FormLabel>Round Trip Price Per KM</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            className="font-mono"
                            min="0"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driverAllowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Allowance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                      <FormLabel>Night Halt Charge</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          min="0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={loadData} disabled={isLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button type="submit" disabled={isLoading}>
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
