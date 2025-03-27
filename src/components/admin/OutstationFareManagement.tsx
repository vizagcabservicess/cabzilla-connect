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
      
      fareService.clearCache();
      
      const types = await loadCabTypes(true);
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
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating fares for ${values.cabType}...`);
      console.log('Starting fare update for outstation with vehicle ID', values.cabType);
      
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
        
        fareService.clearCache();
        
        window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
        window.dispatchEvent(new CustomEvent('trip-fares-updated', {
          detail: { 
            timestamp: Date.now(),
            vehicleId: values.cabType
          }
        }));
        
        fareService.resetCabOptionsState();
        
        toast.success(`Fares updated for ${values.cabType}`);
      } catch (error) {
        console.error('Error updating fares:', error);
        throw error;
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
      
      await axios.get(`${apiBaseUrl}/api/outstation-fares.php`, {
        params: { 
          check_sync: 'true',
          vehicle_id: vehicleId,
          _t: Date.now()
        },
        headers: fareService.getBypassHeaders()
      });
      
      const fares = await fareService.getOutstationFaresForVehicle(vehicleId);
      console.log('Loaded outstation fares for vehicle:', fares);
      
      if (fares) {
        form.setValue("oneWayBasePrice", fares.basePrice || 0);
        form.setValue("oneWayPricePerKm", fares.pricePerKm || 0);
        form.setValue("roundTripBasePrice", fares.roundTripBasePrice || 0);
        form.setValue("roundTripPricePerKm", fares.roundTripPricePerKm || 0);
        form.setValue("driverAllowance", fares.driverAllowance || 0);
        form.setValue("nightHalt", fares.nightHaltCharge || 0);
        return;
      }
    } catch (fareError) {
      console.error('Error fetching fares directly:', fareError);
    }
    
    const vehicles = await loadCabTypes(true);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (vehicle && vehicle.outstationFares) {
      console.log('Loaded outstation fares from vehicle data:', vehicle.outstationFares);
      
      form.setValue("oneWayBasePrice", vehicle.outstationFares.basePrice || 0);
      form.setValue("oneWayPricePerKm", vehicle.outstationFares.pricePerKm || 0);
      form.setValue("roundTripBasePrice", vehicle.outstationFares.roundTripBasePrice || 0);
      form.setValue("roundTripPricePerKm", vehicle.outstationFares.roundTripPricePerKm || 0);
      form.setValue("driverAllowance", vehicle.outstationFares.driverAllowance || 0);
      form.setValue("nightHalt", vehicle.outstationFares.nightHaltCharge || 0);
      return;
    } 
    
    console.log('No existing fares found for vehicle, using defaults');
    setDefaultPricesForVehicle(vehicleId);
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
                            step="0.01"
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
                            step="0.01"
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
