
import { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Car, Plus, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

// Define the form schema
const vehicleFormSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  capacity: z.coerce.number().int().min(1, { message: "Capacity must be at least 1" }),
  luggageCapacity: z.coerce.number().int().min(0, { message: "Luggage capacity cannot be negative" }),
  ac: z.boolean().default(true),
  image: z.string().default("/cars/sedan.png"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  basePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface AddVehicleFormProps {
  onSuccess?: () => void;
}

export function AddVehicleForm({ onSuccess }: AddVehicleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize form with default values
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicleId: "",
      name: "",
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      image: "/cars/sedan.png",
      description: "",
      isActive: true,
      basePrice: 4000,
      pricePerKm: 14,
      nightHaltCharge: 700,
      driverAllowance: 250,
    },
  });
  
  const onSubmit = async (data: VehicleFormValues) => {
    setIsLoading(true);
    setError(null);
    toast.loading("Adding new vehicle...");
    
    try {
      // Get API base URL from env
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const timestamp = Date.now();
      
      // API endpoint for adding a vehicle
      const endpoint = `${apiBaseUrl}/api/admin/vehicles-update.php?_t=${timestamp}`;
      
      // Make the API request
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true',
          'X-Timestamp': timestamp.toString()
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'success') {
        toast.success("Vehicle added successfully");
        
        // Clear form
        form.reset();
        
        // Refresh cab data in the app
        localStorage.setItem('forceCacheRefresh', 'true');
        localStorage.setItem('fareDataLastRefreshed', timestamp.toString());
        window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
          detail: { timestamp, forceRefresh: true }
        }));
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(result.message || 'Failed to add vehicle');
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err instanceof Error ? err.message : 'Failed to add vehicle');
      toast.error("Failed to add vehicle");
    } finally {
      setIsLoading(false);
      toast.dismiss();
    }
  };
  
  return (
    <Card>
      <CardHeader className="bg-green-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-600" />
          <span>Add New Vehicle</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle ID</FormLabel>
                    <FormDescription>
                      Unique identifier for this vehicle (e.g., "sedan", "suv")
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="e.g., sedan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormDescription>
                      The name shown to customers
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="e.g., Sedan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="luggageCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Luggage Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ac"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Air Conditioning</FormLabel>
                      <FormDescription>
                        Does this vehicle have AC?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Make this vehicle available for booking
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image Path</FormLabel>
                  <FormDescription>
                    Path to the vehicle image (relative to public folder)
                  </FormDescription>
                  <FormControl>
                    <Input placeholder="/cars/sedan.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Comfortable sedan with ample space for 4 passengers"
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-6" />
            
            <h3 className="text-lg font-medium mb-4">Pricing Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (₹)</FormLabel>
                    <FormDescription>
                      Starting price for outstation trips
                    </FormDescription>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
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
                    <FormLabel>Price per Km (₹)</FormLabel>
                    <FormDescription>
                      Rate charged per kilometer
                    </FormDescription>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nightHaltCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Night Halt Charge (₹)</FormLabel>
                    <FormDescription>
                      Charge for overnight stays
                    </FormDescription>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
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
                    <FormDescription>
                      Daily allowance for the driver
                    </FormDescription>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Add Vehicle
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
