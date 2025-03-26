import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  RefreshCw, 
  Save, 
  PlusCircle, 
  Truck,
  Repeat,
  ArrowRight
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { fareAPI } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';

const fareFormSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle is required" }),
  basePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
  tripMode: z.enum(['one-way', 'round-trip'])
});

export function OutstationFareManagement() {
  const [vehicles, setVehicles] = useState<Array<{ id: string, name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTripMode, setSelectedTripMode] = useState<'one-way' | 'round-trip'>('one-way');
  
  const form = useForm<z.infer<typeof fareFormSchema>>({
    resolver: zodResolver(fareFormSchema),
    defaultValues: {
      vehicleId: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
      tripMode: 'one-way'
    },
  });
  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
  const fetchVehicles = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const vehicleData = await fareAPI.getVehicles();
      
      if (Array.isArray(vehicleData) && vehicleData.length > 0) {
        const formattedVehicles = vehicleData.map(vehicle => ({
          id: vehicle.id || vehicle.vehicleId,
          name: vehicle.name
        }));
        setVehicles(formattedVehicles);
        toast.success("Vehicles loaded successfully");
      } else {
        console.warn("Empty or invalid vehicle data:", vehicleData);
        setError("No vehicle data available. The API may be down or returned an empty result.");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to load vehicles. Please try again.");
      toast.error("Failed to load vehicles");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleTripModeChange = (mode: 'one-way' | 'round-trip') => {
    setSelectedTripMode(mode);
    form.setValue('tripMode', mode);
    
    // Reset selected vehicle to reload pricing
    if (form.getValues().vehicleId) {
      handleVehicleSelect(form.getValues().vehicleId);
    }
  };
  
  const handleVehicleSelect = async (vehicleId: string) => {
    try {
      setIsLoading(true);
      
      // Get outstation pricing for this vehicle based on trip mode
      const outstationData = await fareAPI.getOutstationFares(vehicleId, selectedTripMode);
      
      if (outstationData) {
        console.log(`Loaded ${selectedTripMode} fares for ${vehicleId}:`, outstationData);
        
        form.setValue("vehicleId", vehicleId);
        form.setValue("basePrice", outstationData.basePrice || 0);
        form.setValue("pricePerKm", outstationData.pricePerKm || 0);
        form.setValue("nightHaltCharge", outstationData.nightHaltCharge || 0);
        form.setValue("driverAllowance", outstationData.driverAllowance || 0);
        form.setValue("tripMode", selectedTripMode);
      } else {
        // If no data found, reset the form to defaults but keep vehicleId
        form.setValue("vehicleId", vehicleId);
        form.setValue("basePrice", 0);
        form.setValue("pricePerKm", 0);
        form.setValue("nightHaltCharge", 0);
        form.setValue("driverAllowance", 0);
        form.setValue("tripMode", selectedTripMode);
      }
    } catch (error) {
      console.error("Error fetching outstation pricing:", error);
      toast.error("Failed to load outstation pricing");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof fareFormSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting outstation fare update:", values);
      
      // Clear caches
      localStorage.removeItem('cabFares');
      localStorage.removeItem('outstation_fares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('outstation_fares');
      
      // Add retries to handle intermittent connection issues
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          const data = await fareAPI.updateOutstationFares({
            vehicleId: values.vehicleId,
            basePrice: values.basePrice,
            pricePerKm: values.pricePerKm,
            nightHaltCharge: values.nightHaltCharge,
            driverAllowance: values.driverAllowance,
            tripMode: values.tripMode
          });
          
          console.log("Outstation fare update response:", data);
          success = true;
          
          // Force refresh the cab types
          await reloadCabTypes();
          
          toast.success(`${values.tripMode === 'one-way' ? 'One-way' : 'Round-trip'} fares updated successfully`);
        } catch (error) {
          console.error(`Outstation fare update attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
    } catch (error) {
      console.error("Error updating outstation fares:", error);
      toast.error("Failed to update outstation fares");
      setError("Failed to update outstation fares. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" /> Outstation Fares
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchVehicles} 
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs 
          defaultValue="one-way" 
          onValueChange={(value) => handleTripModeChange(value as 'one-way' | 'round-trip')}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="one-way" className="flex items-center gap-1">
              <ArrowRight className="h-4 w-4" /> One-Way
            </TabsTrigger>
            <TabsTrigger value="round-trip" className="flex items-center gap-1">
              <Repeat className="h-4 w-4" /> Round Trip
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="one-way">
            <div className="text-sm text-muted-foreground mb-4">
              Configure pricing for one-way outstation trips.
            </div>
          </TabsContent>
          
          <TabsContent value="round-trip">
            <div className="text-sm text-muted-foreground mb-4">
              Configure pricing for round-trip outstation trips.
            </div>
          </TabsContent>
        </Tabs>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleVehicleSelect(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
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
                name="pricePerKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per KM (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nightHaltCharge"
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
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update {selectedTripMode === 'one-way' ? 'One-Way' : 'Round-Trip'} Fares
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
