
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
import { AlertCircle, RefreshCw, Save, Plane } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { updateTripFares } from '@/services/vehicleDataService';

const formSchema = z.object({
  cabType: z.string().min(1, { message: "Cab type is required" }),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  dropPrice: z.coerce.number().min(0, { message: "Drop price cannot be negative" }),
  pickupPrice: z.coerce.number().min(0, { message: "Pickup price cannot be negative" }),
  tier1Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier2Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier3Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier4Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  extraKmCharge: z.coerce.number().min(0, { message: "Extra km charge cannot be negative" }),
});

interface AirportFares {
  basePrice: number;
  pricePerKm: number;
  dropPrice: number;
  pickupPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

interface CabAirportFares {
  [cabType: string]: AirportFares;
}

export function AirportFareManagement() {
  const [airportFares, setAirportFares] = useState<CabAirportFares>({});
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabType: "",
      basePrice: 0,
      pricePerKm: 0,
      dropPrice: 0,
      pickupPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0,
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
      console.log("Loaded cab types:", types);
      setCabTypes(types);
      
      // Load airport fares for each cab type
      const loadedFares: CabAirportFares = {};
      
      for (const cab of types) {
        try {
          // Fetch the data from the fare service
          const fareData = await fareService.getAirportFaresForVehicle(cab.id);
          
          loadedFares[cab.id] = {
            basePrice: fareData?.basePrice || 0,
            pricePerKm: fareData?.pricePerKm || 0,
            dropPrice: fareData?.dropPrice || 0,
            pickupPrice: fareData?.pickupPrice || 0,
            tier1Price: fareData?.tier1Price || 0,
            tier2Price: fareData?.tier2Price || 0,
            tier3Price: fareData?.tier3Price || 0,
            tier4Price: fareData?.tier4Price || 0,
            extraKmCharge: fareData?.extraKmCharge || 0,
          };
        } catch (error) {
          console.error(`Error loading airport fares for ${cab.id}:`, error);
        }
      }
      
      console.log("Loaded airport fares:", loadedFares);
      setAirportFares(loadedFares);
      
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      console.log("Updating airport fare:", values);
      
      const cabTypeId = values.cabType.toLowerCase();
      
      // Define the data to send to the API
      const updateData = {
        vehicleId: cabTypeId,
        vehicle_id: cabTypeId,
        tripType: 'airport',
        trip_type: 'airport',
        // Standard airport fare fields
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        dropPrice: values.dropPrice,
        pickupPrice: values.pickupPrice,
        // New tier pricing fields
        tier1Price: values.tier1Price,
        tier2Price: values.tier2Price,
        tier3Price: values.tier3Price,
        tier4Price: values.tier4Price,
        extraKmCharge: values.extraKmCharge,
        // Add all the variant field names that might be used in the backend
        airport_base_price: values.basePrice,
        airport_price_per_km: values.pricePerKm,
        airport_drop_price: values.dropPrice,
        airport_pickup_price: values.pickupPrice,
        airport_tier1_price: values.tier1Price,
        airport_tier2_price: values.tier2Price,
        airport_tier3_price: values.tier3Price,
        airport_tier4_price: values.tier4Price,
        airport_extra_km_charge: values.extraKmCharge
      };
      
      console.log("Sending update data to server:", updateData);
      
      // Try multiple approaches to update the server
      
      // Approach 1: Use the direct endpoint
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/admin/airport-fares-update.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Force-Refresh': 'true'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          throw new Error(`Direct API call failed with status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log("Airport fare update response:", responseData);
      } catch (error) {
        console.error("First update method failed:", error);
        
        // Approach 2: Try using updateTripFares from vehicleDataService
        try {
          await updateTripFares(cabTypeId, 'airport', updateData);
        } catch (innerError) {
          console.error("Second update method failed:", innerError);
          
          // Approach 3: Call the endpoint with FormData as a last resort
          const formData = new FormData();
          Object.entries(updateData).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          
          const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const response = await fetch(`${baseUrl}/api/admin/airport-fares-update.php`, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Force-Refresh': 'true'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Direct API call with FormData failed with status: ${response.status}`);
          }
        }
      }
      
      // Force cache refresh to ensure new prices are used
      localStorage.setItem('forceCacheRefresh', 'true');
      fareService.clearCache();
      
