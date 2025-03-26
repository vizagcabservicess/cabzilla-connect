
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
import { AlertCircle, RefreshCw, Save, Plane } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';
import { updateTripFares } from '@/services/vehicleDataService';
import { clearFareCache } from '@/lib/fareCalculationService';

const formSchema = z.object({
  cabType: z.string().min(1, { message: "Cab type is required" }),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  dropPrice: z.coerce.number().min(0, { message: "Drop price cannot be negative" }),
  pickupPrice: z.coerce.number().min(0, { message: "Pickup price cannot be negative" }),
  tier1Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier2Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier3Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tier4Price: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  extraKmCharge: z.coerce.number().min(0, { message: "Extra km charge cannot be negative" }),
});

interface AirportFares {
  basePrice: number;
  pricePerKm: number;
  dropPrice: number;
  pickupPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

interface CabAirportFares {
  [cabType: string]: AirportFares;
}

export function AirportFareManagement() {
  const [airportFares, setAirportFares] = useState<CabAirportFares>({});
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabType: "",
      basePrice: 0,
      pricePerKm: 0,
      dropPrice: 0,
      pickupPrice: 0,
      tier1Price: 0,
      tier2Price: 0,
      tier3Price: 0,
      tier4Price: 0,
      extraKmCharge: 0,
    },
  });
  
  useEffect(() => {
    // Force clear fare cache on component mount
    clearFareCache(true);
    
    // Set a flag to force refresh on first load
    localStorage.setItem('forceCacheRefresh', 'true');
    localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
    
    loadData();
    
    // Clear fare refresh flags after a short delay
    const timerId = setTimeout(() => {
      localStorage.removeItem('forceCacheRefresh');
    }, 5000);
    
    return () => {
      clearTimeout(timerId);
    };
  }, []);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Force clear caches to ensure we get fresh data
      fareService.clearCache();
      
      // Load cab types
      const types = await loadCabTypes();
      console.log("Loaded cab types:", types);
      setCabTypes(types);
      
      // Load airport fares for each cab type
      const fares: CabAirportFares = {};
      
      for (const cab of types) {
        try {
          if (cab.id) {
            const airportFare = await fareService.getAirportFaresForVehicle(cab.id);
            console.log(`Loaded airport fares for ${cab.name}:`, airportFare);
            fares[cab.id] = airportFare;
          }
        } catch (err) {
          console.error(`Error loading fares for ${cab.name}:`, err);
        }
      }
      
      setAirportFares(fares);
      
      // Set last update time
      setLastUpdateTime(Date.now());
      
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSelectCab = (cabType: string) => {
    if (!cabType || !airportFares[cabType]) {
      form.reset({
        cabType,
        basePrice: 0,
        pricePerKm: 0,
        dropPrice: 0,
        pickupPrice: 0,
        tier1Price: 0,
        tier2Price: 0,
        tier3Price: 0,
        tier4Price: 0,
        extraKmCharge: 0,
      });
      return;
    }
    
    const fares = airportFares[cabType];
    
    // Reset the form with the selected cab's fares
    form.reset({
      cabType,
      basePrice: fares.basePrice || 0,
      pricePerKm: fares.pricePerKm || 0,
      dropPrice: fares.dropPrice || 0,
      pickupPrice: fares.pickupPrice || 0,
      tier1Price: fares.tier1Price || 0,
      tier2Price: fares.tier2Price || 0,
      tier3Price: fares.tier3Price || 0,
      tier4Price: fares.tier4Price || 0,
      extraKmCharge: fares.extraKmCharge || 0,
    });
  };
  
  const handleRefresh = async () => {
    await loadData();
    toast.success("Fares refreshed successfully");
    
    // Force global cache refresh
    clearFareCache(true);
    localStorage.setItem('forceCacheRefresh', 'true');
    localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
    
    // Clear refresh flags after a short delay
    setTimeout(() => {
      localStorage.removeItem('forceCacheRefresh');
    }, 5000);
  };
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const { cabType, ...fareData } = data;
    
    // Show loading toast
    toast.loading("Updating airport fares...");
    
    try {
      setIsLoading(true);
      
      // Force cache clear before update
      clearFareCache(true);
      
      // Use direct fare update for maximum reliability
      const response = await fareService.directFareUpdate('airport', cabType, {
        basePrice: fareData.basePrice,
        pricePerKm: fareData.pricePerKm,
        dropPrice: fareData.dropPrice,
        pickupPrice: fareData.pickupPrice,
        tier1Price: fareData.tier1Price,
        tier2Price: fareData.tier2Price,
        tier3Price: fareData.tier3Price,
        tier4Price: fareData.tier4Price,
        extraKmCharge: fareData.extraKmCharge
      });
      
      console.log("Airport fare update response:", response);
      
      // Update the local state
      setAirportFares(prev => ({
        ...prev,
        [cabType]: {
          basePrice: fareData.basePrice,
          pricePerKm: fareData.pricePerKm,
          dropPrice: fareData.dropPrice,
          pickupPrice: fareData.pickupPrice,
          tier1Price: fareData.tier1Price,
          tier2Price: fareData.tier2Price,
          tier3Price: fareData.tier3Price,
          tier4Price: fareData.tier4Price,
          extraKmCharge: fareData.extraKmCharge
        }
      }));
      
      // Update last update time
      setLastUpdateTime(Date.now());
      
      // Show success toast
      toast.success("Airport fares updated successfully");
      
      // Force cache clear after update
      clearFareCache(true);
      fareService.clearCache();
      
      // Set flag to force refresh
      localStorage.setItem('forceCacheRefresh', 'true');
      localStorage.setItem('fareDataLastRefreshed', Date.now().toString());
      
      // Dispatch event for airport fares update
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: {
          vehicleId: cabType,
          timestamp: Date.now(),
          prices: fareData,
          force: true
        }
      }));
      
      // Force page cache to clear after a short delay
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 5000);
    } catch (err) {
      console.error("Error updating airport fares:", err);
      toast.error("Failed to update airport fares");
      setError("Failed to update airport fares. Please try again.");
    } finally {
      setIsLoading(false);
      toast.dismiss();
    }
  };
  
  return (
    <Card>
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-xl flex items-center gap-2">
          <Plane className="h-5 w-5 text-blue-600" />
          <span>Airport Transfer Pricing</span>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto h-8 w-8"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
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
              name="cabType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Vehicle</FormLabel>
                  <Select
                    disabled={isLoading}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleSelectCab(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cabTypes.map((cab) => (
                        <SelectItem key={cab.id} value={cab.id || ""}>
                          {cab.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
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
                    <FormLabel>Price per Km (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
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
                    <FormLabel>Drop Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={0} />
                    </FormControl>
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
                      <Input type="number" {...field} min={0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Distance Tier Pricing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tier1Price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier 1 (0-10 KM) Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
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
                      <FormLabel>Tier 2 (11-20 KM) Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
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
                      <FormLabel>Tier 3 (21-30 KM) Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
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
                      <FormLabel>Tier 4 (31+ KM) Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} min={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="extraKmCharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra KM Charge (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-update-time={lastUpdateTime}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Airport Fares
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
