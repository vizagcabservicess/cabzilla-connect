
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, RefreshCw, Save, ArrowRight } from "lucide-react";
import { getOutstationFare, updateOutstationFare } from '@/services/outstationFareService';
import { OutstationFare } from '@/types/cab';

interface OutstationFareFormProps {
  vehicleId: string;
  onFareUpdated: () => void;
}

const formSchema = z.object({
  baseFare: z.coerce.number().min(0, { message: "Base fare cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  roundTripBaseFare: z.coerce.number().min(0, { message: "Round trip base fare cannot be negative" }),
  roundTripPricePerKm: z.coerce.number().min(0, { message: "Round trip price per km cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
});

export const OutstationFareForm: React.FC<OutstationFareFormProps> = ({ vehicleId, onFareUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialFareData, setInitialFareData] = useState<OutstationFare | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseFare: 0,
      pricePerKm: 0,
      roundTripBaseFare: 0,
      roundTripPricePerKm: 0,
      driverAllowance: 250,
      nightHaltCharge: 700,
    },
  });

  useEffect(() => {
    if (!vehicleId) return;
    
    const fetchFareData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fareData = await getOutstationFare(vehicleId);
        
        if (fareData) {
          setInitialFareData(fareData);
          form.reset({
            baseFare: fareData.baseFare,
            pricePerKm: fareData.pricePerKm,
            roundTripBaseFare: fareData.roundTripBaseFare,
            roundTripPricePerKm: fareData.roundTripPricePerKm,
            driverAllowance: fareData.driverAllowance,
            nightHaltCharge: fareData.nightHaltCharge,
          });
        } else {
          setError("No fare data found for this vehicle. You can set new values below.");
        }
      } catch (err) {
        console.error("Error fetching outstation fare data:", err);
        setError("Failed to load fare data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFareData();
  }, [vehicleId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!vehicleId) {
      setError("No vehicle selected. Please select a vehicle first.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const outstationFare: OutstationFare = {
        baseFare: values.baseFare,
        pricePerKm: values.pricePerKm,
        roundTripBaseFare: values.roundTripBaseFare,
        roundTripPricePerKm: values.roundTripPricePerKm,
        driverAllowance: values.driverAllowance,
        nightHaltCharge: values.nightHaltCharge,
        vehicleId: vehicleId
      };

      const result = await updateOutstationFare(vehicleId, outstationFare);
      
      if (result.success) {
        setInitialFareData(outstationFare);
        toast.success("Outstation fare updated successfully");
        onFareUpdated();
      } else {
        setError(result.message || "Failed to update fare data");
        toast.error(result.message || "Failed to update fare data");
      }
    } catch (err) {
      console.error("Error updating outstation fare:", err);
      setError("An error occurred while updating fare data");
      toast.error("An error occurred while updating fare data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Outstation Fares for {vehicleId.charAt(0).toUpperCase() + vehicleId.slice(1).replace('_', ' ')}
        </CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">One-way Trip</h3>
                <FormField
                  control={form.control}
                  name="baseFare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Fare (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="e.g. 2500" />
                      </FormControl>
                      <FormDescription>
                        Minimum fare charged for one-way trip
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="e.g. 15" />
                      </FormControl>
                      <FormDescription>
                        Rate charged per kilometer for one-way trip
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Round Trip</h3>
                <FormField
                  control={form.control}
                  name="roundTripBaseFare"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Trip Base Fare (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="e.g. 3000" />
                      </FormControl>
                      <FormDescription>
                        Minimum fare charged for round trip
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roundTripPricePerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Trip Price per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="e.g. 12" />
                      </FormControl>
                      <FormDescription>
                        Rate charged per kilometer for round trip
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="driverAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Allowance (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="e.g. 250" />
                    </FormControl>
                    <FormDescription>
                      Daily allowance for driver
                    </FormDescription>
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
                      <Input type="number" {...field} placeholder="e.g. 700" />
                    </FormControl>
                    <FormDescription>
                      Charge for overnight stay
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Outstation Fare
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
