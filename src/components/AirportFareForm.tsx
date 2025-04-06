
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirportFare } from '@/types/cab';
import { updateAirportFare } from '@/services/fareUpdateService';

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

interface AirportFareFormProps {
  vehicleId: string;
  initialData: AirportFare | null;
  onSuccess?: () => void;
}

export function AirportFareForm({ vehicleId, initialData, onSuccess }: AirportFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof airportFareSchema>>({
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

  async function onSubmit(values: z.infer<typeof airportFareSchema>) {
    if (!vehicleId) {
      setError("Vehicle ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData = {
        vehicleId,
        ...values
      };
      
      console.log("Updating airport fares with data:", updateData);
      
      const response = await updateAirportFare(updateData);
      
      console.log("Airport fare update response:", response);
      
      if (response && response.status === 'success') {
        toast.success("Airport fares updated successfully");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = response?.message || "Failed to update airport fares";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      console.error("Error updating airport fares:", err);
      const errorMessage = err?.message || "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
                    <Input type="number" placeholder="e.g. 1500" {...field} />
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
                  <FormLabel>Airport Pickup Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 800" {...field} />
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
                  <FormLabel>Airport Drop Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 800" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="tier1Price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier 1 Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 600" {...field} />
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
                    <Input type="number" placeholder="e.g. 800" {...field} />
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
                    <Input type="number" placeholder="e.g. 1000" {...field} />
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
                    <Input type="number" placeholder="e.g. 1200" {...field} />
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
                    <Input type="number" placeholder="e.g. 200" {...field} />
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
                    <Input type="number" placeholder="e.g. 150" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button type="submit" disabled={isLoading}>
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
