
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { fareAPI } from '@/services/api';
import { VehiclePricing, VehiclePricingUpdateRequest } from '@/types/api';

const formSchema = z.object({
  vehicleType: z.string(),
  basePrice: z.coerce.number().positive(),
  pricePerKm: z.coerce.number().positive(),
  nightHaltCharge: z.coerce.number().positive(),
  driverAllowance: z.coerce.number().positive(),
});

export function VehiclePricingManagement() {
  const { toast } = useToast();
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePricing | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VehiclePricingUpdateRequest>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleType: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    },
  });

  useEffect(() => {
    const fetchVehiclePricing = async () => {
      try {
        // Add timestamp to force cache refresh
        const timestamp = new Date().getTime();
        const data = await fareAPI.getVehiclePricing(`?_t=${timestamp}`);
        console.log("Fetched vehicle pricing:", data);
        setVehiclePricing(data);
        if (data.length > 0) {
          form.reset({
            vehicleType: data[0].vehicleType,
            basePrice: data[0].basePrice,
            pricePerKm: data[0].pricePerKm,
            nightHaltCharge: data[0].nightHaltCharge,
            driverAllowance: data[0].driverAllowance,
          });
          setSelectedVehicle(data[0]);
        }
      } catch (error) {
        console.error("Error fetching vehicle pricing:", error);
        toast({
          title: "Error",
          description: "Failed to load vehicle pricing",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehiclePricing();
  }, [toast, form]);

  const onSubmit = async (values: VehiclePricingUpdateRequest) => {
    setIsSubmitting(true);
    try {
      console.log("Updating vehicle pricing:", values);
      await fareAPI.updateVehiclePricing(values);
      
      // Update local state
      setVehiclePricing(prev => prev.map(vehicle => 
        vehicle.vehicleType === values.vehicleType ? { ...vehicle, ...values } : vehicle
      ));
      
      toast({
        title: "Success",
        description: "Vehicle pricing updated successfully",
      });
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      toast({
        title: "Error",
        description: "Failed to update vehicle pricing",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVehicleChange = (vehicleType: string) => {
    const vehicle = vehiclePricing.find(v => v.vehicleType === vehicleType);
    if (vehicle) {
      form.reset({
        vehicleType: vehicle.vehicleType,
        basePrice: vehicle.basePrice,
        pricePerKm: vehicle.pricePerKm,
        nightHaltCharge: vehicle.nightHaltCharge,
        driverAllowance: vehicle.driverAllowance,
      });
      setSelectedVehicle(vehicle);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Pricing Management</CardTitle>
        <CardDescription>Update pricing parameters for different vehicle types</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleVehicleChange(value);
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="ertiga">Ertiga</SelectItem>
                      <SelectItem value="innova">Innova Crysta</SelectItem>
                      <SelectItem value="tempo">Tempo Traveller (12)</SelectItem>
                      <SelectItem value="luxury">Tempo Traveller (17)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Base fare" 
                        {...field}
                      />
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
                    <FormLabel>Per KM Price (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Per kilometer rate" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nightHaltCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Night Halt Charge (₹)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Night halt charge" 
                        {...field}
                      />
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
                      <Input 
                        type="number" 
                        placeholder="Driver allowance" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Updating..." : "Update Pricing"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
