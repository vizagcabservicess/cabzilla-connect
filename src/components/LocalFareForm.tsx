
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
import { updateLocalFares } from '@/services/fareUpdateService';

const localFareSchema = z.object({
  price4hrs40km: z.coerce.number().min(0, "Price must be a positive number"),
  price8hrs80km: z.coerce.number().min(0, "Price must be a positive number"),
  price10hrs100km: z.coerce.number().min(0, "Price must be a positive number"),
  priceExtraKm: z.coerce.number().min(0, "Extra kilometer price must be a positive number"),
  priceExtraHour: z.coerce.number().min(0, "Extra hour price must be a positive number"),
});

interface LocalFareFormProps {
  vehicleId: string;
  initialData: LocalFare | null;
  onSuccess?: () => void;
}

export function LocalFareForm({ vehicleId, initialData, onSuccess }: LocalFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof localFareSchema>>({
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
      form.reset({
        price4hrs40km: initialData.price4hrs40km || initialData.package4hr40km || 0,
        price8hrs80km: initialData.price8hrs80km || initialData.package8hr80km || 0,
        price10hrs100km: initialData.price10hrs100km || initialData.package10hr100km || 0,
        priceExtraKm: initialData.priceExtraKm || initialData.extraKmRate || 0,
        priceExtraHour: initialData.priceExtraHour || initialData.extraHourRate || 0,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: z.infer<typeof localFareSchema>) {
    if (!vehicleId) {
      setError("Vehicle ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updateData = {
        vehicleId,
        price4hrs40km: values.price4hrs40km,
        price8hrs80km: values.price8hrs80km,
        price10hrs100km: values.price10hrs100km,
        priceExtraKm: values.priceExtraKm,
        priceExtraHour: values.priceExtraHour
      };
      
      console.log("Updating local fares with data:", updateData);
      
      const response = await updateLocalFares(updateData);
      
      console.log("Local fare update response:", response);
      
      if (response && response.status === 'success') {
        toast.success("Local fares updated successfully");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = response?.message || "Failed to update local fares";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      console.error("Error updating local fares:", err);
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="price4hrs40km"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4 Hours / 40 KM (₹)</FormLabel>
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
                  <FormLabel>8 Hours / 80 KM (₹)</FormLabel>
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
                  <FormLabel>10 Hours / 100 KM (₹)</FormLabel>
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
                  <FormLabel>Extra KM Rate (₹)</FormLabel>
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
                  <FormLabel>Extra Hour Rate (₹)</FormLabel>
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
