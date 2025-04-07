
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirportFare } from '@/types/cab';
import { FareUpdateError } from './cab-options/FareUpdateError';

const airportFareSchema = z.object({
  basePrice: z.coerce.number().min(0, "Base price must be a positive number"),
  pricePerKm: z.coerce.number().min(0, "Price per km must be a positive number"),
  pickupPrice: z.coerce.number().min(0, "Pickup price must be a positive number"),
  dropPrice: z.coerce.number().min(0, "Drop price must be a positive number"),
  tier1Price: z.coerce.number().min(0, "Tier 1 price must be a positive number"),
  tier2Price: z.coerce.number().min(0, "Tier 2 price must be a positive number"),
  tier3Price: z.coerce.number().min(0, "Tier 3 price must be a positive number"),
  tier4Price: z.coerce.number().min(0, "Tier 4 price must be a positive number"),
  extraKmCharge: z.coerce.number().min(0, "Extra km charge must be a positive number"),
  nightCharges: z.coerce.number().min(0, "Night charges must be a positive number"),
  extraWaitingCharges: z.coerce.number().min(0, "Extra waiting charges must be a positive number"),
});

type AirportFareFormValues = z.infer<typeof airportFareSchema>;

interface AirportFareFormProps {
  vehicleId: string;
  initialData: AirportFare | null;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export function AirportFareForm({ vehicleId, initialData, onSuccess, onError }: AirportFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null);

  const form = useForm<AirportFareFormValues>({
    resolver: zodResolver(airportFareSchema),
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
      nightCharges: 0,
      extraWaitingCharges: 0,
    },
  });

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial airport fare data:", initialData);
      form.reset({
        basePrice: initialData.basePrice || 0,
        pricePerKm: initialData.pricePerKm || 0,
        pickupPrice: initialData.pickupPrice || 0,
        dropPrice: initialData.dropPrice || 0,
        tier1Price: initialData.tier1Price || 0,
        tier2Price: initialData.tier2Price || 0,
        tier3Price: initialData.tier3Price || 0,
        tier4Price: initialData.tier4Price || 0,
        extraKmCharge: initialData.extraKmCharge || 0,
        nightCharges: initialData.nightCharges || 0,
        extraWaitingCharges: initialData.extraWaitingCharges || 0,
      });
    }
  }, [initialData, form]);

  // Direct database update function (more reliable than the service)
  const updateAirportFareDirectly = async (data: AirportFareFormValues): Promise<any> => {
    console.log("Directly updating airport fares with data:", data);
    
    try {
      // Create FormData object for reliable transmission
      const formData = new FormData();
      formData.append('vehicleId', vehicleId);
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Make the direct API call
      const response = await fetch('/api/direct-airport-fares.php', {
        method: 'POST',
        body: formData,
        headers: {
          'X-Debug': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Get the text first to make debugging easier
      const responseText = await response.text();
      console.log("Direct API response text:", responseText);
      
      try {
        // Try to parse it as JSON
        const responseData = JSON.parse(responseText);
        return responseData;
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error("Direct API call failed:", error);
      throw error;
    }
  };

  // Backend API update function
  const updateAirportFareViaAdminAPI = async (data: AirportFareFormValues): Promise<any> => {
    console.log("Updating airport fares via admin API:", data);
    
    try {
      const jsonData = {
        vehicleId: vehicleId,
        ...data
      };
      
      const response = await fetch('/api/admin/direct-airport-fares-update.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(jsonData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log("Admin API response text:", responseText);
      
      try {
        return JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Error parsing admin JSON response:", jsonError);
        throw new Error(`Invalid JSON from admin API: ${responseText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error("Admin API call failed:", error);
      throw error;
    }
  };

  async function onSubmit(values: AirportFareFormValues) {
    // Prevent double submissions
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < 2000) {
      console.log("Preventing duplicate submission");
      return;
    }
    setLastSubmitTime(now);
    
    if (!vehicleId) {
      const newError = new Error("Vehicle ID is required");
      setError(newError);
      if (onError) onError(newError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Submitting airport fare form for vehicle:", vehicleId);
      console.log("Form values:", values);
      
      let errorMsg = "";
      let success = false;
      
      // Try all available methods to update the fare
      try {
        // Method 1: Direct API call
        console.log("Attempting direct API update...");
        const directResponse = await updateAirportFareDirectly(values);
        if (directResponse && directResponse.status === 'success') {
          console.log("Direct API update successful:", directResponse);
          success = true;
        } else {
          errorMsg += "Direct API failed: " + (directResponse?.message || "Unknown error") + ". ";
        }
      } catch (directError: any) {
        console.error("Direct API update failed:", directError);
        errorMsg += "Direct API failed: " + (directError?.message || directError) + ". ";
      }
      
      // If direct method failed, try admin API
      if (!success) {
        try {
          console.log("Attempting admin API update...");
          const adminResponse = await updateAirportFareViaAdminAPI(values);
          if (adminResponse && adminResponse.status === 'success') {
            console.log("Admin API update successful:", adminResponse);
            success = true;
          } else {
            errorMsg += "Fare Update API failed: " + (adminResponse?.message || "Unknown error") + ". ";
          }
        } catch (adminError: any) {
          console.error("Admin API update failed:", adminError);
          errorMsg += "Fare Update API failed: " + (adminError?.message || adminError) + ". ";
        }
      }
      
      // If both methods failed, throw an error
      if (!success) {
        throw new Error(errorMsg || "Failed to update airport fares through all available methods");
      }
      
      toast.success(`Airport fare for ${vehicleId} updated successfully`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Error updating airport fares:", err);
      setError(err);
      if (onError) onError(err);
      toast.error(`Failed to update airport fares: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleRetry = () => {
    setError(null);
    form.handleSubmit(onSubmit)();
  };

  if (error) {
    return (
      <FareUpdateError 
        error={error} 
        onRetry={handleRetry} 
        isAdmin={true}
        title="Error Updating Airport Fares"
        description="There was a problem updating the airport fares. Please try again."
        fixDatabaseHandler={async () => {
          try {
            const response = await fetch('/api/admin/fix-database.php', {
              method: 'GET',
              headers: {
                'X-Admin-Mode': 'true',
                'X-Debug': 'true'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
              toast.success('Database fixed successfully');
              handleRetry();
            } else {
              toast.error(`Database fix failed: ${data.message}`);
            }
          } catch (err: any) {
            toast.error(`Database fix error: ${err.message}`);
          }
        }}
        directDatabaseAccess={async () => {
          try {
            const response = await fetch(`/api/admin/direct-db-access.php?table=airport_transfer_fares&vehicle_id=${vehicleId}`, {
              method: 'GET',
              headers: {
                'X-Admin-Mode': 'true',
                'X-Debug': 'true'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed with status: ${response.status}`);
            }
            
            const data = await response.json();
            toast.info('Direct database access results available in console');
            console.log('Direct DB access results:', data);
          } catch (err: any) {
            toast.error(`Direct DB access error: ${err.message}`);
          }
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="0.5" />
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
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tier1Price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tier 1 Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="1" />
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
                  <Input type="number" {...field} min="0" step="0.5" />
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
                  <Input type="number" {...field} min="0" step="1" />
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
                <FormLabel>Extra Waiting Charges (₹/hr)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} min="0" step="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.isDirty && (
          <Alert className="bg-amber-50 text-amber-800 border-amber-200">
            <AlertDescription>
              You have unsaved changes to the airport fare settings.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading || !form.formState.isDirty}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Airport Fare
        </Button>
      </form>
    </Form>
  );
}
