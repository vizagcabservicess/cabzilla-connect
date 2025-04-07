
import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { OutstationFare } from '@/types/cab';
import { toast } from 'sonner';
import { directApiPost, directApiPostWithFallback } from '@/utils/directApiHelper';
import { fareService } from '@/services/fareService';

// Define the form schema with validation
const fareFormSchema = z.object({
  basePrice: z.coerce.number().min(0, "Base price cannot be negative"),
  pricePerKm: z.coerce.number().min(0, "Price per km cannot be negative"),
  driverAllowance: z.coerce.number().min(0, "Driver allowance cannot be negative"),
  nightHalt: z.coerce.number().min(0, "Night halt charges cannot be negative"),
  minDays: z.coerce.number().min(1, "Minimum days must be at least 1").optional(),
  extraKmCharge: z.coerce.number().min(0, "Extra km charge cannot be negative")
});

type FareFormValues = z.infer<typeof fareFormSchema>;

interface OutstationFareFormProps {
  vehicleId: string;
  initialData: OutstationFare | null;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function OutstationFareForm({ vehicleId, initialData, onSuccess, onError }: OutstationFareFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or data from props
  const form = useForm<FareFormValues>({
    resolver: zodResolver(fareFormSchema),
    defaultValues: {
      basePrice: initialData?.basePrice || 0,
      pricePerKm: initialData?.pricePerKm || 0,
      driverAllowance: initialData?.driverAllowance || 0,
      nightHalt: initialData?.nightHalt || initialData?.nightHaltCharge || 0,
      minDays: initialData?.minDays || 1,
      extraKmCharge: initialData?.extraKmCharge || 0
    }
  });

  // Handle form submission
  const onSubmit = async (data: FareFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Combine form data with vehicle ID
      const fareData = {
        ...data,
        vehicleId: vehicleId,
        vehicle_id: vehicleId, // Include both formats for compatibility
      };
      
      console.log('Submitting outstation fare data:', fareData);
      
      // Use the fareService to update the data
      await fareService.directFareUpdate('outstation', fareData);
      
      toast.success('Outstation fare updated successfully');
      
      // Dispatch custom event to notify other components
      const event = new CustomEvent('outstation-fares-updated', { 
        detail: { vehicleId } 
      });
      window.dispatchEvent(event);
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating outstation fare:', error);
      toast.error(`Failed to update fare: ${error.message || 'Unknown error'}`);
      
      // Call the error callback if provided
      if (onError) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                  <Input type="number" placeholder="3000" {...field} />
                </FormControl>
                <FormDescription>
                  Basic fare for outstation trips
                </FormDescription>
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
                <FormControl>
                  <Input type="number" step="0.01" placeholder="15" {...field} />
                </FormControl>
                <FormDescription>
                  Charge per kilometer traveled
                </FormDescription>
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
                <FormControl>
                  <Input type="number" placeholder="300" {...field} />
                </FormControl>
                <FormDescription>
                  Daily allowance for the driver
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nightHalt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Night Halt Charges (₹)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="300" {...field} />
                </FormControl>
                <FormDescription>
                  Charges for overnight stays
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Days</FormLabel>
                <FormControl>
                  <Input type="number" min="1" placeholder="1" {...field} />
                </FormControl>
                <FormDescription>
                  Minimum billable days
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="extraKmCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Extra Km Charge (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="15" {...field} />
                </FormControl>
                <FormDescription>
                  Charge for each extra kilometer
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full md:w-auto"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Outstation Fare
        </Button>
      </form>
    </Form>
  );
}
