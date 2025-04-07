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
import { directApiPost } from '@/utils/directApiHelper';
import { fareService } from '@/services/fareService';

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

  async function onSubmit(values: AirportFareFormValues) {
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
      
      const fareData: AirportFare = {
        vehicleId,
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        pickupPrice: values.pickupPrice,
        dropPrice: values.dropPrice,
        tier1Price: values.tier1Price,
        tier2Price: values.tier2Price,
        tier3Price: values.tier3Price,
        tier4Price: values.tier4Price,
        extraKmCharge: values.extraKmCharge,
        nightCharges: values.nightCharges,
        extraWaitingCharges: values.extraWaitingCharges
      };
      
      const response = await updateAirportFare(fareData);
      
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
            const response = await fareService.initializeDatabase();
            
            if (response) {
              toast.success('Database fixed successfully');
              handleRetry();
            } else {
              toast.error('Database fix failed');
            }
          } catch (err: any) {
            toast.error(`Database fix error: ${err.message}`);
          }
        }}
        directDatabaseAccess={async () => {
          try {
            const response = await fetch(`/api/admin/direct-db-access.php?table=airport_fares&vehicle_id=${vehicleId}`, {
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
