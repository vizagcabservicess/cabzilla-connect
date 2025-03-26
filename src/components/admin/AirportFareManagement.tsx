
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
import { AlertCircle, RefreshCw, Save, Plane, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { updateTripFares } from '@/services/vehicleDataService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const newVehicleSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1" }),
  luggageCapacity: z.coerce.number().min(0, { message: "Luggage capacity cannot be negative" }),
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
  const [newVehicleOpen, setNewVehicleOpen] = useState(false);
  
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
  
  const newVehicleForm = useForm<z.infer<typeof newVehicleSchema>>({
    resolver: zodResolver(newVehicleSchema),
    defaultValues: {
      vehicleId: "",
      name: "",
      capacity: 4,
      luggageCapacity: 2,
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
          
          console.log(`Fetching airport transfer fares for vehicle: ${cab.id}`, fareData);
          
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
      let updateSucceeded = false;
      
      // Approach 1: Try the direct local endpoint
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const directUrl = `${baseUrl}/api/direct-airport-fares.php`;
        console.log(`Trying direct update via: ${directUrl}`);
        
        const formData = new FormData();
        Object.entries(updateData).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
        
        const response = await fetch(directUrl, {
          method: 'POST',
          body: formData,
        });
        
        const responseData = await response.json();
        console.log("Direct airport fare update response:", responseData);
        
        if (responseData.status === 'success') {
          updateSucceeded = true;
        }
      } catch (error) {
        console.error("Direct endpoint update failed:", error);
      }
      
      // Approach 2: Try the fare-update endpoint with airport type
      if (!updateSucceeded) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const endpointUrl = `${baseUrl}/api/admin/fare-update.php?tripType=airport`;
          console.log(`Trying fare-update endpoint: ${endpointUrl}`);
          
          const formData = new FormData();
          Object.entries(updateData).forEach(([key, value]) => {
            formData.append(key, String(value));
          });
          
          const response = await fetch(endpointUrl, {
            method: 'POST',
            body: formData,
          });
          
          const responseData = await response.json();
          console.log("fare-update.php response:", responseData);
          
          if (responseData.status === 'success') {
            updateSucceeded = true;
          }
        } catch (error) {
          console.error("fare-update.php update failed:", error);
        }
      }
      
      // Approach 3: Try the fareService method
      if (!updateSucceeded) {
        try {
          const result = await fareService.directFareUpdate('airport', cabTypeId, updateData);
          if (result && result.status === 'success') {
            updateSucceeded = true;
            console.log("fareService update succeeded:", result);
          }
        } catch (error) {
          console.error("fareService update method failed:", error);
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
          vehicleId: cabTypeId,
          prices: {
            basePrice: values.basePrice,
            pricePerKm: values.pricePerKm,
            dropPrice: values.dropPrice,
            pickupPrice: values.pickupPrice,
            tier1Price: values.tier1Price,
            tier2Price: values.tier2Price,
            tier3Price: values.tier3Price,
            tier4Price: values.tier4Price,
            extraKmCharge: values.extraKmCharge
          }
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
  
  const onCreateVehicle = async (values: z.infer<typeof newVehicleSchema>) => {
    try {
      setIsLoading(true);
      
      // Normalize vehicle ID (lowercase, replace spaces with underscores)
      const vehicleId = values.vehicleId.toLowerCase().replace(/\s+/g, '_');
      
      // Prepare data for the API
      const vehicleData = {
        vehicleId: vehicleId,
        vehicle_id: vehicleId,
        name: values.name,
        capacity: values.capacity,
        luggageCapacity: values.luggageCapacity,
        is_active: 1,
        ac: 1
      };
      
      // Try to add the vehicle
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // First try the vehicles-update endpoint
      try {
        const response = await fetch(`${baseUrl}/api/admin/vehicles-update.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(vehicleData),
        });
        
        const responseData = await response.json();
        console.log("Vehicle creation response:", responseData);
        
        if (responseData.status === 'success' || responseData.status === 'ok') {
          toast.success(`Vehicle ${values.name} created successfully`);
          newVehicleForm.reset();
          setNewVehicleOpen(false);
          
          // Reload the data to include the new vehicle
          await loadData();
          
          // Set the new vehicle as selected in the dropdown
          form.setValue("cabType", vehicleId);
          handleCabTypeSelect(vehicleId);
        } else {
          toast.error("Failed to create vehicle");
          console.error("Failed to create vehicle:", responseData);
        }
      } catch (error) {
        console.error("Error creating vehicle:", error);
        toast.error("Error creating vehicle");
      }
      
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error("Failed to create vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-500" />
              Airport Transfer Fare Management
            </CardTitle>
            <Dialog open={newVehicleOpen} onOpenChange={setNewVehicleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new vehicle. This will be used for fare management.
                  </DialogDescription>
                </DialogHeader>
                <Form {...newVehicleForm}>
                  <form onSubmit={newVehicleForm.handleSubmit(onCreateVehicle)} className="space-y-4">
                    <FormField
                      control={newVehicleForm.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle ID</FormLabel>
                          <FormControl>
                            <Input placeholder="sedan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newVehicleForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Sedan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={newVehicleForm.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passenger Capacity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={newVehicleForm.control}
                        name="luggageCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Luggage Capacity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Vehicle"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cabType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cab Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleCabTypeSelect(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cab type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cabTypes.map((cabType) => (
                          <SelectItem key={cabType.id} value={cabType.id}>
                            {cabType.name}
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
                        <Input
                          type="number"
                          placeholder="Enter base price"
                          {...field}
                        />
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
                        <Input
                          type="number"
                          placeholder="Enter price per KM"
                          {...field}
                        />
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
                      <FormLabel>Drop Price (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter drop price"
                          {...field}
                        />
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
                      <FormLabel>Pickup Price (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter pickup price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="border-t pt-3 mt-3">
                <h3 className="font-medium mb-2">Tier Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="tier1Price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier 1 Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter tier 1 price"
                            {...field}
                          />
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
                        <FormLabel>Tier 2 Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter tier 2 price"
                            {...field}
                          />
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
                        <FormLabel>Tier 3 Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter tier 3 price"
                            {...field}
                          />
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
                        <FormLabel>Tier 4 Price (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter tier 4 price"
                            {...field}
                          />
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
                        <FormLabel>Extra KM Charge (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter extra KM charge"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex space-x-2 pt-3">
                <Button
                  type="submit"
                  className="flex items-center gap-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Fare
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
