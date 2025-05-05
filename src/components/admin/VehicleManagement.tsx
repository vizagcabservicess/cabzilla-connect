import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table"
import { CabType, FleetVehicle } from '@/types/cab';
import { fleetAPI } from '@/services/api/fleetAPI';
import { columns } from './vehicle-table/columns';
import { VehicleDialog } from './VehicleDialog';
import { getVehicleData, clearVehicleDataCache } from '@/services/vehicleDataService';
import { convertFleetVehiclesToCabTypes } from '@/utils/vehicleTypeConverters';

// Define the schema for the form
const formSchema = z.object({
  vehicleNumber: z.string().min(2, {
    message: "Vehicle number must be at least 2 characters.",
  }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  make: z.string().min(2, {
    message: "Make must be at least 2 characters.",
  }),
  model: z.string().min(2, {
    message: "Model must be at least 2 characters.",
  }),
  year: z.string().min(4, {
    message: "Year must be at least 4 characters.",
  }),
  vehicleType: z.string().min(2, {
    message: "Vehicle Type must be at least 2 characters.",
  }),
  status: z.string().min(2, {
    message: "Status must be at least 2 characters.",
  }),
  lastService: z.string().min(2, {
    message: "Last Service must be at least 2 characters.",
  }),
  nextServiceDue: z.string().min(2, {
    message: "Next Service Due must be at least 2 characters.",
  }),
  fuelType: z.string().min(2, {
    message: "Fuel Type must be at least 2 characters.",
  }),
  capacity: z.string().min(1, {
    message: "Capacity must be at least 1 characters.",
  }),
  cabTypeId: z.string().min(2, {
    message: "Cab Type Id must be at least 2 characters.",
  }),
  luggageCapacity: z.string().min(1, {
    message: "Luggage Capacity must be at least 1 characters.",
  }),
  isActive: z.boolean().default(true),
  currentOdometer: z.string().optional(),
});

export function VehicleManagement() {
  const [open, setOpen] = React.useState(false)
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleNumber: "",
      name: "",
      make: "",
      model: "",
      year: "",
      vehicleType: "",
      status: "",
      lastService: "",
      nextServiceDue: "",
      fuelType: "",
      capacity: "",
      cabTypeId: "",
      luggageCapacity: "",
      isActive: true,
      currentOdometer: "",
    },
  });

  useEffect(() => {
    handleFetchVehicles();
  }, [includeInactive]);

  const handleFetchVehicles = async () => {
    try {
      setIsLoading(true);
      const fetchedVehicles = await getVehicleData(true, true);
      const convertedVehicles = convertFleetVehiclesToCabTypes(fetchedVehicles);
      setVehicles(convertedVehicles);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      setError('Failed to load vehicles. Please try again.');
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Call the fleetAPI to add the vehicle
      const newVehicle = await fleetAPI.addVehicle({
        vehicleNumber: values.vehicleNumber,
        name: values.name,
        make: values.make,
        model: values.model,
        year: parseInt(values.year),
        vehicleType: values.vehicleType,
        status: values.status,
        lastService: values.lastService,
        nextServiceDue: values.nextServiceDue,
        fuelType: values.fuelType,
        capacity: parseInt(values.capacity),
        cabTypeId: values.cabTypeId,
        luggageCapacity: parseInt(values.luggageCapacity),
        isActive: values.isActive,
        currentOdometer: parseInt(values.currentOdometer || "0"),
      });

      if (newVehicle) {
        toast.success("Vehicle added successfully!");
        form.reset();
        handleFetchVehicles();
        setOpen(false);
      } else {
        toast.error("Failed to add vehicle.");
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle.");
      setError("Failed to add vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCache = () => {
    clearVehicleDataCache();
    toast.success("Vehicle cache cleared!");
  };

  return (
    <Card className="space-y-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Manage Vehicles</CardTitle>
        <div className="flex items-center space-x-2">
          <Label htmlFor="inactive">Include Inactive</Label>
          <Switch id="inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            Clear Cache
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
          </Button>
          <Button variant="outline" size="sm" onClick={handleFetchVehicles} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 p-4 text-destructive">
            <h3 className="mb-1 font-medium">Error!</h3>
            <p>{error}</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataTable columns={columns} data={vehicles} />
        )}
      </CardContent>
      <VehicleDialog open={open} setOpen={setOpen} form={form} onSubmit={onSubmit} isSubmitting={isSubmitting} />
    </Card>
  );
}
