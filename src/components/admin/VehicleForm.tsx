
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateVehicle, createVehicle } from '@/services/vehicleDataService';

// Define form schema
const vehicleFormSchema = z.object({
  id: z.string().min(1, "Vehicle ID is required"),
  name: z.string().min(1, "Vehicle name is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  luggageCapacity: z.coerce.number().min(0, "Luggage capacity must be a positive number"),
  basePrice: z.coerce.number().min(0, "Base price must be a positive number"),
  pricePerKm: z.coerce.number().min(0, "Price per km must be a positive number"),
  image: z.string().optional(),
  description: z.string().optional(),
  nightHaltCharge: z.coerce.number().min(0, "Night halt charge must be a positive number"),
  driverAllowance: z.coerce.number().min(0, "Driver allowance must be a positive number"),
  isActive: z.boolean().default(true),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  vehicle?: any;
  onSuccess?: () => void;
  isEdit?: boolean;
}

export function VehicleForm({ vehicle, onSuccess, isEdit = false }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values or existing vehicle data
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      id: vehicle?.id || vehicle?.vehicleId || '',
      name: vehicle?.name || '',
      capacity: vehicle?.capacity || 4,
      luggageCapacity: vehicle?.luggageCapacity || 2,
      basePrice: vehicle?.basePrice || vehicle?.price || 0,
      pricePerKm: vehicle?.pricePerKm || 0,
      image: vehicle?.image || '/cars/sedan.png',
      description: vehicle?.description || '',
      nightHaltCharge: vehicle?.nightHaltCharge || 0,
      driverAllowance: vehicle?.driverAllowance || 0,
      isActive: vehicle?.isActive !== false,
    }
  });

  // Handle form submission
  const onSubmit = async (values: VehicleFormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting vehicle form:', values);
      
      const vehicleData = {
        vehicleId: values.id,
        name: values.name,
        capacity: values.capacity,
        luggageCapacity: values.luggageCapacity,
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        image: values.image || '/cars/sedan.png',
        description: values.description || '',
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance,
        isActive: values.isActive,
      };
      
      let success = false;
      
      if (isEdit) {
        success = await updateVehicle(vehicleData);
      } else {
        success = await createVehicle(vehicleData);
      }
      
      if (success) {
        toast.success(`Vehicle ${isEdit ? 'updated' : 'created'} successfully`);
        if (onSuccess) onSuccess();
        if (!isEdit) {
          form.reset(); // Reset form after creation
        }
      } else {
        toast.error(`Failed to ${isEdit ? 'update' : 'create'} vehicle`);
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} vehicle`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // This ensures the form updates if the vehicle prop changes
    if (vehicle) {
      form.reset({
        id: vehicle.id || vehicle.vehicleId || '',
        name: vehicle.name || '',
        capacity: vehicle.capacity || 4,
        luggageCapacity: vehicle.luggageCapacity || 2,
        basePrice: vehicle.basePrice || vehicle.price || 0,
        pricePerKm: vehicle.pricePerKm || 0,
        image: vehicle.image || '/cars/sedan.png',
        description: vehicle.description || '',
        nightHaltCharge: vehicle.nightHaltCharge || 0,
        driverAllowance: vehicle.driverAllowance || 0,
        isActive: vehicle.isActive !== false,
      });
    }
  }, [vehicle, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle ID</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., sedan, suv, etc." 
                    {...field} 
                    disabled={isEdit}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sedan, SUV, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passenger Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="luggageCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Luggage Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
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
                <FormLabel>Price per KM (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nightHaltCharge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Night Halt Charge (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
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
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="/cars/sedan.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Vehicle description" 
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Is this vehicle active and available for booking?
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess ? onSuccess() : form.reset()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Vehicle' : 'Create Vehicle'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
