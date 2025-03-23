
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Save, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getAllLocalPackagePrices, updateLocalPackagePrice, hourlyPackages } from '@/lib/packageData';
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { updateTripFares } from '@/services/vehicleDataService';

const formSchema = z.object({
  packageId: z.string().min(1, { message: "Package is required" }),
  cabType: z.string().min(1, { message: "Cab type is required" }),
  price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

export function LocalFareManagement() {
  const [localFares, setLocalFares] = useState<Record<string, Record<string, number>>>({});
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packageId: "",
      cabType: "",
      price: 0,
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
      localStorage.setItem('forceCacheRefresh', 'true');
      
      const prices = getAllLocalPackagePrices();
      console.log("Loaded local fare prices:", prices);
      setLocalFares(prices);
      
      const types = await loadCabTypes();
      console.log("Loaded cab types:", types);
      setCabTypes(types);
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
      localStorage.removeItem('forceCacheRefresh');
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      console.log("Updating local fare:", values);
      
      // First, update the price locally using the function from packageData.ts
      updateLocalPackagePrice(values.packageId, values.cabType, values.price);
      
      // Now, try to update on the server using FormData which has better compatibility
      const cabTypeId = values.cabType.toLowerCase();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // Create a FormData object for better compatibility with server
      const formData = new FormData();
      formData.append('vehicleId', cabTypeId);
      formData.append('vehicleType', cabTypeId);
      formData.append('vehicle_id', cabTypeId);
      formData.append('tripType', 'local');
      formData.append('trip_type', 'local');
      
      // Add the specific package price, using multiple field names for compatibility
      if (values.packageId === '4hrs-40km') {
        formData.append('package4hr40km', values.price.toString());
        formData.append('price4hrs40km', values.price.toString());
        formData.append('hr4km40Price', values.price.toString());
        formData.append('local_package_4hr', values.price.toString());
      } 
      else if (values.packageId === '8hrs-80km') {
        formData.append('package8hr80km', values.price.toString());
        formData.append('price8hrs80km', values.price.toString());
        formData.append('hr8km80Price', values.price.toString());
        formData.append('local_package_8hr', values.price.toString());
      } 
      else if (values.packageId === '10hrs-100km') {
        formData.append('package10hr100km', values.price.toString());
        formData.append('price10hrs100km', values.price.toString());
        formData.append('hr10km100Price', values.price.toString());
        formData.append('local_package_10hr', values.price.toString());
      }
      
      // Add extra rates with multiple field names for compatibility
      formData.append('extraKmRate', '14');
      formData.append('extra_km_charge', '14');
      formData.append('extraKmCharge', '14');
      formData.append('priceExtraKm', '14');
      
      formData.append('extraHourRate', '250');
      formData.append('extra_hour_charge', '250');
      formData.append('extraHourCharge', '250');
      formData.append('priceExtraHour', '250');
      
      console.log("Sending update data to server via FormData");
      
      // Try with the local-fares-update.php endpoint first
      try {
        const response = await fetch(`${baseUrl}/api/admin/local-fares-update.php`, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API response not OK:", response.status, errorText);
          throw new Error(`Local fares API call failed with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Local fares API response:", result);
      } catch (error) {
        console.error("Error with local fares API call:", error);
        
        // Try the direct-fare-update.php endpoint as fallback
        try {
          const fallbackResponse = await fetch(`${baseUrl}/api/admin/direct-fare-update.php`, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            cache: 'no-store'
          });
          
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback API call failed with status: ${fallbackResponse.status}`);
          }
          
          const fallbackResult = await fallbackResponse.json();
          console.log("Fallback API response:", fallbackResult);
        } catch (fallbackError) {
          console.error("Error with fallback API call:", fallbackError);
          throw fallbackError;
        }
      }
      
      // Force cache refresh to ensure new prices are used
      localStorage.setItem('forceCacheRefresh', 'true');
      localStorage.removeItem('fareCache');
      localStorage.removeItem('calculatedFares');
      fareService.clearCache();
      
      // Dispatch a custom event for other components to update
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          cabType: cabTypeId,
          packageId: values.packageId,
          price: values.price
        }
      }));
      
      // Refetch the updated prices
      const updatedPrices = getAllLocalPackagePrices();
      setLocalFares(updatedPrices);
      setLastUpdated(new Date());
      
      toast.success("Local fare updated successfully");
      
      // Force another cache clear after a short delay to ensure all components update
      setTimeout(() => {
        fareService.clearCache();
        localStorage.setItem('forceCacheRefresh', 'true');
        window.dispatchEvent(new CustomEvent('fare-cache-cleared'));
      }, 500);
      
    } catch (error) {
      console.error("Error updating local fare:", error);
      toast.error("Failed to update local fare");
    } finally {
      setIsLoading(false);
      localStorage.removeItem('forceCacheRefresh');
    }
  };
  
  const handlePackageSelect = (packageId: string) => {
    form.setValue("packageId", packageId);
    
    const cabType = form.getValues().cabType;
    if (cabType && localFares[packageId] && localFares[packageId][cabType.toLowerCase()]) {
      form.setValue("price", localFares[packageId][cabType.toLowerCase()]);
    }
  };
  
  const handleCabTypeSelect = (cabType: string) => {
    form.setValue("cabType", cabType);
    
    const packageId = form.getValues().packageId;
    if (packageId && localFares[packageId] && localFares[packageId][cabType.toLowerCase()]) {
      form.setValue("price", localFares[packageId][cabType.toLowerCase()]);
    }
  };
  
  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update" className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> Update Local Fares
        </TabsTrigger>
        <TabsTrigger value="all" className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> View All Local Fares
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Update Local Package Fares
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
                <FormField
                  control={form.control}
                  name="packageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Package</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          handlePackageSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a package" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hourlyPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cabType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Cab Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          handleCabTypeSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a cab type" />
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
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Price
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> All Local Package Fares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {isLoading ? (
              <div className="flex justify-center p-10">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : Object.keys(localFares).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Package</th>
                      <th className="text-left py-2 px-2">Cab Type</th>
                      <th className="text-right py-2 px-2">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(localFares).flatMap(([packageId, cabPrices]) => 
                      Object.entries(cabPrices).map(([cabType, price], index) => (
                        <tr key={`${packageId}-${cabType}`} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">
                            {hourlyPackages.find(p => p.id === packageId)?.name || packageId}
                          </td>
                          <td className="py-2 px-2">
                            {cabTypes.find(c => c.id.toLowerCase() === cabType.toLowerCase())?.name || cabType}
                          </td>
                          <td className="text-right py-2 px-2">₹{price.toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No local fares found.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
