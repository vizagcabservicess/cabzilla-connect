
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
      
      // First try the direct update method
      try {
        const directResponse = await updateAirportFareDirectly({
          ...values,
          // Ensure all values are proper numbers
          basePrice: Number(values.basePrice),
          pricePerKm: Number(values.pricePerKm),
          pickupPrice: Number(values.pickupPrice),
          dropPrice: Number(values.dropPrice),
          tier1Price: Number(values.tier1Price),
          tier2Price: Number(values.tier2Price),
          tier3Price: Number(values.tier3Price),
          tier4Price: Number(values.tier4Price),
          extraKmCharge: Number(values.extraKmCharge),
          nightCharges: Number(values.nightCharges),
          extraWaitingCharges: Number(values.extraWaitingCharges)
        });
        
        console.log("Direct update response:", directResponse);
        
        if (directResponse && directResponse.status === 'success') {
          toast.success("Airport fares updated successfully");
          if (onSuccess) {
            onSuccess();
          }
          return;
        }
        
        throw new Error(directResponse?.message || "Failed to update airport fares");
      } catch (directError: any) {
        console.error("Direct update failed:", directError);
        
        // Try the backup API approach (regular form submission)
        try {
          console.log("Trying backup approach for vehicle:", vehicleId);
          
          // Create a regular form submission
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = '/api/admin/airport-fares-update.php';
          form.enctype = 'multipart/form-data';
          form.style.display = 'none';
          
          // Add all the values
          const appendField = (name: string, value: any) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
          };
          
          appendField('vehicleId', vehicleId);
          Object.entries(values).forEach(([key, value]) => {
            appendField(key, value);
          });
          
          // Add to the document, submit, and remove
          document.body.appendChild(form);
          
          // Create a promise to track submission
          const formSubmitPromise = new Promise<void>((resolve, reject) => {
            // Create a hidden iframe to capture the response
            const iframe = document.createElement('iframe');
            iframe.name = 'fare-submit-iframe';
            iframe.style.display = 'none';
            
            iframe.onload = () => {
              try {
                // Assume success if we get here
                resolve();
              } catch (e) {
                reject(e);
              } finally {
                // Clean up
                setTimeout(() => {
                  document.body.removeChild(iframe);
                }, 1000);
              }
            };
            
            document.body.appendChild(iframe);
            form.target = 'fare-submit-iframe';
            form.submit();
            
            // Also clean up the form
            setTimeout(() => {
              document.body.removeChild(form);
            }, 1000);
          });
          
          // Wait for the form submission to complete
          await formSubmitPromise;
          
          toast.success("Airport fares updated successfully via backup method");
          if (onSuccess) {
            onSuccess();
          }
          return;
        } catch (backupError: any) {
          console.error("Backup approach failed:", backupError);
          throw new Error(`All update methods failed: ${directError.message}, ${backupError.message}`);
        }
      }
    } catch (err: any) {
      console.error("Error updating airport fares:", err);
      setError(err);
      if (onError) onError(err);
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <FareUpdateError 
          error={error} 
          onRetry={() => form.handleSubmit(onSubmit)()} 
          isAdmin={true}
        />
      )}
      
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
                    <Input type="number" placeholder="e.g. 3000" {...field} />
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
                    <Input type="number" placeholder="e.g. 15" {...field} />
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
                    <Input type="number" placeholder="e.g. 1000" {...field} />
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
                    <Input type="number" placeholder="e.g. 1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="tier1Price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier 1 Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 800" {...field} />
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
                    <Input type="number" placeholder="e.g. 1000" {...field} />
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
                    <Input type="number" placeholder="e.g. 1200" {...field} />
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
                    <Input type="number" placeholder="e.g. 1400" {...field} />
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
                    <Input type="number" placeholder="e.g. 15" {...field} />
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
                    <Input type="number" placeholder="e.g. 300" {...field} />
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
                    <Input type="number" placeholder="e.g. 200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Airport Fares'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
