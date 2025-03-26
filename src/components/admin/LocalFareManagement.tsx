
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
      
      // Package specific IDs for compatibility with all endpoints
      formData.append('local_package_4hr', values.package4hr40km.toString());
      formData.append('local_package_8hr', values.package8hr80km.toString());
      formData.append('local_package_10hr', values.package10hr100km.toString());
      formData.append('extra_km_rate', values.extraKmRate.toString());
      formData.append('extra_hour_rate', values.extraHourRate.toString());
      
      // For critical endpoints
      formData.append('vehicle_id', values.cabType);
      formData.append('trip_type', 'local');
      formData.append('prices[4hrs-40km]', values.package4hr40km.toString());
      formData.append('prices[8hrs-80km]', values.package8hr80km.toString());
      formData.append('prices[10hrs-100km]', values.package10hr100km.toString());
      
      let success = false;
      let updateSuccess = false;
      let errorMessage = '';
      
      // Try multiple methods to update fares
      
      // Method 1: Direct update with FormData
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const endpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php?_t=${Date.now()}`;
        
        // Direct fetch with minimal content
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });
        
        const jsonResponse = await response.json();
        console.log('Server response method 1:', jsonResponse);
        
        if (jsonResponse.status === 'success') {
          success = true;
          updateSuccess = true;
        } else {
          errorMessage = jsonResponse.message || 'Update failed';
          console.error('Method 1 failed:', errorMessage);
        }
      } catch (fetchError) {
        console.error('Method 1 fetch error:', fetchError);
        errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
      }
      
      // Method 2: Try specific local-fares-update endpoint
      if (!success) {
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const endpoint = `${apiBaseUrl}/api/admin/local-fares-update.php?_t=${Date.now()}`;
          
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
          });
          
          const jsonResponse = await response.json();
          console.log('Server response method 2:', jsonResponse);
          
          if (jsonResponse.status === 'success') {
            success = true;
            updateSuccess = true;
          } else {
            if (!errorMessage) {
              errorMessage = jsonResponse.message || 'Update failed';
              console.error('Method 2 failed:', errorMessage);
            }
          }
        } catch (fetchError) {
          console.error('Method 2 fetch error:', fetchError);
          if (!errorMessage) {
            errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
          }
        }
      }
      
      // Method 3: Try using the fareService as a fallback
      if (!success) {
        try {
          const result = await fareService.directFareUpdate('local', values.cabType, {
            package4hr40km: values.package4hr40km,
            package8hr80km: values.package8hr80km,
            package10hr100km: values.package10hr100km,
            extraKmRate: values.extraKmRate,
            extraHourRate: values.extraHourRate
          });
          
          console.log('Server response method 3:', result);
          
          if (result && result.status === 'success') {
            success = true;
            updateSuccess = true;
          } else {
            if (!errorMessage) {
              errorMessage = result?.message || 'Update service failed';
              console.error('Method 3 failed:', errorMessage);
            }
          }
        } catch (serviceError) {
          console.error('Method 3 service error:', serviceError);
          if (!errorMessage) {
            errorMessage = serviceError instanceof Error ? serviceError.message : 'Service error';
          }
        }
      }
      
      // Update local storage cache regardless of server response
      try {
        // Get the price matrix from localStorage
        const storedMatrix = localStorage.getItem('localPackagePriceMatrix');
        let matrix = storedMatrix ? JSON.parse(storedMatrix) : {};
        
        // Initialize the matrix structure if it doesn't exist
        if (!matrix) matrix = {};
        ['4hrs-40km', '8hrs-80km', '10hrs-100km'].forEach(pkg => {
          if (!matrix[pkg]) matrix[pkg] = {};
        });
        
        // Update the prices in the matrix
        const normalizedVehicleId = values.cabType.toLowerCase();
        
        matrix['4hrs-40km'][normalizedVehicleId] = values.package4hr40km;
        matrix['8hrs-80km'][normalizedVehicleId] = values.package8hr80km;
        matrix['10hrs-100km'][normalizedVehicleId] = values.package10hr100km;
        
        // Handle vehicle ID variations (innova_crysta -> innova, luxury -> luxury sedan)
        if (normalizedVehicleId === 'innova_crysta' || normalizedVehicleId === 'innova crysta') {
          matrix['4hrs-40km']['innova'] = values.package4hr40km;
          matrix['8hrs-80km']['innova'] = values.package8hr80km;
          matrix['10hrs-100km']['innova'] = values.package10hr100km;
        }
        
        if (normalizedVehicleId === 'luxury') {
          matrix['4hrs-40km']['luxury sedan'] = values.package4hr40km;
          matrix['8hrs-80km']['luxury sedan'] = values.package8hr80km;
          matrix['10hrs-100km']['luxury sedan'] = values.package10hr100km;
        }
        
        // Save the updated matrix back to localStorage
        localStorage.setItem('localPackagePriceMatrix', JSON.stringify(matrix));
        localStorage.setItem('localPackagePriceMatrixUpdated', Date.now().toString());
        
        console.log('Updated localPackagePriceMatrix in localStorage:', matrix);
        
        // Force local cache update for better UI feedback even if server update fails
        updateSuccess = true;
      } catch (cacheError) {
        console.error('Error updating local cache:', cacheError);
      }
      
      // Always trigger events to refresh the UI
      if (updateSuccess) {
        // Dispatch events to update UI components
        window.dispatchEvent(new CustomEvent('local-fares-updated', {
          detail: {
            timestamp: Date.now(),
            vehicleId: values.cabType,
            packages: {
              '4hrs-40km': values.package4hr40km,
              '8hrs-80km': values.package8hr80km,
              '10hrs-100km': values.package10hr100km
            },
            prices: {
              '4hrs-40km': values.package4hr40km,
              '8hrs-80km': values.package8hr80km,
              '10hrs-100km': values.package10hr100km
            }
          }
        }));
        
        // Clear cache and force update
        fareService.clearCache();
        window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
        localStorage.setItem('forceCacheRefresh', 'true');
        
        toast.success(`Local fares updated for ${values.cabType}`);
      } else {
        setError(new Error(errorMessage || 'Failed to update local fares'));
        toast.error(`Failed to update local fares: ${errorMessage || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update local fares'));
      toast.error(`Failed to update local fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      
      // Remove force refresh flag after a short delay
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 5000);
    }
  };
  
  const loadFaresForVehicle = async (vehicleId: string) => {
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
        } else {
          // Try loading from localStorage
          const storedMatrix = localStorage.getItem('localPackagePriceMatrix');
          if (storedMatrix) {
            try {
              const matrix = JSON.parse(storedMatrix);
              const normalizedVehicleId = vehicleId.toLowerCase();
              
              if (matrix && matrix['4hrs-40km'] && matrix['4hrs-40km'][normalizedVehicleId]) {
                form.setValue("package4hr40km", matrix['4hrs-40km'][normalizedVehicleId] || 0);
              }
              
              if (matrix && matrix['8hrs-80km'] && matrix['8hrs-80km'][normalizedVehicleId]) {
                form.setValue("package8hr80km", matrix['8hrs-80km'][normalizedVehicleId] || 0);
              }
              
              if (matrix && matrix['10hrs-100km'] && matrix['10hrs-100km'][normalizedVehicleId]) {
                form.setValue("package10hr100km", matrix['10hrs-100km'][normalizedVehicleId] || 0);
              }
            } catch (error) {
              console.error("Error parsing localPackagePriceMatrix:", error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to load fares for ${vehicleId}:`, error);
        // Continue with defaults or try localstorage
        
        // Try loading from localStorage as a fallback
        const storedMatrix = localStorage.getItem('localPackagePriceMatrix');
        if (storedMatrix) {
          try {
            const matrix = JSON.parse(storedMatrix);
            const normalizedVehicleId = vehicleId.toLowerCase();
            
            if (matrix && matrix['4hrs-40km'] && matrix['4hrs-40km'][normalizedVehicleId]) {
              form.setValue("package4hr40km", matrix['4hrs-40km'][normalizedVehicleId] || 0);
            }
            
            if (matrix && matrix['8hrs-80km'] && matrix['8hrs-80km'][normalizedVehicleId]) {
              form.setValue("package8hr80km", matrix['8hrs-80km'][normalizedVehicleId] || 0);
            }
            
            if (matrix && matrix['10hrs-100km'] && matrix['10hrs-100km'][normalizedVehicleId]) {
              form.setValue("package10hr100km", matrix['10hrs-100km'][normalizedVehicleId] || 0);
            }
          } catch (error) {
            console.error("Error parsing localPackagePriceMatrix:", error);
          }
        }
      }
      
    } catch (err) {
      console.error("Error loading fare data:", err);
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
}
