
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { addVehicle } from '@/services/directVehicleService';
import { CabType, FleetVehicle } from '@/types/cab';
import { AlertCircle, Car, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { fleetAPI } from '@/services/api/fleetAPI';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface AddVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: CabType) => void;
}

// Define validation schema
const vehicleFormSchema = z.object({
  vehicleId: z.string().optional(),
  name: z.string().min(1, "Vehicle name is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  model: z.string().min(1, "Model is required"),
  make: z.string().min(1, "Manufacturer is required"),
  year: z.number().min(2000, "Year must be 2000 or later").max(new Date().getFullYear(), "Year cannot be in the future"),
  status: z.enum(['Active', 'Maintenance', 'Inactive']),
  lastService: z.string().min(1, "Last service date is required"),
  nextServiceDue: z.string().min(1, "Next service due date is required"),
  currentOdometer: z.number().optional(),
  fuelType: z.string().min(1, "Fuel type is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  luggageCapacity: z.number().min(0, "Luggage capacity cannot be negative"),
  isActive: z.boolean(),
  ac: z.boolean()
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export function AddVehicleDialog({ open, onClose, onAddVehicle }: AddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState(false);
  
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicleId: '',
      name: '',
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      isActive: true,
      // Fleet specific fields
      vehicleNumber: '',
      model: '',
      make: '',
      year: new Date().getFullYear(),
      status: 'Active',
      lastService: new Date().toISOString().split('T')[0],
      nextServiceDue: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
      fuelType: 'Petrol',
      currentOdometer: 0
    }
  });

  const handleFixDatabase = async () => {
    setIsFixingDatabase(true);
    try {
      const success = await fixDatabaseTables();
      if (success) {
        toast.success('Database tables fixed successfully');
        setError(null);
      } else {
        toast.error('Failed to fix database tables');
      }
    } catch (err) {
      console.error('Error fixing database:', err);
    } finally {
      setIsFixingDatabase(false);
    }
  };

  const onSubmit = async (data: VehicleFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!data.vehicleId) {
        // Generate vehicle ID from make and model if not provided
        data.vehicleId = `${data.make.toLowerCase()}_${data.model.toLowerCase().replace(/\s+/g, '_')}`;
      }
      
      if (!data.name) {
        // Use model as name if not provided
        data.name = `${data.make} ${data.model}`;
      }

      // First create the fleet vehicle
      try {
        const fleetVehicleData: Partial<FleetVehicle> = {
          vehicleNumber: data.vehicleNumber,
          name: data.name,
          model: data.model,
          make: data.make,
          year: data.year,
          status: data.status as 'Active' | 'Maintenance' | 'Inactive',
          lastService: data.lastService,
          nextServiceDue: data.nextServiceDue,
          fuelType: data.fuelType,
          cabTypeId: data.vehicleId,
          capacity: data.capacity,
          luggageCapacity: data.luggageCapacity,
          isActive: data.isActive,
          currentOdometer: data.currentOdometer
        };

        await fleetAPI.addVehicle(fleetVehicleData);
        toast.success(`Fleet vehicle ${data.vehicleNumber} added successfully`);
      } catch (fleetError) {
        console.error("Error adding fleet vehicle:", fleetError);
        // Continue with regular vehicle creation even if fleet vehicle creation fails
        toast.error(`Failed to add to fleet database: ${fleetError}`);
      }

      // Create the regular vehicle entry for compatibility
      const vehicleData: CabType = {
        id: data.vehicleId,
        vehicleId: data.vehicleId,
        name: data.name,
        capacity: data.capacity,
        luggageCapacity: data.luggageCapacity,
        ac: data.ac,
        image: '/cars/sedan.png', // Default image
        amenities: ['AC'],
        description: `${data.make} ${data.model} - ${data.year}`,
        isActive: data.isActive,
        vehicleNumber: data.vehicleNumber,
        model: data.model,
        make: data.make,
        year: data.year,
        status: data.status as 'Active' | 'Maintenance' | 'Inactive',
        lastService: data.lastService
      };

      const newVehicle = await addVehicle(vehicleData);
      
      onAddVehicle(newVehicle);
      form.reset();
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
            <AlertDescription className="flex flex-col gap-2">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFixDatabase}
                disabled={isFixingDatabase}
              >
                {isFixingDatabase ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing database...
                  </>
                ) : (
                  'Fix Database Tables'
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto px-1 py-2" style={{ maxHeight: "calc(80vh - 120px)" }}>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Vehicle Number <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="AP 31 AB 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Model <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Swift Dzire, Innova, etc." {...field} />
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Manufacturer <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Maruti, Toyota, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Year of Manufacture <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="2000"
                        max={new Date().getFullYear()} 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Status <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                    <FormLabel>
                      Fuel Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
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
                    <FormLabel>
                      Last Service Date <span className="text-red-500">*</span>
                    </FormLabel>
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
                    <FormLabel>
                      Next Service Due <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentOdometer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Current Odometer (KM)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Seating Capacity <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="luggageCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Luggage Capacity
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="ac"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mt-0">Vehicle has AC</FormLabel>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mt-0">Vehicle is Active</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
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
                    Add Fleet Vehicle
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
