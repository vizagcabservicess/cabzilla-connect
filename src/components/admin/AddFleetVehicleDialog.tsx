
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';

interface AddFleetVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: FleetVehicle) => void;
}

export function AddFleetVehicleDialog({ 
  open, 
  onClose,
  onAddVehicle
}: AddFleetVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const form = useForm<Partial<FleetVehicle>>({
    defaultValues: {
      vehicleNumber: '',
      name: '',
      model: '',
      make: '',
      year: new Date().getFullYear(),
      status: 'Active',
      fuelType: 'Petrol',
      vehicleType: 'sedan',
      capacity: 4,
      luggageCapacity: 2,
      lastServiceOdometer: 0,
      nextServiceOdometer: 5000,
      isActive: true,
    }
  });
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        vehicleNumber: '',
        name: '',
        model: '',
        make: '',
        year: new Date().getFullYear(),
        status: 'Active',
        fuelType: 'Petrol',
        vehicleType: 'sedan',
        capacity: 4,
        luggageCapacity: 2,
        lastServiceOdometer: 0,
        nextServiceOdometer: 5000,
        isActive: true,
      });
      setHasSubmitted(false);
    }
  }, [open, form]);

  const handleSubmit = async (data: Partial<FleetVehicle>) => {
    if (hasSubmitted) {
      toast.warning("Form already submitted, please wait...");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setHasSubmitted(true);
      
      // Calculate next service due date (3 months from now)
      const today = new Date();
      const nextServiceDate = new Date();
      nextServiceDate.setMonth(today.getMonth() + 3);
      
      // Create a complete FleetVehicle object with odometer readings
      const vehicleToSubmit: Partial<FleetVehicle> = {
        vehicleNumber: data.vehicleNumber || '',
        name: data.name || data.model || '',
        model: data.model || '',
        make: data.make || '',
        year: data.year || new Date().getFullYear(),
        status: data.status as 'Active' | 'Maintenance' | 'Inactive',
        lastService: today.toISOString().split('T')[0],
        nextServiceDue: nextServiceDate.toISOString().split('T')[0],
        lastServiceOdometer: data.lastServiceOdometer || 0,
        nextServiceOdometer: data.nextServiceOdometer || 5000,
        fuelType: data.fuelType || 'Petrol',
        vehicleType: data.vehicleType || 'sedan',
        cabTypeId: data.vehicleType || '', // Use vehicle type as cab type id
        capacity: data.capacity || 4,
        luggageCapacity: data.luggageCapacity || 2,
        isActive: data.isActive !== undefined ? data.isActive : true
      };
      
      try {
        // Try to use fleetAPI to add the vehicle
        const response = await fleetAPI.addVehicle(vehicleToSubmit);
        
        // Pass the response to the parent component
        onAddVehicle(response);
        toast.success(`Vehicle ${data.vehicleNumber} added successfully`);
        form.reset();
        onClose();
      } catch (apiError: any) {
        console.error("API Error adding fleet vehicle:", apiError);
        toast.error(apiError.message || "Failed to add vehicle. Please try again.");
        setHasSubmitted(false);
      }
    } catch (error: any) {
      console.error("Error adding vehicle:", error);
      toast.error(error.message || "Failed to add vehicle. Please try again.");
      setHasSubmitted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Fleet Vehicle</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                rules={{ required: "Vehicle number is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AP 31 AB 1234" {...field} />
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
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fleet Car 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="make"
                rules={{ required: "Make is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="model"
                rules={{ required: "Model is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Innova" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                rules={{ required: "Year is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 2023" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                        <SelectItem value="minivan">Minivan</SelectItem>
                        <SelectItem value="tempo">Tempo Traveller</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seating Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
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
                      <Input 
                        type="number" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Service Information Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Service Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastServiceOdometer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Odometer Reading (km)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))} 
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
                      <FormLabel>Next Service at (km)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                    Adding...
                  </>
                ) : "Add Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
