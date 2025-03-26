import { useState, useEffect, useCallback, useMemo } from 'react';
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
  RotateCw,
  AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { fareAPI } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';
import axios from 'axios';

interface VehiclePricing {
  vehicleId: string;
  vehicleType: string;
  basePrice: number;
  pricePerKm: number;
  nightHaltCharge: number;
  driverAllowance: number;
}

const DEFAULT_VEHICLES: VehiclePricing[] = [
  {
    vehicleId: 'sedan',
    vehicleType: 'Sedan',
    basePrice: 1000,
    pricePerKm: 12,
    nightHaltCharge: 300,
    driverAllowance: 300
  },
  {
    vehicleId: 'ertiga',
    vehicleType: 'Ertiga',
    basePrice: 1200,
    pricePerKm: 14,
    nightHaltCharge: 350,
    driverAllowance: 350
  },
  {
    vehicleId: 'innova_crysta',
    vehicleType: 'Innova Crysta',
    basePrice: 1500,
    pricePerKm: 16,
    nightHaltCharge: 400,
    driverAllowance: 400
  }
];

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
  extraKmCharge: z.coerce.number().min(0, { message: "Price cannot be negative" }),
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
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>(DEFAULT_VEHICLES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast: uiToast } = useToast();
  const [apiEndpoint, setApiEndpoint] = useState('');
  
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    setApiEndpoint(`${baseUrl}/api/admin/vehicle-pricing.php`);
    console.log('API Endpoint:', `${baseUrl}/api/admin/vehicle-pricing.php`);
  }, []);
  
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
  
  const clearAllCaches = useCallback(() => {
    console.log("Clearing all vehicle pricing caches");
    
    localStorage.removeItem('cabFares');
    localStorage.removeItem('tourFares');
    localStorage.removeItem('lastFareUpdate');
    localStorage.removeItem('vehiclePricing');
    localStorage.removeItem('cabTypes');
    
    sessionStorage.removeItem('cabFares');
    sessionStorage.removeItem('tourFares');
    sessionStorage.removeItem('calculatedFares');
    sessionStorage.removeItem('vehiclePricing');
    sessionStorage.removeItem('cabTypes');
    
    const cachePrefixes = ['fare-', 'price-', 'cab-', 'vehicle-'];
    
    Object.keys(sessionStorage).forEach(key => {
      for (const prefix of cachePrefixes) {
        if (key.startsWith(prefix)) {
          console.log(`Removing session cache item: ${key}`);
          sessionStorage.removeItem(key);
          break;
        }
      }
    });
    
    Object.keys(localStorage).forEach(key => {
      for (const prefix of cachePrefixes) {
        if (key.startsWith(prefix)) {
          console.log(`Removing local cache item: ${key}`);
          localStorage.removeItem(key);
          break;
        }
      }
    });
    
    sessionStorage.setItem('lastCacheClear', Date.now().toString());
  }, []);
  
  const fetchVehiclePricing = useCallback(async () => {
    if (!apiEndpoint) {
      console.log("API endpoint not set yet, skipping fetch");
      return;
    }
    
    try {
      setIsRefreshing(true);
      setError(null);
      
      clearAllCaches();
      
      const timestamp = Date.now();
      console.log(`Refreshing vehicle pricing with timestamp: ${timestamp}`);
      console.log(`API endpoint: ${apiEndpoint}?_t=${timestamp}`);
      
      const response = await axios.get(`${apiEndpoint}?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.29',
          'X-Force-Refresh': 'true'
        },
        timeout: 8000
      });
      
      console.log('Vehicle pricing API response:', response.data);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log("✅ Fetched vehicle pricing:", response.data);
        
        const normalizedData = response.data.map((item: any) => ({
          vehicleId: item.vehicleId || item.id || `vehicle-${Math.random().toString(36).substring(2, 10)}`,
          vehicleType: item.vehicleType || item.name || 'Unknown Vehicle',
          basePrice: parseFloat(item.basePrice) || 0,
          pricePerKm: parseFloat(item.pricePerKm) || 0,
          nightHaltCharge: parseFloat(item.nightHaltCharge) || 0,
          driverAllowance: parseFloat(item.driverAllowance) || 0
        }));
        
        setVehiclePricing(normalizedData);
        
        sessionStorage.setItem('vehiclePricing', JSON.stringify({
          data: normalizedData,
          timestamp: Date.now()
        }));
        
        toast.success("Vehicle pricing refreshed");
        
        await reloadCabTypes();
      } else {
        console.warn("❌ Empty or invalid vehicle pricing data:", response.data);
        setError("No vehicle pricing data available. Using default vehicles.");
        setVehiclePricing(DEFAULT_VEHICLES);
        toast.warning("Using default vehicle pricing");
      }
    } catch (error) {
      console.error("Error refreshing vehicle pricing:", error);
      setError("Failed to refresh vehicle pricing. Using default vehicles.");
      setVehiclePricing(DEFAULT_VEHICLES);
      toast.error("Failed to refresh vehicle pricing");
    } finally {
      setIsRefreshing(false);
    }
  }, [apiEndpoint, clearAllCaches]);
  
  useEffect(() => {
    if (apiEndpoint) {
      fetchVehiclePricing();
    }
  }, [fetchVehiclePricing, apiEndpoint]);
  
  const onBasePricingSubmit = async (values: z.infer<typeof basePricingSchema>) => {
    if (!apiEndpoint) {
      toast.error("API endpoint not configured");
      return;
    }
    
    try {
      setIsLoading(true);
      clearAllCaches();
      
      console.log("Submitting base pricing update:", values);
      
      const selectedVehicle = vehiclePricing.find(v => v.vehicleType === values.vehicleType);
      const vehicleId = selectedVehicle?.vehicleId || values.vehicleType.toLowerCase().replace(/\s+/g, '_');
      
      const requestData = {
        vehicleId: vehicleId,
        tripType: 'base',
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance
      };
      
      console.log("API endpoint:", apiEndpoint);
      console.log("Request data:", requestData);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const response = await axios.post(apiEndpoint, requestData, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.29',
              'X-Force-Refresh': 'true'
            },
            timeout: 10000
          });
          
          console.log("Vehicle pricing update response:", response.data);
          
          if (response.data && response.data.status === 'success') {
            success = true;
            toast.success("Vehicle pricing updated successfully");
            
            setVehiclePricing(prev => prev.map(v => 
              v.vehicleType === values.vehicleType 
                ? { ...v, basePrice: values.basePrice, pricePerKm: values.pricePerKm, 
                    nightHaltCharge: values.nightHaltCharge, driverAllowance: values.driverAllowance }
                : v
            ));
            
            await reloadCabTypes();
          } else {
            throw new Error(response.data?.message || "Unknown error");
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      toast.error("Failed to update vehicle pricing. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onLocalFareSubmit = async (values: z.infer<typeof localFareSchema>) => {
    if (!apiEndpoint) {
      toast.error("API endpoint not configured");
      return;
    }
    
    try {
      setIsLoading(true);
      clearAllCaches();
      
      console.log("Submitting local fare update:", values);
      
      const selectedVehicle = vehiclePricing.find(v => v.vehicleType === values.vehicleType);
      const vehicleId = selectedVehicle?.vehicleId || values.vehicleType.toLowerCase().replace(/\s+/g, '_');
      
      const requestData = {
        vehicleId: vehicleId,
        tripType: 'local',
        price8hrs80km: values.package8hrs,
        price10hrs100km: values.package10hrs,
        priceExtraKm: values.extraKmCharge,
        priceExtraHour: values.extraHourCharge
      };
      
      console.log("API endpoint:", apiEndpoint);
      console.log("Request data:", requestData);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const response = await axios.post(apiEndpoint, requestData, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.29',
              'X-Force-Refresh': 'true'
            },
            timeout: 10000
          });
          
          console.log("Local fare update response:", response.data);
          
          if (response.data && response.data.status === 'success') {
            success = true;
            toast.success("Local fare settings updated successfully");
            
            await reloadCabTypes();
          } else {
            throw new Error(response.data?.message || "Unknown error");
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error updating local fares:", error);
      toast.error("Failed to update local fares. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onAirportFareSubmit = async (values: z.infer<typeof airportFareSchema>) => {
    if (!apiEndpoint) {
      toast.error("API endpoint not configured");
      return;
    }
    
    try {
      setIsLoading(true);
      clearAllCaches();
      
      console.log("Submitting airport fare update:", values);
      
      const selectedVehicle = vehiclePricing.find(v => v.vehicleType === values.vehicleType);
      const vehicleId = selectedVehicle?.vehicleId || values.vehicleType.toLowerCase().replace(/\s+/g, '_');
      
      const requestData = {
        vehicleId: vehicleId,
        tripType: 'airport',
        pickupFare: values.tier2,
        dropFare: values.tier3,
        extraZones: {
          tier1: values.tier1,
          tier4: values.tier4
        },
        extraKmCharge: values.extraKmCharge
      };
      
      console.log("API endpoint:", apiEndpoint);
      console.log("Request data:", requestData);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const response = await axios.post(apiEndpoint, requestData, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.29',
              'X-Force-Refresh': 'true'
            },
            timeout: 10000
          });
          
          console.log("Airport fare update response:", response.data);
          
          if (response.data && response.data.status === 'success') {
            success = true;
            toast.success("Airport fare settings updated successfully");
            
            await reloadCabTypes();
          } else {
            throw new Error(response.data?.message || "Unknown error");
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error updating airport fares:", error);
      toast.error("Failed to update airport fares. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onOutstationFareSubmit = async (values: z.infer<typeof outstationFormSchema>) => {
    if (!apiEndpoint) {
      toast.error("API endpoint not configured");
      return;
    }
    
    try {
      setIsLoading(true);
      clearAllCaches();
      
      console.log("Submitting outstation fare update:", values);
      
      const selectedVehicle = vehiclePricing.find(v => v.vehicleType === values.vehicleType);
      const vehicleId = selectedVehicle?.vehicleId || values.vehicleType.toLowerCase().replace(/\s+/g, '_');
      
      const oneWayRequest = {
        vehicleId: vehicleId,
        tripType: 'outstation',
        tripMode: 'one-way',
        baseFare: values.oneWayBasePrice,
        pricePerKm: values.oneWayPerKm,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance
      };
      
      console.log("API endpoint for one-way:", apiEndpoint);
      console.log("One-way request data:", oneWayRequest);
      
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          const response = await axios.post(apiEndpoint, oneWayRequest, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.29',
              'X-Force-Refresh': 'true'
            },
            timeout: 10000
          });
          
          console.log("One-way fare update response:", response.data);
          
          if (response.data && response.data.status === 'success') {
            success = true;
            toast.success("Outstation fare settings updated successfully");
            
            setVehiclePricing(prev => prev.map(v => 
              v.vehicleType === values.vehicleType 
                ? { ...v, basePrice: values.oneWayBasePrice, pricePerKm: values.oneWayPerKm, 
                    nightHaltCharge: values.nightHaltCharge, driverAllowance: values.driverAllowance }
                : v
            ));
            
            await reloadCabTypes();
          } else {
            throw new Error(response.data?.message || "Unknown error");
          }
        } catch (error) {
          console.error(`Attempt ${retries + 1} failed:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error("Error updating outstation fares:", error);
      toast.error("Failed to update outstation fares. Please try again.");
    } finally {
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
      
      if (vehicleType.toLowerCase().includes('sedan')) {
        airportForm.setValue("tier1", 840);
        airportForm.setValue("tier2", 1000);
        airportForm.setValue("tier3", 1200);
        airportForm.setValue("tier4", 1500);
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
      outstationForm.setValue("roundTripBasePrice", selectedVehicle.basePrice * 0.9);
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
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <PlaneTakeoff className="h-4 w-4 mr-1" /> Airport Transfer Rates
                  </h3>
                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={airportForm.control}
                      name="tier1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier 1 (0-10 KM)</FormLabel>
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
                          <FormLabel>Tier 2 (11-20 KM)</FormLabel>
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
                          <FormLabel>Tier 4 (31+ KM)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={airportForm.control}
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
                <Warehouse className="h-5 w-5" /> All Vehicle Pricing
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2 border">Vehicle Type</th>
                    <th className="p-2 border">Base Price</th>
                    <th className="p-2 border">Price/KM</th>
                    <th className="p-2 border">Night Halt</th>
                    <th className="p-2 border">Driver Allowance</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiclePricing.map((pricing) => (
                    <tr key={pricing.vehicleType} className="border-b hover:bg-gray-50">
                      <td className="p-2 border font-medium">{pricing.vehicleType}</td>
                      <td className="p-2 border">₹{pricing.basePrice}</td>
                      <td className="p-2 border">₹{pricing.pricePerKm}</td>
                      <td className="p-2 border">₹{pricing.nightHaltCharge || 0}</td>
                      <td className="p-2 border">₹{pricing.driverAllowance || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={clearAllCaches}
              >
                <RepeatIcon className="mr-2 h-4 w-4" />
                Clear All Fare Caches
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
