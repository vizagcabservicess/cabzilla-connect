
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
        isActive: true,
      });
    }
  }, [open, form]);

  const handleSubmit = async (data: Partial<FleetVehicle>) => {
    try {
      setIsSubmitting(true);
      
      // Calculate next service due date (3 months from now)
      const today = new Date();
      const nextServiceDate = new Date();
      nextServiceDate.setMonth(today.getMonth() + 3);
      
      const vehicleData = {
        ...data,
        lastService: today.toISOString().split('T')[0],
        nextServiceDue: nextServiceDate.toISOString().split('T')[0],
      };

      try {
        // Create a complete FleetVehicle object
        const completeVehicle: FleetVehicle = {
          id: `fleet-${Date.now()}`, // Generate a temporary ID
          vehicleNumber: data.vehicleNumber || '',
          name: data.name || data.model || '',
          model: data.model || '',
          make: data.make || '',
          year: data.year || new Date().getFullYear(),
          status: data.status as 'Active' | 'Maintenance' | 'Inactive',
          lastService: today.toISOString().split('T')[0],
          nextServiceDue: nextServiceDate.toISOString().split('T')[0],
          fuelType: data.fuelType || 'Petrol',
          vehicleType: data.vehicleType || 'sedan',
          cabTypeId: '', // Will be assigned by the API
          capacity: data.capacity || 4,
          luggageCapacity: data.luggageCapacity || 2,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Try to use fleetAPI to add the vehicle
        const response = await fleetAPI.addVehicle(completeVehicle);
        
        // Pass the response to the parent component
        onAddVehicle(response);
        toast.success(`Vehicle ${data.vehicleNumber} added successfully`);
      } catch (apiError) {
        console.error("API Error adding fleet vehicle:", apiError);
        
        // If API fails, create a synthetic response with all required fields
        const syntheticVehicle: FleetVehicle = {
          id: `fleet-${Date.now()}`,
          vehicleNumber: data.vehicleNumber || '',
          name: data.name || data.model || '',
          model: data.model || '',
          make: data.make || '',
          year: data.year || new Date().getFullYear(),
          status: data.status as 'Active' | 'Maintenance' | 'Inactive',
          lastService: today.toISOString().split('T')[0],
          nextServiceDue: nextServiceDate.toISOString().split('T')[0],
          fuelType: data.fuelType || 'Petrol',
          vehicleType: data.vehicleType || 'sedan',
          cabTypeId: '',
          capacity: data.capacity || 4,
          luggageCapacity: data.luggageCapacity || 2,
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        onAddVehicle(syntheticVehicle);
        toast.success(`Vehicle ${data.vehicleNumber} added locally`);
      }
      
      form.reset();
      onClose();
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle. Please try again.");
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
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="tempo_traveller">Tempo Traveller</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                      </SelectContent>
                    </Select>
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
                          <SelectValue placeholder="Select fuel" />
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
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passenger Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
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
            
            <DialogFooter>
              <Button 
                variant="outline" 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
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
