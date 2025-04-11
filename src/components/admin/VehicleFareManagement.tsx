
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fareAPI } from '@/services/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormMessage, FormControl, Form } from "@/components/ui/form";
import { RefreshCw, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getVehicleData } from '@/services/vehicleDataService';
import { CabType } from '@/types/cab';

// Create dynamic form schema based on available vehicles
const createFormSchema = (vehicles: CabType[]) => {
  const schema: Record<string, any> = {
    vehicleId: z.string().min(1, "Vehicle is required"),
  };
  
  // Add vehicle price fields dynamically
  vehicles.forEach(vehicle => {
    schema[vehicle.id] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(schema);
};

// Basic structure with proper implementation
export function VehicleFareManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [tourFares, setTourFares] = useState<any[]>([]);
  
  // Dynamic form setup
  const formSchema = createFormSchema(vehicles);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: "",
    },
  });
  
  useEffect(() => {
    // Fetch vehicles and tour fares when component mounts
    const fetchData = async () => {
      try {
        setError(null);
        const vehicleData = await getVehicleData(true, true); // Force refresh and include inactive
        setVehicles(vehicleData);
        
        // Initialize form default values for each vehicle
        const defaultValues: Record<string, any> = {
          vehicleId: form.getValues().vehicleId || "",
        };
        
        vehicleData.forEach(vehicle => {
          defaultValues[vehicle.id] = form.getValues()[vehicle.id] || 0;
        });
        
        // Update form with new default values
        form.reset(defaultValues);
        
        // Fetch tour fares
        const fares = await fareAPI.getTourFares();
        setTourFares(fares);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load vehicle and fare data");
        toast.error("Failed to load data");
      }
    };
    
    fetchData();
  }, []);
  
  const handleVehicleSelect = (vehicleId: string) => {
    form.setValue("vehicleId", vehicleId);
    
    // If we have pricing data for this vehicle, populate the form
    const selectedVehicleFare = tourFares.find(fare => fare.vehicleId === vehicleId);
    if (selectedVehicleFare) {
      // Populate form with existing fare data
      vehicles.forEach(vehicle => {
        const fareValue = selectedVehicleFare[vehicle.id] || 0;
        form.setValue(vehicle.id, fareValue);
      });
    } else {
      // Reset prices to zero
      vehicles.forEach(vehicle => {
        form.setValue(vehicle.id, 0);
      });
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create request data from form values
      const fareData: Record<string, any> = {
        vehicleId: values.vehicleId,
      };
      
      // Add vehicle prices
      vehicles.forEach(vehicle => {
        fareData[vehicle.id] = values[vehicle.id] || 0;
      });
      
      console.log("Submitting vehicle fare data:", fareData);
      
      // Use the general updateTourFares method since we don't have a specific vehicle pricing update method
      const response = await fareAPI.updateTourFares(fareData);
      console.log("Vehicle fare update response:", response);
      
      toast.success("Vehicle pricing updated successfully");
      
      // Refresh the tour fares
      const updatedFares = await fareAPI.getTourFares();
      setTourFares(updatedFares);
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      const errorMessage = error.response?.data?.message || "Failed to update vehicle pricing";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Fare Management</CardTitle>
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
            
            <div className="grid gap-4 md:grid-cols-3">
              {vehicles.map(vehicle => (
                <FormField
                  key={vehicle.id}
                  control={form.control}
                  name={vehicle.id as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{vehicle.name} Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Pricing
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
