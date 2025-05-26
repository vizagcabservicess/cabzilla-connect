import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FleetVehicle } from '@/types/cab';

interface EditFleetVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: FleetVehicle | null;
  onSubmit: (values: FleetVehicle) => void;
}

const formSchema = z.object({
  id: z.string().optional(),
  vehicleNumber: z.string().min(2, {
    message: 'Vehicle number must be at least 2 characters.',
  }),
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  make: z.string().min(2, {
    message: 'Make must be at least 2 characters.',
  }),
  year: z.number().min(2000).max(2024),
  status: z.enum(['Active', 'Maintenance', 'Inactive']),
  lastService: z.string(),
  nextServiceDue: z.string(),
  fuelType: z.string(),
  vehicleType: z.string(),
  cabTypeId: z.string(),
  capacity: z.number().min(1).max(10),
  luggageCapacity: z.number().min(0).max(5),
  isActive: z.boolean().default(true),
  commissionPercentage: z.number().min(0).max(100).optional(),
});

const formFields = [
  { name: 'vehicleNumber', label: 'Vehicle Number', type: 'text', placeholder: 'Enter vehicle number' },
  { name: 'name', label: 'Name', type: 'text', placeholder: 'Enter name' },
  { name: 'model', label: 'Model', type: 'text', placeholder: 'Enter model' },
  { name: 'make', label: 'Make', type: 'text', placeholder: 'Enter make' },
  { name: 'year', label: 'Year', type: 'number', placeholder: 'Enter year' },
  {
    name: 'status', label: 'Status', type: 'select', placeholder: 'Select status', options: [
      { value: 'Active', label: 'Active' },
      { value: 'Maintenance', label: 'Maintenance' },
      { value: 'Inactive', label: 'Inactive' },
    ]
  },
  { name: 'lastService', label: 'Last Service', type: 'date', placeholder: 'Enter last service date' },
  { name: 'nextServiceDue', label: 'Next Service Due', type: 'date', placeholder: 'Enter next service due date' },
  { name: 'fuelType', label: 'Fuel Type', type: 'text', placeholder: 'Enter fuel type' },
  { name: 'vehicleType', label: 'Vehicle Type', type: 'text', placeholder: 'Enter vehicle type' },
  { name: 'cabTypeId', label: 'Cab Type ID', type: 'text', placeholder: 'Enter cab type ID' },
  { name: 'capacity', label: 'Capacity', type: 'number', placeholder: 'Enter capacity' },
  { name: 'luggageCapacity', label: 'Luggage Capacity', type: 'number', placeholder: 'Enter luggage capacity' },
  { name: 'commissionPercentage', label: 'Commission Percentage', type: 'number', placeholder: 'Enter commission percentage' },
  { name: 'isActive', label: 'Is Active', type: 'select', placeholder: 'Select active status', options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
    ]
  },
];

export function EditFleetVehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
}: EditFleetVehicleDialogProps) {
  const form = useForm<FleetVehicle>({
    resolver: zodResolver(formSchema),
    defaultValues: vehicle || {
      vehicleNumber: '',
      name: '',
      model: '',
      make: '',
      year: 2022,
      status: 'Active',
      lastService: '',
      nextServiceDue: '',
      fuelType: '',
      vehicleType: '',
      cabTypeId: '',
      capacity: 4,
      luggageCapacity: 2,
      isActive: true,
      commissionPercentage: 10,
    },
    mode: 'onChange',
  });

  const { handleSubmit, control, formState: { errors } } = form;

  const submitForm = (values: FleetVehicle) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submitForm)} className="grid gap-4 py-4">
        {formFields.filter(field => field.name !== 'emi').map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
            </Label>
            <Controller
              name={field.name}
              control={control}
              render={({ field: fieldProps }) => {
                if (field.type === 'select') {
                  return (
                    <Select onValueChange={fieldProps.onChange} value={String(fieldProps.value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }
                
                return (
                  <Input
                    {...fieldProps}
                    value={String(fieldProps.value || '')}
                    type={field.type}
                    placeholder={field.placeholder}
                  />
                );
              }}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message}
              </p>
            )}
          </div>
        ))}
          <DialogFooter>
            <Button type="submit">
              {vehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
