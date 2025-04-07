
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
import { LocalFare } from '@/types/cab';
import { updateLocalFare } from '@/services/fareUpdateService';
import { FareUpdateError } from './cab-options/FareUpdateError';

const localFareSchema = z.object({
  price4hrs40km: z.coerce.number().min(0, "4 hour package price must be a positive number"),
  price8hrs80km: z.coerce.number().min(0, "8 hour package price must be a positive number"),
  price10hrs100km: z.coerce.number().min(0, "10 hour package price must be a positive number"),
  priceExtraKm: z.coerce.number().min(0, "Extra km charge must be a positive number"),
  priceExtraHour: z.coerce.number().min(0, "Extra hour charge must be a positive number"),
});

type LocalFareFormValues = z.infer<typeof localFareSchema>;

interface LocalFareFormProps {
  vehicleId: string;
  initialData: LocalFare | null;
  onSuccess?: () => void;
}

export function LocalFareForm({ vehicleId, initialData, onSuccess }: LocalFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const form = useForm<LocalFareFormValues>({
    resolver: zodResolver(localFareSchema),
    defaultValues: {
      price4hrs40km: 0,
      price8hrs80km: 0,
      price10hrs100km: 0,
      priceExtraKm: 0,
      priceExtraHour: 0,
    },
  });

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial local fare data:", initialData);
      form.reset({
        price4hrs40km: initialData.price4hrs40km || 0,
        price8hrs80km: initialData.price8hrs80km || 0,
        price10hrs100km: initialData.price10hrs100km || 0,
        priceExtraKm: initialData.priceExtraKm || 0,
        priceExtraHour: initialData.priceExtraHour || 0,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: LocalFareFormValues) {
    if (!vehicleId) {
      setError(new Error("Vehicle ID is required"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Make sure all required fields are included and not undefined
      const updateData = {
        vehicleId,
        price4hrs40km: values.price4hrs40km,
        price8hrs80km: values.price8hrs80km,
        price10hrs100km: values.price10hrs100km,
        priceExtraKm: values.priceExtraKm,
        priceExtraHour: values.priceExtraHour
      };
      
      console.log("Updating local fares with data:", updateData);
      
      const response = await updateLocalFare(updateData);
      
      console.log("Local fare update response:", response);
      
      if (response && response.status === 'success') {
        toast.success("Local fares updated successfully");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = response?.message || "Failed to update local fares";
        const newError = new Error(errorMessage);
        setError(newError);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      console.error("Error updating local fares:", err);
      setError(err);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price4hrs40km"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4 Hours - 40 KM (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 1500" {...field} />
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
                  <FormLabel>8 Hours - 80 KM (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 2500" {...field} />
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
                  <FormLabel>10 Hours - 100 KM (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 3000" {...field} />
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
                    <Input type="number" placeholder="e.g. 15" {...field} />
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
                    <Input type="number" placeholder="e.g. 200" {...field} />
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
              'Save Local Fares'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
