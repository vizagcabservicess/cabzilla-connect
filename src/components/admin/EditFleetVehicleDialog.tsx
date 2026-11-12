import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { useForm } from "react-hook-form";
import { FleetVehicle } from '@/types/cab';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Timer } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

interface EditFleetVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  vehicle: FleetVehicle;
  onSave: (vehicle: FleetVehicle) => void;
  onDelete: (vehicleId: string) => void;
}

function listFieldToFormString(value: string[] | string | undefined): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return typeof value === 'string' ? value : '';
}

export function EditFleetVehicleDialog({
  open,
  onClose,
  vehicle,
  onSave,
  onDelete
}: EditFleetVehicleDialogProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<FleetVehicle>({
    defaultValues: {
      ...vehicle,
      lastServiceOdometer: vehicle.lastServiceOdometer || 0,
      nextServiceOdometer: vehicle.nextServiceOdometer || 0,
      inclusions: listFieldToFormString(vehicle.inclusions),
      exclusions: listFieldToFormString(vehicle.exclusions),
    }
  });

  // Reset form when dialog opens with new vehicle data
  useEffect(() => {
    if (open) {
      form.reset({
        ...vehicle,
        lastServiceOdometer: vehicle.lastServiceOdometer || 0,
        nextServiceOdometer: vehicle.nextServiceOdometer || 0,
        inclusions: listFieldToFormString(vehicle.inclusions),
        exclusions: listFieldToFormString(vehicle.exclusions),
      });
    }
  }, [open, vehicle, form]);

  // When submitting, parse inclusions/exclusions as arrays
  const handleSubmit = async (data: any) => {
    const inclusions = data.inclusions
      ? data.inclusions.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
      : [];
    const exclusions = data.exclusions
      ? data.exclusions.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
      : [];
    const payload = {
      ...data,
      inclusions,
      exclusions,
    };
    
    // Preserve ID and other metadata
    const updatedVehicle: FleetVehicle = {
      ...vehicle,
      ...payload,
      id: vehicle.id,
      updatedAt: new Date().toISOString()
    };
    
    onSave(updatedVehicle);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete(vehicle.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-1.5rem)] max-w-lg gap-3 overflow-y-auto p-4 sm:max-w-[680px]">
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-base">Edit Vehicle</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
              <div className="space-y-2 [&_.space-y-2]:space-y-1 [&_label]:text-xs [&_label]:leading-tight [&_input]:h-8 [&_textarea]:min-h-10 [&_textarea]:py-1.5 [&_textarea]:text-sm [&_[role=combobox]]:h-8">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <FormField
                  control={form.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">  
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
                
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (passengers)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
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
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Vehicle EMI Field */}
                <FormField
                  control={form.control}
                  name="emi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle EMI</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="Enter EMI amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Service Information Section */}
              <div className="border-t pt-2">
                <h3 className="mb-2 text-sm font-medium">Service Information</h3>
                
                <div className="mb-2 grid grid-cols-2 gap-x-3 gap-y-2">
                  <FormField
                    control={form.control}
                    name="lastService"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Service Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastServiceOdometer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Service Odometer (km)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <FormField
                    control={form.control}
                    name="nextServiceDue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Service Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                        <FormLabel>Next Service Odometer (km)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="inclusions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inclusions</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="e.g., AC, Bottle Water, Music System" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exclusions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exclusions</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="e.g., Toll, Parking, State Tax" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cancellationPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Policy</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="e.g., Free cancellation up to 1 hour before pickup." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
              </div>
              <DialogFooter className="gap-2 border-t pt-2 sm:gap-0">
                <Button variant="destructive" type="button" onClick={handleDeleteClick}>
                  Delete Vehicle
                </Button>
                <div className="flex-grow"></div>
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the vehicle
              from your fleet database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
