
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AirportFare } from '@/types/cab';
import { updateAirportFare, getDirectAirportFare } from '@/services/fareUpdateService';
import { toast } from 'sonner';

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
  extraWaitingCharges: z.coerce.number().min(0, "Extra waiting charges must be a positive number")
});

type AirportFareFormValues = z.infer<typeof airportFareSchema>;

interface AirportFareFormProps {
  vehicleId: string;
  onSuccess?: () => void;
  initialData?: Partial<AirportFare>;
}

export function AirportFareForm({ vehicleId, onSuccess, initialData }: AirportFareFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(!initialData);
  
  const form = useForm<AirportFareFormValues>({
    resolver: zodResolver(airportFareSchema),
    defaultValues: {
      basePrice: initialData?.basePrice || 0,
      pricePerKm: initialData?.pricePerKm || 0,
      pickupPrice: initialData?.pickupPrice || 0,
      dropPrice: initialData?.dropPrice || 0,
      tier1Price: initialData?.tier1Price || 0,
      tier2Price: initialData?.tier2Price || 0,
      tier3Price: initialData?.tier3Price || 0,
      tier4Price: initialData?.tier4Price || 0,
      extraKmCharge: initialData?.extraKmCharge || 0,
      nightCharges: initialData?.nightCharges || 0,
      extraWaitingCharges: initialData?.extraWaitingCharges || 0
    }
  });
  
  // Fetch current fares from the API if initialData is not provided
  useEffect(() => {
    const fetchFares = async () => {
      if (!vehicleId || !loadingData) return;
      
      try {
        setLoadingData(true);
        setError(null);
        
        const fare = await getDirectAirportFare(vehicleId);
        
        if (fare) {
          console.log('Loaded airport fare data:', fare);
          form.reset({
            basePrice: fare.basePrice || 0,
            pricePerKm: fare.pricePerKm || 0,
            pickupPrice: fare.pickupPrice || 0,
            dropPrice: fare.dropPrice || 0,
            tier1Price: fare.tier1Price || 0,
            tier2Price: fare.tier2Price || 0,
            tier3Price: fare.tier3Price || 0,
            tier4Price: fare.tier4Price || 0,
            extraKmCharge: fare.extraKmCharge || 0,
            nightCharges: fare.nightCharges || 0,
            extraWaitingCharges: fare.extraWaitingCharges || 0
          });
        } else {
          console.log('No existing airport fare data found');
          // Reset with default values
          form.reset({
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
            extraWaitingCharges: 0
          });
        }
      } catch (err: any) {
        console.error('Error loading airport fare data:', err);
        setError(`Failed to load fare data: ${err.message}`);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchFares();
  }, [vehicleId, form, loadingData, initialData]);
  
  const onSubmit = async (data: AirportFareFormValues) => {
    if (!vehicleId) {
      setError('Vehicle ID is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Submitting airport fare data:', data);
      
      // Prepare the fare data for API
      const fareData: AirportFare = {
        vehicleId,
        basePrice: data.basePrice,
        pricePerKm: data.pricePerKm,
        pickupPrice: data.pickupPrice,
        dropPrice: data.dropPrice,
        tier1Price: data.tier1Price,
        tier2Price: data.tier2Price,
        tier3Price: data.tier3Price,
        tier4Price: data.tier4Price,
        extraKmCharge: data.extraKmCharge,
        nightCharges: data.nightCharges,
        extraWaitingCharges: data.extraWaitingCharges
      };
      
      // Update the fare
      const result = await updateAirportFare(fareData);
      
      if (result.status === 'success') {
        toast.success('Airport fare updated successfully');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Error updating airport fare:', err);
      setError(`Failed to update fare: ${err.message}`);
      toast.error(`Error updating airport fare: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loadingData ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading fare data...</span>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Base price for airport transfers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pricePerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Per kilometer charge</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pickupPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Airport pickup price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dropPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drop Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Airport drop price</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier1Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 1 Price (0-10 KM) (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Pricing for 0-10 KM distance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier2Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 2 Price (11-20 KM) (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Pricing for 11-20 KM distance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier3Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 3 Price (21-30 KM) (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Pricing for 21-30 KM distance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tier4Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 4 Price (31+ KM) (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Pricing for 31+ KM distance</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="extraKmCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra KM Charge (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Charge per extra kilometer</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="nightCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Night Charges (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Additional charges for night transfers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="extraWaitingCharges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Waiting Charges (₹/hr)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>Charge per hour of additional waiting</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <CardFooter className="px-0 pt-4">
                <Button type="submit" disabled={loading || loadingData} className="ml-auto">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Airport Fare
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
