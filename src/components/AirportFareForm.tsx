
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertCircle, HelpCircle, Info, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirportFare } from '@/types/cab';
import { updateAirportFare } from '@/services/fareUpdateService';
import { FareUpdateError } from './cab-options/FareUpdateError';
import { Card, CardContent } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const airportFareSchema = z.object({
  basePrice: z.coerce.number().min(0, "Base price must be a positive number"),
  pricePerKm: z.coerce.number().min(0, "Price per km must be a positive number"),
  pickupPrice: z.coerce.number().min(0, "Pickup price must be a positive number"),
  dropPrice: z.coerce.number().min(0, "Drop price must be a positive number"),
  tier1Price: z.coerce.number().min(0, "Tier 1 price must be a positive number"),
  tier2Price: z.coerce.number().min(0, "Tier 2 price must be a positive number"),
  tier3Price: z.coerce.number().min(0, "Tier 3 price must be a positive number"),
  tier4Price: z.coerce.number().min(0, "Tier 4 price must be a positive number"),
  extraKmCharge: z.coerce.number().min(0, "Extra km charge must be a positive number"),
  nightCharges: z.coerce.number().min(0, "Night charges must be a positive number"),
  extraWaitingCharges: z.coerce.number().min(0, "Extra waiting charges must be a positive number"),
});

type AirportFareFormValues = z.infer<typeof airportFareSchema>;

interface AirportFareFormProps {
  vehicleId: string;
  initialData: AirportFare | null;
  onSuccess?: () => void;
}

export function AirportFareForm({ vehicleId, initialData, onSuccess }: AirportFareFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const form = useForm<AirportFareFormValues>({
    resolver: zodResolver(airportFareSchema),
    defaultValues: {
      basePrice: 0,
      pricePerKm: 0,
      pickupPrice: 0,
      dropPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0,
      nightCharges: 0,
      extraWaitingCharges: 0,
    },
  });

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial airport fare data:", initialData);
      form.reset({
        basePrice: initialData.basePrice || 0,
        pricePerKm: initialData.pricePerKm || 0,
        pickupPrice: initialData.pickupPrice || 0,
        dropPrice: initialData.dropPrice || 0,
        tier1Price: initialData.tier1Price || 0,
        tier2Price: initialData.tier2Price || 0,
        tier3Price: initialData.tier3Price || 0,
        tier4Price: initialData.tier4Price || 0,
        extraKmCharge: initialData.extraKmCharge || 0,
        nightCharges: initialData.nightCharges || 0,
        extraWaitingCharges: initialData.extraWaitingCharges || 0,
      });
    }
  }, [initialData, form]);

  async function onSubmit(values: AirportFareFormValues) {
    if (!vehicleId) {
      setError(new Error("Vehicle ID is required"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Make sure all required fields are included and not undefined
      const updateData = {
        vehicleId,
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        pickupPrice: values.pickupPrice,
        dropPrice: values.dropPrice,
        tier1Price: values.tier1Price,
        tier2Price: values.tier2Price,
        tier3Price: values.tier3Price,
        tier4Price: values.tier4Price,
        extraKmCharge: values.extraKmCharge,
        nightCharges: values.nightCharges,
        extraWaitingCharges: values.extraWaitingCharges
      };
      
      console.log("Updating airport fares with data:", updateData);
      
      const response = await updateAirportFare(updateData);
      
      console.log("Airport fare update response:", response);
      
      if (response && response.status === 'success') {
        toast.success("Airport fares updated successfully");
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = response?.message || "Failed to update airport fares";
        const newError = new Error(errorMessage);
        setError(newError);
        toast.error(errorMessage);
      }
    } catch (err: any) {
      console.error("Error updating airport fares:", err);
      setError(err);
      toast.error(err?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <FareUpdateError 
          error={error} 
          onRetry={() => form.handleSubmit(onSubmit)()} 
          isAdmin={true}
        />
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-700">Airport Transfer Pricing</h4>
            <p className="text-sm text-blue-600 mt-1">
              Configure pricing for airport transfers. The system uses different pricing tiers based on distance zones.
              Set base price, per-km rates, pickup/drop fees, and additional charges for night trips or extra waiting time.
            </p>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-base font-medium mb-4">Base Pricing</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Base Price (₹)</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">The starting price for any airport transfer</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 1500" {...field} />
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
                          <div className="flex items-center gap-2">
                            <FormLabel>Price Per KM (₹)</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Rate charged per kilometer traveled</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 15" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-base font-medium mb-4">Airport Fees</h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pickupPrice"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Airport Pickup Price (₹)</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Additional fee for picking up passengers from the airport</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dropPrice"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Airport Drop Price (₹)</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Additional fee for dropping passengers at the airport</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input type="number" placeholder="e.g. 800" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-medium mb-4">Distance Tiers (Pricing by Zone)</h3>
              <FormDescription className="mb-4">
                Configure pricing for different distance zones from the airport
              </FormDescription>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="tier1Price"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Tier 1 Price (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Zone 1 (nearest to airport)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 600" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier2Price"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Tier 2 Price (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Zone 2 (short distance from airport)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 800" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier3Price"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Tier 3 Price (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Zone 3 (medium distance from airport)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier4Price"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Tier 4 Price (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Zone 4 (furthest from airport)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 1200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-base font-medium mb-4">Additional Charges</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="extraKmCharge"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Extra KM Charge (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Charge per additional kilometer beyond the included distance</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nightCharges"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Night Charges (₹)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Additional fee for trips between 10 PM and 6 AM</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="extraWaitingCharges"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Extra Waiting Charges (₹/hr)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Fee per hour for waiting beyond included waiting time</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 150" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Airport Fares...
              </>
            ) : (
              'Save Airport Fares'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