      // Update the local state
      setAirportFares(prev => ({
        ...prev,
        [cabTypeId]: {
          basePrice: values.basePrice,
          pricePerKm: values.pricePerKm,
          dropPrice: values.dropPrice,
          pickupPrice: values.pickupPrice,
          tier1Price: values.tier1Price,
          tier2Price: values.tier2Price,
          tier3Price: values.tier3Price,
          tier4Price: values.tier4Price,
          extraKmCharge: values.extraKmCharge,
        }
      }));
      
      // Dispatch a custom event for other components to update
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          cabType: cabTypeId
        }
      }));
      
      toast.success("Airport fare updated successfully");
      
      // Force another cache clear after a short delay to ensure all components update
      setTimeout(() => {
        fareService.clearCache();
        localStorage.setItem('forceCacheRefresh', 'true');
        window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
      }, 500);
      
    } catch (error) {
      console.error("Error updating airport fare:", error);
      toast.error("Failed to update airport fare");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCabTypeSelect = (cabType: string) => {
    form.setValue("cabType", cabType);
    
    // If we have fares for this cab type, populate the form
    if (airportFares[cabType]) {
      const fare = airportFares[cabType];
      form.setValue("basePrice", fare.basePrice);
      form.setValue("pricePerKm", fare.pricePerKm);
      form.setValue("dropPrice", fare.dropPrice);
      form.setValue("pickupPrice", fare.pickupPrice);
      form.setValue("tier1Price", fare.tier1Price);
      form.setValue("tier2Price", fare.tier2Price);
      form.setValue("tier3Price", fare.tier3Price);
      form.setValue("tier4Price", fare.tier4Price);
      form.setValue("extraKmCharge", fare.extraKmCharge);
    } else {
      // Reset form values if no fares exist
      form.setValue("basePrice", 0);
      form.setValue("pricePerKm", 0);
      form.setValue("dropPrice", 0);
      form.setValue("pickupPrice", 0);
      form.setValue("tier1Price", 0);
      form.setValue("tier2Price", 0);
      form.setValue("tier3Price", 0);
      form.setValue("tier4Price", 0);
      form.setValue("extraKmCharge", 0);
    }
  };
  
  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update" className="flex items-center gap-1">
          <Plane className="h-4 w-4" /> Update Airport Fares
        </TabsTrigger>
        <TabsTrigger value="all" className="flex items-center gap-1">
          <Plane className="h-4 w-4" /> View All Airport Fares
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" /> Update Airport Transfer Fares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="cabType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Cab Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          handleCabTypeSelect(value);
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
                
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price</FormLabel>
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
                        <FormLabel>Price Per Km</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} step="0.01" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dropPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Drop Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pickupPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Airport Transfer Distance Tiers</h3>
                  
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="tier1Price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 1 (0-10 KM) Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tier2Price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 2 (11-20 KM) Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tier3Price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 3 (21-30 KM) Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tier4Price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 4 (31+ KM) Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="extraKmCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Extra KM Charge</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} step="0.01" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                      Update Airport Fares
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" /> All Airport Transfer Fares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="flex justify-center p-10">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : Object.keys(airportFares).length > 0 ? (
              <div className="space-y-8">
                {cabTypes.map(cab => {
                  const fare = airportFares[cab.id];
                  if (!fare) return null;
                  
                  return (
                    <div key={cab.id} className="border rounded-lg p-4">
                      <h3 className="text-xl font-semibold mb-4">{cab.name}</h3>
                      
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Base Price</p>
                          <p className="font-medium">₹{fare.basePrice.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Price Per Km</p>
                          <p className="font-medium">₹{fare.pricePerKm.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Drop Price</p>
                          <p className="font-medium">₹{fare.dropPrice.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Pickup Price</p>
                          <p className="font-medium">₹{fare.pickupPrice.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      
                      <h4 className="text-lg font-medium mt-4 mb-2">Distance Tiers</h4>
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Tier 1 (0-10 KM)</p>
                          <p className="font-medium">₹{fare.tier1Price.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Tier 2 (11-20 KM)</p>
                          <p className="font-medium">₹{fare.tier2Price.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Tier 3 (21-30 KM)</p>
                          <p className="font-medium">₹{fare.tier3Price.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Tier 4 (31+ KM)</p>
                          <p className="font-medium">₹{fare.tier4Price.toLocaleString('en-IN')}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Extra KM Charge</p>
                          <p className="font-medium">₹{fare.extraKmCharge.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCabTypeSelect(cab.id)}
                        >
                          Edit Fares
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No airport fares found.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
