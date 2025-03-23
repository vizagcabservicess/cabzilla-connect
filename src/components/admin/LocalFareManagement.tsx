
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { hourlyPackages } from '@/lib/packageData';
import { FareUpdateError } from '../cab-options/FareUpdateError';

const formSchema = z.object({
  cabType: z.string().min(1, { message: "Cab type is required" }),
  package4hr40km: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  package8hr80km: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  package10hr100km: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  extraKmRate: z.coerce.number().min(0, { message: "Rate cannot be negative" }),
  extraHourRate: z.coerce.number().min(0, { message: "Rate cannot be negative" }),
});

export function LocalFareManagement() {
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentVehicleId, setCurrentVehicleId] = useState<string>("");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabType: "",
      package4hr40km: 0,
      package8hr80km: 0,
      package10hr100km: 0,
      extraKmRate: 0,
      extraHourRate: 0,
    },
  });
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Force clear caches to ensure we get fresh data
      fareService.clearCache();
      
      // Load cab types
      const types = await loadCabTypes();
      setCabTypes(types);
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cab types'));
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating local fares for ${values.cabType}...`);
      
      // Use FormData for more reliable transport
      const formData = new FormData();
      formData.append('vehicleId', values.cabType);
      formData.append('tripType', 'local');
      formData.append('package4hr40km', values.package4hr40km.toString());
      formData.append('package8hr80km', values.package8hr80km.toString());
      formData.append('package10hr100km', values.package10hr100km.toString());
      formData.append('extraKmRate', values.extraKmRate.toString());
      formData.append('extraHourRate', values.extraHourRate.toString());
      
      // Package specific IDs
      formData.append('local_package_4hr', values.package4hr40km.toString());
      formData.append('local_package_8hr', values.package8hr80km.toString());
      formData.append('local_package_10hr', values.package10hr100km.toString());
      formData.append('extra_km_rate', values.extraKmRate.toString());
      formData.append('extra_hour_rate', values.extraHourRate.toString());
      
      // Direct update with super simple approach
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php?_t=${Date.now()}`;
        
        // Direct fetch with minimal content
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        const jsonResponse = await response.json();
        console.log('Server response:', jsonResponse);
        
        if (jsonResponse.status === 'success') {
          // Clear cache and force update
          fareService.clearCache();
          
          window.dispatchEvent(new CustomEvent('local-fares-updated', {
            detail: {
              timestamp: Date.now(),
              vehicleId: values.cabType,
              packages: {
                '4hrs-40km': values.package4hr40km,
                '8hrs-80km': values.package8hr80km,
                '10hrs-100km': values.package10hr100km
              }
            }
          }));
          
          // Force refresh on the page
          window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
          localStorage.setItem('forceCacheRefresh', 'true');
          
          toast.success(`Local fares updated for ${values.cabType}`);
        } else {
          throw new Error(jsonResponse.message || 'Update failed');
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        
        // Try using the fareService as a fallback
        try {
          const result = await fareService.directFareUpdate('local', values.cabType, {
            package4hr40km: values.package4hr40km,
            package8hr80km: values.package8hr80km,
            package10hr100km: values.package10hr100km,
            extraKmRate: values.extraKmRate,
            extraHourRate: values.extraHourRate
          });
          
          if (result && result.status === 'success') {
            // Force refresh events
            window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
            window.dispatchEvent(new CustomEvent('local-fares-updated', {
              detail: { timestamp: Date.now() }
            }));
            
            toast.success(`Local fares updated for ${values.cabType}`);
          } else {
            throw new Error('Update service failed');
          }
        } catch (serviceError) {
          setError(fetchError instanceof Error ? fetchError : new Error('Update failed'));
          toast.error(`Failed to update local fares: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update local fares'));
      toast.error(`Failed to update local fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Local Fare Management</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <FareUpdateError 
              error={error} 
              onRetry={loadData}
              title="Local Fare Update Failed"
              description="There was a problem updating the local package fares. This could be due to network issues or server problems."
            />
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cabType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setCurrentVehicleId(value);
                        // Load existing fare data for this cab type
                        loadFaresForVehicle(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cabTypes.map((cab) => (
                          <SelectItem key={cab.id} value={cab.id}>
                            {cab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4">
                <h3 className="text-lg font-medium">Hourly Packages</h3>
                
                <FormField
                  control={form.control}
                  name="package4hr40km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>4 Hours / 40 KM Package</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="package8hr80km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>8 Hours / 80 KM Package</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="package10hr100km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>10 Hours / 100 KM Package</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  name="extraKmRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra KM Rate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="extraHourRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Hour Rate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          className="font-mono"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={loadData} disabled={isLoading}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Fares
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
  
  async function loadFaresForVehicle(vehicleId: string) {
    if (!vehicleId) return;
    
    try {
      setIsLoading(true);
      
      try {
        const fareData = await fareService.getLocalFaresForVehicle(vehicleId);
        
        if (fareData) {
          form.setValue("package4hr40km", fareData.package4hr40km || 0);
          form.setValue("package8hr80km", fareData.package8hr80km || 0);
          form.setValue("package10hr100km", fareData.package10hr100km || 0);
          form.setValue("extraKmRate", fareData.extraKmRate || 0);
          form.setValue("extraHourRate", fareData.extraHourRate || 0);
        }
      } catch (error) {
        console.error(`Failed to load fares for ${vehicleId}:`, error);
        // Continue with defaults
      }
      
    } catch (err) {
      console.error("Error loading fare data:", err);
    } finally {
      setIsLoading(false);
    }
  }
}
