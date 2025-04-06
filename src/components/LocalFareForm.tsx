
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
import { LocalFare } from '@/types/cab';
import { getLocalFare, updateLocalFare } from "@/services/localFareService";
import { toast } from "sonner";

// Schema for form validation
const fareSchema = z.object({
  price4hrs40km: z.coerce.number().min(0, { message: "4hrs/40km package price cannot be negative" }),
  price8hrs80km: z.coerce.number().min(0, { message: "8hrs/80km package price cannot be negative" }),
  price10hrs100km: z.coerce.number().min(0, { message: "10hrs/100km package price cannot be negative" }),
  priceExtraKm: z.coerce.number().min(0, { message: "Extra km charge cannot be negative" }),
  priceExtraHour: z.coerce.number().min(0, { message: "Extra hour charge cannot be negative" }),
});

// Define the form data type from the schema
type FareFormValues = z.infer<typeof fareSchema>;

interface LocalFareFormProps {
  vehicleId: string;
  onFareUpdated?: () => void;
}

export const LocalFareForm: React.FC<LocalFareFormProps> = ({ vehicleId, onFareUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  // Initialize form with default values
  const form = useForm<FareFormValues>({
    resolver: zodResolver(fareSchema),
    defaultValues: {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0,
    },
  });

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
        console.log(`Loading local fare data for vehicle: ${vehicleId}`);
        const fare = await getLocalFare(vehicleId);
        
        if (fare) {
          console.log(`Successfully loaded local fare data for ${vehicleId}:`, fare);
          form.reset({
            price4hrs40km: fare.price4hrs40km || 0,
            price8hrs80km: fare.price8hrs80km || 0,
            price10hrs100km: fare.price10hrs100km || 0,
            priceExtraKm: fare.priceExtraKm || 0,
            priceExtraHour: fare.priceExtraHour || 0,
          });
          setUseMockData(false);
        } else {
          console.log(`No fare data found for ${vehicleId}, using placeholder data`);
          // Use reasonable placeholders based on the vehicle type
          const placeholderData = getPlaceholderFares(vehicleId);
          form.reset(placeholderData);
          setUseMockData(true);
        }
      } catch (err) {
        console.error(`Error loading local fare data for ${vehicleId}:`, err);
        setError(`Failed to load fare data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Fall back to placeholder data on error
        const placeholderData = getPlaceholderFares(vehicleId);
        form.reset(placeholderData);
        setUseMockData(true);
      } finally {
        setIsFetching(false);
      }
    };

    loadFareData();
  }, [vehicleId, form, updateCount]);

  // Generate placeholder fares based on vehicle type
  const getPlaceholderFares = (vehicleId: string): FareFormValues => {
    const vehicleType = vehicleId.toLowerCase();
    
    if (vehicleType.includes('sedan') || vehicleType.includes('dzire') || vehicleType.includes('etios')) {
      return {
        price4hrs40km: 1200,
        price8hrs80km: 2200,
        price10hrs100km: 2700,
        priceExtraKm: 12,
        priceExtraHour: 200,
      };
    } else if (vehicleType.includes('ertiga')) {
      return {
        price4hrs40km: 1500,
        price8hrs80km: 2600,
        price10hrs100km: 3100,
        priceExtraKm: 15,
        priceExtraHour: 250,
      };
    } else if (vehicleType.includes('innova') || vehicleType.includes('crysta')) {
      return {
        price4hrs40km: 1800,
        price8hrs80km: 3200,
        price10hrs100km: 3800,
        priceExtraKm: 18,
        priceExtraHour: 300,
      };
    } else {
      // Default values for unknown vehicle types
      return {
        price4hrs40km: 1500,
        price8hrs80km: 2500,
        price10hrs100km: 3000,
        priceExtraKm: 15,
        priceExtraHour: 250,
      };
    }
  };

  // Handle form submission
  const onSubmit = async (values: FareFormValues) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Updating local fare for vehicle ${vehicleId}:`, values);
      
      // Prepare the fare data for update - ensuring all required properties are non-optional
      const fareData: LocalFare = {
        price4hrs40km: values.price4hrs40km,
        price8hrs80km: values.price8hrs80km,
        price10hrs100km: values.price10hrs100km,
        priceExtraKm: values.priceExtraKm,
        priceExtraHour: values.priceExtraHour,
      };
      
      // Send update request
      const result = await updateLocalFare(vehicleId, fareData);
      
      if (result.success) {
        console.log("Local fare update successful:", result);
        toast.success("Local fare updated successfully");
        
        // Mark that we're now using real data, not mock data
        setUseMockData(false);
        
        // Trigger the onFareUpdated callback if provided
        if (onFareUpdated) {
          onFareUpdated();
        }
        
        // Force a refresh of the data to confirm changes were saved
        setUpdateCount(prev => prev + 1);
      } else {
        console.error("Local fare update failed:", result);
        setError(`Failed to update local fare: ${result.message}`);
        toast.error(result.message || "Failed to update local fare");
      }
    } catch (err) {
      console.error("Error updating local fare:", err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error("Failed to update local fare");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Local Package Fare</CardTitle>
        <CardDescription>
          {useMockData 
            ? "Using preview data. Save to persist changes."
            : "Manage local package pricing for this vehicle"}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price4hrs40km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4 Hours / 40 KM Package (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price8hrs80km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>8 Hours / 80 KM Package (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price10hrs100km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>10 Hours / 100 KM Package (₹)</FormLabel>
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
                  name="priceExtraKm"
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
                  name="priceExtraHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Hour Charge (₹)</FormLabel>
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
