
import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, ServiceType } from '@/types/maintenance';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const serviceTypes: ServiceType[] = [
  'Oil Change',
  'Tire Replacement',
  'Battery Replacement',
  'Brake Service',
  'Air Filter Replacement',
  'Major Service',
  'AC Service',
  'Transmission Service',
  'Engine Repair',
  'Electrical Repair',
  'Suspension Repair',
  'Regular Maintenance',
  'Other'
];

const formSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }),
  date: z.date({ required_error: "Service date is required" }),
  serviceType: z.string().min(1, { message: "Service type is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  cost: z.number().min(0, { message: "Cost must be a positive number" }),
  vendor: z.string().min(1, { message: "Vendor is required" }),
  nextServiceDate: z.date().optional(),
  notes: z.string().optional(),
  odometer: z.number().optional(),
  nextServiceOdometer: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface MaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: MaintenanceRecord) => void;
  initialData?: MaintenanceRecord;
  isSubmitting?: boolean;
}

export function MaintenanceForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  isSubmitting = false 
}: MaintenanceFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: initialData?.vehicleId || '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      serviceType: initialData?.serviceType || 'Oil Change',
      description: initialData?.description || '',
      cost: initialData?.cost || 0,
      vendor: initialData?.vendor || '',
      nextServiceDate: initialData?.nextServiceDate ? new Date(initialData.nextServiceDate) : undefined,
      notes: initialData?.notes || '',
      odometer: initialData?.odometer || undefined,
      nextServiceOdometer: initialData?.nextServiceOdometer || undefined,
    }
  });
  
  // Reset form when initialData changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        vehicleId: initialData?.vehicleId || '',
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        serviceType: initialData?.serviceType || 'Oil Change',
        description: initialData?.description || '',
        cost: initialData?.cost || 0,
        vendor: initialData?.vendor || '',
        nextServiceDate: initialData?.nextServiceDate ? new Date(initialData.nextServiceDate) : undefined,
        notes: initialData?.notes || '',
        odometer: initialData?.odometer || undefined,
        nextServiceOdometer: initialData?.nextServiceOdometer || undefined,
      });
    }
  }, [isOpen, initialData, form]);
  
  const handleSubmit = (values: FormValues) => {
    const record: MaintenanceRecord = {
      id: initialData?.id || '',
      vehicleId: values.vehicleId,
      date: format(values.date, 'yyyy-MM-dd'),
      serviceType: values.serviceType,
      description: values.description,
      cost: values.cost,
      vendor: values.vendor,
      nextServiceDate: values.nextServiceDate ? format(values.nextServiceDate, 'yyyy-MM-dd') : undefined,
      notes: values.notes,
      odometer: values.odometer,
      nextServiceOdometer: values.nextServiceOdometer,
    };
    
    onSubmit(record);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Maintenance Record' : 'Add Maintenance Record'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the maintenance record details.' : 'Enter the maintenance record details.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter vehicle ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Service Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter service description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="odometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer Reading</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Current odometer reading" 
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextServiceOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Service Odometer</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Odometer reading for next service" 
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="nextServiceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Service Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes or remarks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (initialData ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
