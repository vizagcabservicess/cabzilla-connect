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
import { AlertCircle, Database, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { hourlyPackages } from '@/lib/packageData';
import { FareUpdateError } from '../cab-options/FareUpdateError';
import axios from 'axios';

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
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentVehicleId, setCurrentVehicleId] = useState<string>("");
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
  
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
      const types = await loadCabTypes(true);
      setCabTypes(types);
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cab types'));
      setIsLoading(false);
    }
  };

  const initializeDatabase = async () => {
    try {
      setIsInitializingDB(true);
      setError(null);
      
      // First try to sync between tables to ensure consistency
      try {
        const syncEndpoint = `${apiBaseUrl}/api/admin/sync-local-fares.php?_t=${Date.now()}`;
        console.log("Syncing local package fares tables:", syncEndpoint);
        await axios.get(syncEndpoint, {
          headers: fareService.getBypassHeaders(),
          timeout: 10000 // 10 second timeout
        });
        toast.success("Local package fares tables synchronized");
      } catch (syncErr) {
        console.error("Error syncing local package fares:", syncErr);
        toast.error("Failed to sync tables, will try database initialization");
      }
      
      const result = await fareService.initializeDatabase(true);
      console.log('Database initialization response:', result);
      
      toast.success("Database tables initialized successfully");
      await loadData();
    } catch (err) {
      console.error("Error initializing database:", err);
      toast.error(`Failed to initialize database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    } finally {
      setIsInitializingDB(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toast.info(`Updating local fares for ${values.cabType}...`);
      console.log('Starting fare update for local packages with vehicle ID', values.cabType);
      
      // Use FormData for more reliable transport
      const formData = new FormData();
      formData.append('vehicleId', values.cabType);
      formData.append('tripType', 'local');
      formData.append('price4hrs40km', values.package4hr40km.toString());
      formData.append('price8hrs80km', values.package8hr80km.toString());
      formData.append('price10hrs100km', values.package10hr100km.toString());
      formData.append('extraKmRate', values.extraKmRate.toString());
      formData.append('extraHourRate', values.extraHourRate.toString());
      
      // Package names for compatibility with all endpoints
      formData.append('package4hr40km', values.package4hr40km.toString());
      formData.append('package8hr80km', values.package8hr80km.toString());
      formData.append('package10hr100km', values.package10hr100km.toString());
      formData.append('extraKmRate', values.extraKmRate.toString());
      formData.append('extraHourRate', values.extraHourRate.toString());
      
      // Try multiple methods to update fares, starting with the dedicated endpoint
      let success = false;
      let updateSuccess = false;
      let errorMessage = '';
      
      // Method 1: Try direct-local-fares.php endpoint first
      try {
        const directLocalEndpoint = `${apiBaseUrl}/api/direct-local-fares.php`;
        console.log(`Trying direct local fares endpoint: ${directLocalEndpoint}`);
        
        const directResponse = await axios.post(directLocalEndpoint, formData, {
          headers: {
            ...fareService.getBypassHeaders(),
            'Content-Type': 'multipart/form-data',
          },
          timeout: 10000 // 10 second timeout
        });
        
        console.log('Direct local update response:', directResponse.data);
        if (directResponse.data && directResponse.data.success) {
          success = true;
          updateSuccess = true;
          console.log('Successfully updated fares via direct local fares endpoint');
        } else {
          errorMessage = directResponse.data?.error || 'Update response was not successful';
          console.error('Method 1 failed:', errorMessage);
        }
      } catch (directError) {
        console.error('Error using direct local fares endpoint:', directError);
        errorMessage = directError instanceof Error ? directError.message : 'Network error';
      }
      
      // Method 2: Try the direct-fare-update.php universal endpoint
      if (!success) {
        try {
          const universalEndpoint = `${apiBaseUrl}/api/admin/direct-fare-update.php?tripType=local&_t=${Date.now()}`;
          console.log(`Trying universal fare update endpoint: ${universalEndpoint}`);
          
          const universalResponse = await axios.post(universalEndpoint, formData, {
            headers: {
              ...fareService.getBypassHeaders(),
              'Content-Type': 'multipart/form-data',
            },
            timeout: 10000
          });
          
          console.log('Universal endpoint response:', universalResponse.data);
          if (universalResponse.data && universalResponse.data.status === 'success') {
            success = true;
            updateSuccess = true;
            console.log('Successfully updated fares via universal endpoint');
          } else {
            if (!errorMessage) {
              errorMessage = universalResponse.data?.message || 'Update failed';
              console.error('Method 2 failed:', errorMessage);
            }
          }
        } catch (universalError) {
          console.error('Error using universal endpoint:', universalError);
          if (!errorMessage) {
            errorMessage = universalError instanceof Error ? universalError.message : 'Network error';
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
      
      // After updating, if successful, force sync between tables
      if (success) {
        try {
          console.log("Syncing local_package_fares with vehicle_pricing");
          const syncResponse = await axios.get(`${apiBaseUrl}/api/admin/sync-local-fares.php`, {
            params: { 
              _t: Date.now() // Cache busting
            },
            headers: fareService.getBypassHeaders()
          });
          console.log('Sync response:', syncResponse.data);
        } catch (syncError) {
          console.error('Error syncing tables after update:', syncError);
          // Continue anyway - this is just an additional step
        }
      }
      
      // Update local storage cache
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
      
      // Trigger UI refresh events
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
      
      // First try the direct endpoint
      try {
        await axios.get(`${apiBaseUrl}/api/local-package-fares.php`, {
          params: { 
            check_sync: 'true',
            vehicle_id: vehicleId,
            _t: Date.now()
          },
          headers: fareService.getBypassHeaders(),
          timeout: 8000 // 8 second timeout
        });
      } catch (directError) {
        console.error('Error fetching from direct endpoint:', directError);
        // Continue anyway - we'll try another approach
      }
      
      // Try to get local fares via the service
      try {
        const fareData = await fareService.getLocalFaresForVehicle(vehicleId);
        
        if (fareData) {
          console.log("Loaded local package fares for vehicle:", fareData);
          form.setValue("package4hr40km", fareData.package4hr40km || 0);
          form.setValue("package8hr80km", fareData.package8hr80km || 0);
          form.setValue("package10hr100km", fareData.package10hr100km || 0);
          form.setValue("extraKmRate", fareData.extraKmRate || 0);
          form.setValue("extraHourRate", fareData.extraHourRate || 0);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error(`Failed to load fares for ${vehicleId}:`, error);
      }
      
      // Try loading from localStorage as a fallback
      const storedMatrix = localStorage.getItem('localPackagePriceMatrix');
      if (storedMatrix) {
        try {
          const matrix = JSON.parse(storedMatrix);
          const normalizedVehicleId = vehicleId.toLowerCase();
          
          if (matrix && matrix['4hrs-40km'] && matrix['4hrs-40km'][normalizedVehicleId]) {
            console.log("Using cached local package fares from localStorage");
            form.setValue("package4hr40km", matrix['4hrs-40km'][normalizedVehicleId] || 0);
            form.setValue("package8hr80km", matrix['8hrs-80km'][normalizedVehicleId] || 0);
            form.setValue("package10hr100km", matrix['10hrs-100km'][normalizedVehicleId] || 0);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error parsing localPackagePriceMatrix:", error);
        }
      }
      
      // If all else fails, use default values
      console.log('No existing fares found for vehicle, using defaults');
      setDefaultPricesForVehicle(vehicleId);
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading fare data:", err);
      setIsLoading(false);
    }
  };
  
  const setDefaultPricesForVehicle = (vehicleId: string) => {
    if (vehicleId === 'sedan') {
      form.setValue("package4hr40km", 1500);
      form.setValue("package8hr80km", 2500);
      form.setValue("package10hr100km", 3200);
      form.setValue("extraKmRate", 15);
      form.setValue("extraHourRate", 150);
    } else if (vehicleId === 'ertiga' || vehicleId === 'suv') {
      form.setValue("package4hr40km", 1700);
      form.setValue("package8hr80km", 2700);
      form.setValue("package10hr100km", 3500);
      form.setValue("extraKmRate", 18);
      form.setValue("extraHourRate", 200);
    } else if (vehicleId === 'innova' || vehicleId === 'innova_crysta') {
      form.setValue("package4hr40km", 2000);
      form.setValue("package8hr80km", 3000);
      form.setValue("package10hr100km", 3800);
      form.setValue("extraKmRate", 20);
      form.setValue("extraHourRate", 250);
    } else if (vehicleId === 'luxury') {
      form.setValue("package4hr40km", 3500);
      form.setValue("package8hr80km", 5000);
      form.setValue("package10hr100km", 6500);
      form.setValue("extraKmRate", 25);
      form.setValue("extraHourRate", 300);
    } else if (vehicleId === 'tempo' || vehicleId === 'tempo_traveller') {
      form.setValue("package4hr40km", 2500);
      form.setValue("package8hr80km", 4000);
      form.setValue("package10hr100km", 5000);
      form.setValue("extraKmRate", 22);
      form.setValue("extraHourRate", 250);
    } else {
      form.setValue("package4hr40km", 1500);
      form.setValue("package8hr80km", 2500);
      form.setValue("package10hr100km", 3200);
      form.setValue("extraKmRate", 15);
      form.setValue("extraHourRate", 150);
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
          
          <div className="flex space-x-2 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeDatabase} 
              disabled={isInitializingDB}
            >
              {isInitializingDB ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Initialize DB Tables
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                try {
                  const syncEndpoint = `${apiBaseUrl}/api/admin/sync-local-fares.php?_t=${Date.now()}`;
                  toast.info("Syncing local package fares tables...");
                  await axios.get(syncEndpoint, { headers: fareService.getBypassHeaders() });
                  toast.success("Tables synchronized successfully");
                } catch (err) {
                  console.error("Error syncing tables:", err);
                  toast.error("Failed to sync tables");
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Tables
            </Button>
          </div>
          
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
