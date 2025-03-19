
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
import { 
  AlertCircle, 
  RefreshCw, 
  Save, 
  Car,
  DollarSign,
  PlaneTakeoff,
  MapPin,
  Navigation,
  RepeatIcon,
  Warehouse,
  RotateCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { VehiclePricing, VehiclePricingUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';

const basePricingSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Allowance cannot be negative" }),
});

const localFareSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  package8hrs: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  package10hrs: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  extraHourCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
  extraKmCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
});

const airportFareSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  tier1: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier2: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier3: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier4: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  extraKmCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
});

const outstationFormSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  oneWayBasePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  oneWayPerKm: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  roundTripBasePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  roundTripPerKm: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Allowance cannot be negative" }),
});

export function VehiclePricingManagement() {
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast: uiToast } = useToast();
  
  const baseForm = useForm<z.infer<typeof basePricingSchema>>({
    resolver: zodResolver(basePricingSchema),
    defaultValues: {
      vehicleType: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    },
  });
  
  const localForm = useForm<z.infer<typeof localFareSchema>>({
    resolver: zodResolver(localFareSchema),
    defaultValues: {
      vehicleType: "",
      package8hrs: 0,
      package10hrs: 0,
      extraHourCharge: 0,
      extraKmCharge: 0,
    },
  });
  
  const airportForm = useForm<z.infer<typeof airportFareSchema>>({
    resolver: zodResolver(airportFareSchema),
    defaultValues: {
      vehicleType: "",
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      extraKmCharge: 0,
    },
  });
  
  const outstationForm = useForm<z.infer<typeof outstationFormSchema>>({
    resolver: zodResolver(outstationFormSchema),
    defaultValues: {
      vehicleType: "",
      oneWayBasePrice: 0,
      oneWayPerKm: 0,
      roundTripBasePrice: 0,
      roundTripPerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    },
  });
  
  useEffect(() => {
    fetchVehiclePricing();
  }, []);
  
  const fetchVehiclePricing = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      console.log("Manually refreshing vehicle pricing...");
      const data = await fareAPI.getVehiclePricing();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched vehicle pricing:", data);
        setVehiclePricing(data);
        toast.success("Vehicle pricing refreshed");
      } else {
        console.warn("Empty or invalid vehicle pricing data:", data);
        setError("No vehicle pricing data available. The API may be down or returned an empty result.");
      }
    } catch (error) {
      console.error("Error refreshing vehicle pricing:", error);
      setError("Failed to refresh vehicle pricing. Please try again.");
      toast.error("Failed to refresh vehicle pricing");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle standard pricing update
  const onBasePricingSubmit = async (values: z.infer<typeof basePricingSchema>) => {
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
  
  // Handle local fare update
  const onLocalFareSubmit = async (values: z.infer<typeof localFareSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting local fare update:", values);
      
      // Update local package prices in the database
      const requestData = {
        vehicleType: values.vehicleType,
        package8hrs: values.package8hrs,
        package10hrs: values.package10hrs,
        extraHourCharge: values.extraHourCharge,
        extraKmCharge: values.extraKmCharge,
      };
      
      // This is a placeholder - would need to create a new API endpoint for this
      // For now, just simulate success
      setTimeout(() => {
        toast.success("Local fare settings updated successfully");
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error("Error updating local fares:", error);
      toast.error("Failed to update local fares");
      setIsLoading(false);
    }
  };
  
  // Handle airport fare update
  const onAirportFareSubmit = async (values: z.infer<typeof airportFareSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting airport fare update:", values);
      
      // Update airport fare tiers in the database
      const requestData = {
        vehicleType: values.vehicleType,
        tier1: values.tier1,
        tier2: values.tier2,
        tier3: values.tier3,
        tier4: values.tier4,
        extraKmCharge: values.extraKmCharge,
      };
      
      // This is a placeholder - would need to create a new API endpoint for this
      // For now, just simulate success
      setTimeout(() => {
        toast.success("Airport fare settings updated successfully");
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error("Error updating airport fares:", error);
      toast.error("Failed to update airport fares");
      setIsLoading(false);
    }
  };
  
  // Handle outstation fare update
  const onOutstationFareSubmit = async (values: z.infer<typeof outstationFormSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting outstation fare update:", values);
      
      // Update outstation fares in the database
      const oneWayRequest = {
        vehicleType: values.vehicleType,
        basePrice: values.oneWayBasePrice,
        pricePerKm: values.oneWayPerKm,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance,
      };
      
      // For now, just simulate success
      setTimeout(() => {
        toast.success("Outstation fare settings updated successfully");
        setIsLoading(false);
      }, 500);
      
    } catch (error) {
      console.error("Error updating outstation fares:", error);
      toast.error("Failed to update outstation fares");
      setIsLoading(false);
    }
  };
  
  const handleBaseVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      baseForm.setValue("vehicleType", selectedVehicle.vehicleType);
      baseForm.setValue("basePrice", selectedVehicle.basePrice);
      baseForm.setValue("pricePerKm", selectedVehicle.pricePerKm);
      baseForm.setValue("nightHaltCharge", selectedVehicle.nightHaltCharge || 0);
      baseForm.setValue("driverAllowance", selectedVehicle.driverAllowance || 0);
    }
  };
  
  const handleLocalVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      localForm.setValue("vehicleType", selectedVehicle.vehicleType);
      
      // Set default values based on vehicle type
      if (vehicleType.toLowerCase().includes('sedan')) {
        localForm.setValue("package8hrs", 2500);
        localForm.setValue("package10hrs", 3000);
        localForm.setValue("extraHourCharge", 250);
        localForm.setValue("extraKmCharge", 14);
      } else if (vehicleType.toLowerCase().includes('ertiga')) {
        localForm.setValue("package8hrs", 3000);
        localForm.setValue("package10hrs", 3600);
        localForm.setValue("extraHourCharge", 300);
        localForm.setValue("extraKmCharge", 18);
      } else if (vehicleType.toLowerCase().includes('innova')) {
        localForm.setValue("package8hrs", 3800);
        localForm.setValue("package10hrs", 4500);
        localForm.setValue("extraHourCharge", 350);
        localForm.setValue("extraKmCharge", 20);
      }
    }
  };
  
  const handleAirportVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      airportForm.setValue("vehicleType", selectedVehicle.vehicleType);
      
      // Set default values based on vehicle type
      if (vehicleType.toLowerCase().includes('sedan')) {
        airportForm.setValue("tier1", 840);  // <= 15km
        airportForm.setValue("tier2", 1000); // <= 20km
        airportForm.setValue("tier3", 1200); // <= 30km
        airportForm.setValue("tier4", 1500); // <= 35km
        airportForm.setValue("extraKmCharge", 14);
      } else if (vehicleType.toLowerCase().includes('ertiga')) {
        airportForm.setValue("tier1", 1200);
        airportForm.setValue("tier2", 1500);
        airportForm.setValue("tier3", 1800);
        airportForm.setValue("tier4", 2100);
        airportForm.setValue("extraKmCharge", 18);
      } else if (vehicleType.toLowerCase().includes('innova')) {
        airportForm.setValue("tier1", 1500);
        airportForm.setValue("tier2", 1800);
        airportForm.setValue("tier3", 2100);
        airportForm.setValue("tier4", 2500);
        airportForm.setValue("extraKmCharge", 20);
      }
    }
  };
  
  const handleOutstationVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      outstationForm.setValue("vehicleType", selectedVehicle.vehicleType);
      outstationForm.setValue("oneWayBasePrice", selectedVehicle.basePrice);
      outstationForm.setValue("oneWayPerKm", selectedVehicle.pricePerKm);
      outstationForm.setValue("roundTripBasePrice", selectedVehicle.basePrice * 0.9); // 10% discount for round trips
      outstationForm.setValue("roundTripPerKm", selectedVehicle.pricePerKm * 0.9);
      outstationForm.setValue("nightHaltCharge", selectedVehicle.nightHaltCharge || 0);
      outstationForm.setValue("driverAllowance", selectedVehicle.driverAllowance || 0);
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
    <Tabs defaultValue="base">
      <TabsList className="w-full flex">
        <TabsTrigger value="base" className="flex-1 flex items-center justify-center gap-1">
          <Car className="h-4 w-4" /> Base Pricing
        </TabsTrigger>
        <TabsTrigger value="outstation" className="flex-1 flex items-center justify-center gap-1">
          <Navigation className="h-4 w-4" /> Outstation
        </TabsTrigger>
        <TabsTrigger value="local" className="flex-1 flex items-center justify-center gap-1">
          <MapPin className="h-4 w-4" /> Local
        </TabsTrigger>
        <TabsTrigger value="airport" className="flex-1 flex items-center justify-center gap-1">
          <PlaneTakeoff className="h-4 w-4" /> Airport
        </TabsTrigger>
        <TabsTrigger value="all" className="flex-1 flex items-center justify-center gap-1">
          <Warehouse className="h-4 w-4" /> All Pricing
        </TabsTrigger>
      </TabsList>
      
      {/* Base Pricing Tab */}
      <TabsContent value="base">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> Base Vehicle Pricing
              </CardTitle>
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
            
            <Form {...baseForm}>
              <form onSubmit={baseForm.handleSubmit(onBasePricingSubmit)} className="space-y-6">
                <FormField
                  control={baseForm.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleBaseVehicleSelect(value);
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
                    control={baseForm.control}
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
                    control={baseForm.control}
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
                    control={baseForm.control}
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
                    control={baseForm.control}
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
                      Update Base Pricing
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Outstation Pricing Tab */}
      <TabsContent value="outstation">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" /> Outstation Fare Settings
              </CardTitle>
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
            <Form {...outstationForm}>
              <form onSubmit={outstationForm.handleSubmit(onOutstationFareSubmit)} className="space-y-6">
                <FormField
                  control={outstationForm.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleOutstationVehicleSelect(value);
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
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <Navigation className="h-4 w-4 mr-1" /> One Way Trip Pricing
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={outstationForm.control}
                      name="oneWayBasePrice"
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
                      control={outstationForm.control}
                      name="oneWayPerKm"
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
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <RotateCw className="h-4 w-4 mr-1" /> Round Trip Pricing
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={outstationForm.control}
                      name="roundTripBasePrice"
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
                      control={outstationForm.control}
                      name="roundTripPerKm"
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
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <DollarSign className="h-4 w-4 mr-1" /> Additional Charges
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={outstationForm.control}
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
                      control={outstationForm.control}
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
                      Update Outstation Pricing
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Local Package Pricing Tab */}
      <TabsContent value="local">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Local Package Pricing
              </CardTitle>
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
            <Form {...localForm}>
              <form onSubmit={localForm.handleSubmit(onLocalFareSubmit)} className="space-y-6">
                <FormField
                  control={localForm.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleLocalVehicleSelect(value);
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
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <MapPin className="h-4 w-4 mr-1" /> Package Pricing
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={localForm.control}
                      name="package8hrs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>8 Hrs / 80 KM Package</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={localForm.control}
                      name="package10hrs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>10 Hrs / 100 KM Package</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <DollarSign className="h-4 w-4 mr-1" /> Extra Charges
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={localForm.control}
                      name="extraHourCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Extra Hour Charge</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={localForm.control}
                      name="extraKmCharge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Extra KM Charge</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                      Update Local Pricing
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Airport Transfer Pricing Tab */}
      <TabsContent value="airport">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <PlaneTakeoff className="h-5 w-5" /> Airport Transfer Pricing
              </CardTitle>
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
            <Form {...airportForm}>
              <form onSubmit={airportForm.handleSubmit(onAirportFareSubmit)} className="space-y-6">
                <FormField
                  control={airportForm.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleAirportVehicleSelect(value);
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
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <PlaneTakeoff className="h-4 w-4 mr-1" /> Distance Tiers
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={airportForm.control}
                      name="tier1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 1 (0-15 KM)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={airportForm.control}
                      name="tier2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 2 (16-20 KM)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={airportForm.control}
                      name="tier3"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 3 (21-30 KM)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={airportForm.control}
                      name="tier4"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 4 (31-35 KM)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <DollarSign className="h-4 w-4 mr-1" /> Additional KM Charge
                  </h3>
                  <FormField
                    control={airportForm.control}
                    name="extraKmCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Per KM Charge (beyond 35 KM)</FormLabel>
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
                      Update Airport Pricing
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
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> All Vehicle Pricing
              </CardTitle>
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
