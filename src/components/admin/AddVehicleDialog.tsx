
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';
import { AlertCircle, Car, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface AddVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: FleetVehicle) => void;
}

// Define the form schema
const formSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  name: z.string().min(1, 'Vehicle name is required'),
  model: z.string().min(1, 'Model is required'),
  make: z.string().min(1, 'Manufacturer is required'),
  year: z.coerce.number().int().min(2000, 'Year must be at least 2000').max(new Date().getFullYear(), `Year cannot be greater than ${new Date().getFullYear()}`),
  status: z.enum(['Active', 'Maintenance', 'Inactive']),
  lastService: z.string(),
  nextServiceDue: z.string(),
  fuelType: z.enum(['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  luggageCapacity: z.coerce.number().int().min(0, 'Luggage capacity cannot be negative'),
  currentOdometer: z.coerce.number().int().min(0, 'Odometer reading cannot be negative').optional(),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddVehicleDialog({ open, onClose, onAddVehicle }: AddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: '',
      name: '',
      model: '',
      make: '',
      year: new Date().getFullYear(),
      status: 'Active',
      lastService: new Date().toISOString().split('T')[0],
      nextServiceDue: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
      fuelType: 'Petrol',
      capacity: 4,
      luggageCapacity: 2,
      currentOdometer: 0,
      vehicleType: 'Sedan',
    },
  });

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare the fleet vehicle data
      const fleetVehicleData: Partial<FleetVehicle> = {
        vehicleNumber: values.vehicleNumber,
        name: values.name,
        model: values.model,
        make: values.make,
        year: values.year,
        status: values.status as 'Active' | 'Maintenance' | 'Inactive',
        lastService: values.lastService,
        nextServiceDue: values.nextServiceDue,
        fuelType: values.fuelType,
        capacity: values.capacity,
        luggageCapacity: values.luggageCapacity,
        isActive: values.status === 'Active',
        currentOdometer: values.currentOdometer,
        vehicleType: values.vehicleType,
        cabTypeId: values.model.toLowerCase().replace(/\s+/g, '_'), // Generate a cabTypeId based on model
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add the fleet vehicle
      const newVehicle = await fleetAPI.addVehicle(fleetVehicleData);
      
      toast.success(`Fleet vehicle ${values.vehicleNumber} added successfully`);
      onAddVehicle(newVehicle);
      form.reset(); // Reset form after successful submission
      onClose();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Fleet Vehicle</DialogTitle>
          <DialogDescription>
            Add a new vehicle to your fleet management system.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="AP 31 AB 1234" {...field} />
                    </FormControl>
                    <div className="text-xs text-gray-500">
                      Registration/license plate number
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Swift Dzire #301" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model *</FormLabel>
                    <FormControl>
                      <Input placeholder="Swift Dzire, Innova, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer *</FormLabel>
                    <FormControl>
                      <Input placeholder="Maruti, Toyota, etc." {...field} />
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
                    <FormLabel>Year *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={2000} 
                        max={new Date().getFullYear()} 
                        {...field} 
                      />
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
                    <FormLabel>Status *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
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

              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Type *</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
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
                name="lastService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Service Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextServiceDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Service Due *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
                    <FormLabel>Passenger Capacity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field} 
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
                    <FormLabel>Luggage Capacity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Odometer (KM)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        placeholder="0"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type *</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sedan">Sedan</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="Hatchback">Hatchback</SelectItem>
                      <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                      <SelectItem value="Luxury">Luxury</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Car className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
