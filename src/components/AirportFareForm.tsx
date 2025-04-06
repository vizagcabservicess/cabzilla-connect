
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirportFare, getAirportFare, updateAirportFare } from "@/services/airportFareService";
import { toast } from "sonner";

// Schema for form validation
const fareSchema = z.object({
  basePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per KM cannot be negative" }),
  pickupPrice: z.coerce.number().min(0, { message: "Pickup price cannot be negative" }),
  dropPrice: z.coerce.number().min(0, { message: "Drop price cannot be negative" }),
  tier1Price: z.coerce.number().min(0, { message: "Tier 1 price cannot be negative" }),
  tier2Price: z.coerce.number().min(0, { message: "Tier 2 price cannot be negative" }),
  tier3Price: z.coerce.number().min(0, { message: "Tier 3 price cannot be negative" }),
  tier4Price: z.coerce.number().min(0, { message: "Tier 4 price cannot be negative" }),
  extraKmCharge: z.coerce.number().min(0, { message: "Extra km charge cannot be negative" }),
  nightCharges: z.coerce.number().min(0, { message: "Night charges cannot be negative" }),
  extraWaitingCharges: z.coerce.number().min(0, { message: "Extra waiting charges cannot be negative" }),
});

// Define the form data type from the schema
type FareFormValues = z.infer<typeof fareSchema>;

interface AirportFareFormProps {
  vehicleId: string;
  onFareUpdated?: () => void;
}

export const AirportFareForm: React.FC<AirportFareFormProps> = ({ vehicleId, onFareUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  // Initialize form with default values
  const form = useForm<FareFormValues>({
    resolver: zodResolver(fareSchema),
    defaultValues: {
      basePrice: 0,
      pricePerKm: 0,
      pickupPrice: 0,
      dropPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0,
      nightCharges: 150,
      extraWaitingCharges: 100,
    },
  });

  // Function to generate mock fare data based on vehicle ID
  const generateMockFare = (id: string): FareFormValues => {
    // Use a simple hash function to generate consistent values for the same vehicle ID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Base price between 1500 and 4000
    const basePrice = Math.abs(hash % 2500) + 1500;
    
    return {
      basePrice: basePrice,
      pricePerKm: 10 + Math.abs(hash % 20),
      pickupPrice: basePrice + Math.abs((hash >> 2) % 500),
      dropPrice: basePrice + Math.abs((hash >> 4) % 400),
      tier1Price: basePrice - Math.abs((hash >> 6) % 200),
      tier2Price: basePrice,
      tier3Price: basePrice + Math.abs((hash >> 8) % 300),
      tier4Price: basePrice + Math.abs((hash >> 10) % 600),
      extraKmCharge: 10 + Math.abs((hash >> 12) % 10),
      nightCharges: 150 + Math.abs((hash >> 14) % 350),
      extraWaitingCharges: 100 + Math.abs((hash >> 16) % 50),
    };
  };

  // Load fare data when vehicle ID changes
  useEffect(() => {
    const loadFareData = async () => {
      if (!vehicleId) {
        setError("No vehicle selected");
        return;
      }

      setError(null);
      setIsFetching(true);
      
      try {
        console.log(`Loading airport fare data for vehicle: ${vehicleId}`);
        const fare = await getAirportFare(vehicleId);
        
        if (fare) {
          console.log(`Successfully loaded fare data for ${vehicleId}:`, fare);
          form.reset({
            basePrice: fare.basePrice || 0,
            pricePerKm: fare.pricePerKm || 0,
            pickupPrice: fare.pickupPrice || 0,
            dropPrice: fare.dropPrice || 0,
            tier1Price: fare.tier1Price || 0,
            tier2Price: fare.tier2Price || 0,
            tier3Price: fare.tier3Price || 0,
            tier4Price: fare.tier4Price || 0,
            extraKmCharge: fare.extraKmCharge || 0,
            nightCharges: fare.nightCharges || 150,
            extraWaitingCharges: fare.extraWaitingCharges || 100,
          });
          setUseMockData(false);
        } else {
          console.log(`No fare data found for ${vehicleId}, using mock data`);
          // If no fare data is found, use mock data but mark it as such
          const mockFare = generateMockFare(vehicleId);
          form.reset(mockFare);
          setUseMockData(true);
        }
      } catch (err) {
        console.error(`Error loading fare data for ${vehicleId}:`, err);
        setError(`Failed to load fare data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Fall back to mock data on error
        const mockFare = generateMockFare(vehicleId);
        form.reset(mockFare);
        setUseMockData(true);
      } finally {
        setIsFetching(false);
      }
    };

    loadFareData();
  }, [vehicleId, form, updateCount]);

  // Handle form submission
  const onSubmit = async (values: FareFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Updating airport fare for vehicle ${vehicleId}:`, values);
      
      // Prepare the fare data for update
      const fareData: AirportFare = {
        vehicleId,
        ...values
      };
      
      // Send update request
      const result = await updateAirportFare(fareData);
      
      if (result.success) {
        console.log("Airport fare update successful:", result);
        toast.success("Airport fare updated successfully");
        
        // Mark that we're now using real data, not mock data
        setUseMockData(false);
        
        // Trigger the onFareUpdated callback if provided
        if (onFareUpdated) {
          onFareUpdated();
        }
        
        // Force a refresh of the data to confirm changes were saved
        setUpdateCount(prev => prev + 1);
      } else {
        console.error("Airport fare update failed:", result);
        setError(`Failed to update airport fare: ${result.message}`);
        toast.error(result.message);
      }
    } catch (err) {
      console.error("Error updating airport fare:", err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error("Failed to update airport fare");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Airport Transfer Fare</CardTitle>
        <CardDescription>
          {useMockData 
            ? "Using preview data. Save to persist changes."
            : "Manage airport transfer pricing for this vehicle"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {useMockData && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Using preview data. Actual fare data could not be loaded.
            </AlertDescription>
          </Alert>
        )}
        
        {isFetching ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading fare data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <FormLabel>Price Per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pickupPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tier1Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 1 Price (₹)</FormLabel>
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
                      <FormLabel>Tier 2 Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tier3Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 3 Price (₹)</FormLabel>
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
                      <FormLabel>Tier 4 Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="extraKmCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra KM Charge (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nightCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Night Charges (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="extraWaitingCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Waiting Charges (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="bg-muted/50 text-sm text-muted-foreground">
        {useMockData ? 'Preview mode: Changes will be saved when you submit the form.' : 'Last updated: ' + new Date().toLocaleString()}
      </CardFooter>
    </Card>
  );
};
