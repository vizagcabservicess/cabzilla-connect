
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { VehiclePricing, VehiclePricingUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';

const formSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Allowance cannot be negative" }),
});

export function VehiclePricingManagement() {
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast: uiToast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
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
        // Cache busting (without passing to API)
        console.log("Fetching vehicle pricing with cache busting...");
        const data = await fareAPI.getVehiclePricing();
        console.log("Fetched vehicle pricing:", data);
        setVehiclePricing(data);
      } catch (error) {
        console.error("Error fetching vehicle pricing:", error);
        setError("Failed to load vehicle pricing. Please try again.");
      }
    };
    
    fetchVehiclePricing();
  }, []);
  
  const fetchVehiclePricing = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      console.log("Manually refreshing vehicle pricing...");
      const data = await fareAPI.getVehiclePricing();
      setVehiclePricing(data);
      toast.success("Vehicle pricing refreshed");
    } catch (error) {
      console.error("Error refreshing vehicle pricing:", error);
      setError("Failed to refresh vehicle pricing. Please try again.");
      toast.error("Failed to refresh vehicle pricing");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting vehicle pricing update:", values);
      
      const data = await fareAPI.updateVehiclePricing(values as VehiclePricingUpdateRequest);
      console.log("Vehicle pricing update response:", data);
      
      toast.success("Vehicle pricing updated successfully");
      await fetchVehiclePricing();
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      toast.error("Failed to update vehicle pricing");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      form.setValue("vehicleType", selectedVehicle.vehicleType);
      form.setValue("basePrice", selectedVehicle.basePrice);
      form.setValue("pricePerKm", selectedVehicle.pricePerKm);
      form.setValue("nightHaltCharge", selectedVehicle.nightHaltCharge || 0);
      form.setValue("driverAllowance", selectedVehicle.driverAllowance || 0);
    }
  };
  
  if (error && !vehiclePricing.length) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchVehiclePricing} 
        title="Vehicle Pricing Error" 
        description="Unable to load vehicle pricing data. This may be due to a network issue or server problem."
      />
    );
  }

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update">Update Vehicle Pricing</TabsTrigger>
        <TabsTrigger value="all">View All Pricing</TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Update Vehicle Pricing</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchVehiclePricing} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
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
                          handleVehicleSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehiclePricing.map((pricing) => (
                            <SelectItem key={pricing.vehicleType} value={pricing.vehicleType}>
                              {pricing.vehicleType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 grid-cols-2">
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Price Per KM</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Night Halt Charge</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Driver Allowance</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Pricing
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Vehicle Pricing</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchVehiclePricing} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isRefreshing ? (
              <div className="flex justify-center p-10">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : vehiclePricing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Vehicle Type</th>
                      <th className="text-right py-2 px-2">Base Price</th>
                      <th className="text-right py-2 px-2">Price/KM</th>
                      <th className="text-right py-2 px-2">Night Halt</th>
                      <th className="text-right py-2 px-2">Driver Allowance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclePricing.map((pricing) => (
                      <tr key={pricing.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{pricing.vehicleType}</td>
                        <td className="text-right py-2 px-2">₹{pricing.basePrice.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{pricing.pricePerKm.toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{(pricing.nightHaltCharge || 0).toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{(pricing.driverAllowance || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No vehicle pricing found.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
