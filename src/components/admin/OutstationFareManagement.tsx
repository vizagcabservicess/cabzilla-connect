
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import axios from 'axios';
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Database, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loadCabTypes } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { fareService } from '@/services/fareService';

const formSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle is required" }),
  basePrice: z.coerce.number().min(0, { message: "Base price must be a positive number" }),
  pricePerKm: z.coerce.number().min(0, { message: "Per KM price must be a positive number" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge must be a positive number" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance must be a positive number" }),
  roundTripBasePrice: z.coerce.number().min(0, { message: "Round trip base price must be a positive number" }),
  roundTripPricePerKm: z.coerce.number().min(0, { message: "Round trip per KM price must be a positive number" }),
});

// Define the error props interface
interface FareUpdateErrorProps {
  title: string;
  error: any;
  onRetry: () => Promise<void>;
}

// Error component that displays error details and retry button
const FareUpdateError = ({ title, error, onRetry }: FareUpdateErrorProps) => {
  const errorMessage = error?.message || 'An unknown error occurred';
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm mt-1">{errorMessage}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          Try Again
        </Button>
      </AlertDescription>
    </Alert>
  );
};

// Component for managing outstation fares
const OutstationFareManagement = () => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [dbInitLoading, setDbInitLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<any>(null);
  const [dbInitError, setDbInitError] = useState<any>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
      roundTripBasePrice: 0,
      roundTripPricePerKm: 0,
    },
  });

  // Load vehicle types on mount
  useEffect(() => {
    const fetchCabTypes = async () => {
      try {
        const types = await loadCabTypes();
        if (types && types.length > 0) {
          setCabTypes(types);
          // Set the first vehicle as default if none is selected
          if (!selectedVehicleType) {
            setSelectedVehicleType(types[0].id);
            form.setValue("vehicleId", types[0].id);
            loadVehicleFares(types[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load cab types:", error);
        toast({
          title: "Error Loading Vehicles",
          description: "Failed to load vehicle types. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchCabTypes();
  }, []);

  // Load fare data for a specific vehicle
  const loadVehicleFares = async (vehicleId: string) => {
    try {
      const fares = await fareService.getOutstationFaresForVehicle(vehicleId);
      if (fares) {
        form.setValue("vehicleId", vehicleId);
        form.setValue("basePrice", fares.basePrice || 0);
        form.setValue("pricePerKm", fares.pricePerKm || 0);
        form.setValue("nightHaltCharge", fares.nightHaltCharge || 0);
        form.setValue("driverAllowance", fares.driverAllowance || 0);
        form.setValue("roundTripBasePrice", fares.roundTripBasePrice || 0);
        form.setValue("roundTripPricePerKm", fares.roundTripPricePerKm || 0);
      }
    } catch (error) {
      console.error(`Failed to load fares for vehicle ${vehicleId}:`, error);
      toast({
        title: "Error Loading Fares",
        description: `Failed to load fares for ${vehicleId}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Handle vehicle selection
  const handleVehicleChange = (vehicle: string) => {
    setSelectedVehicleType(vehicle);
    loadVehicleFares(vehicle);
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Update outstation fares
      await fareService.directFareUpdate('outstation', values.vehicleId, {
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        nightHalt: values.nightHaltCharge,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance,
        roundTripBasePrice: values.roundTripBasePrice,
        roundTripPricePerKm: values.roundTripPricePerKm
      });
      
      toast({
        title: "Fares Updated",
        description: `Successfully updated outstation fares for ${values.vehicleId}`,
      });
      
      // Clear cache to ensure the latest data is fetched
      fareService.clearCache();
      
      // Reload the fares to see the updates
      loadVehicleFares(values.vehicleId);
      
    } catch (error) {
      console.error("Failed to update outstation fares:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update outstation fares. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Force sync between outstation_fares and vehicle_pricing tables
  const handleForceSync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const params = new URLSearchParams();
      params.append('direction', 'to_vehicle_pricing');
      params.append('_t', Date.now().toString());
      
      const response = await axios.get(`${baseUrl}/api/admin/sync-outstation-fares.php?${params.toString()}`, 
        fareService.getForcedRequestConfig());
      
      if (response.data.status === 'success') {
        toast({
          title: "Sync Completed",
          description: `Successfully synchronized outstation fares: ${response.data.updated} records updated, ${response.data.inserted} records inserted.`,
        });
        
        // Clear cache to ensure the latest data is fetched
        fareService.clearCache();
        // Reload current vehicle data
        if (selectedVehicleType) {
          loadVehicleFares(selectedVehicleType);
        }
      } else {
        throw new Error(response.data.message || "Sync failed with unknown error");
      }
    } catch (error) {
      console.error("Failed to sync outstation fares:", error);
      setSyncError(error);
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize outstation fares. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Initialize database tables
  const handleInitDatabase = async () => {
    setDbInitLoading(true);
    setDbInitError(null);
    
    try {
      const result = await fareService.initializeDatabase(false);
      
      if (result && result.status === 'success') {
        toast({
          title: "Database Initialized",
          description: `Successfully initialized database: ${result.tables_created.length} tables created or updated.`,
        });
        
        // Clear cache to ensure the latest data is fetched
        fareService.clearCache();
        
        // If the current vehicle is selected, reload its fares
        if (selectedVehicleType) {
          loadVehicleFares(selectedVehicleType);
        }
      } else {
        throw new Error(result?.message || "Database initialization failed with unknown error");
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      setDbInitError(error);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize database tables. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDbInitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Outstation Fare Management</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleForceSync}
            disabled={syncLoading}
          >
            {syncLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Force Sync
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleInitDatabase}
            disabled={dbInitLoading}
          >
            {dbInitLoading ? (
              <>
                <Database className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Init Database
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Display sync error if any */}
      {syncError && (
        <FareUpdateError 
          title="Sync Failed" 
          error={syncError}
          onRetry={handleForceSync} 
        />
      )}
      
      {/* Display db init error if any */}
      {dbInitError && (
        <FareUpdateError 
          title="Database Initialization Failed" 
          error={dbInitError}
          onRetry={handleInitDatabase} 
        />
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Edit Outstation Fares</h2>
        
        <div className="mb-6">
          <FormLabel className="block text-sm font-medium mb-1">Cab Type</FormLabel>
          <Select value={selectedVehicleType} onValueChange={handleVehicleChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {cabTypes.map((cab) => (
                <SelectItem key={cab.id} value={cab.id}>
                  {cab.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...form.register("vehicleId")} />
            
            <Tabs defaultValue="oneway" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="oneway">One Way</TabsTrigger>
                <TabsTrigger value="roundtrip">Round Trip</TabsTrigger>
                <TabsTrigger value="charges">Additional Charges</TabsTrigger>
              </TabsList>
              
              <TabsContent value="oneway" className="space-y-4">
                <FormField
                  control={form.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
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
                      <FormLabel>Price Per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="roundtrip" className="space-y-4">
                <FormField
                  control={form.control}
                  name="roundTripBasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Trip Base Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="roundTripPricePerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Trip Price Per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="charges" className="space-y-4">
                <FormField
                  control={form.control}
                  name="nightHaltCharge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Night Halt Charge (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="driverAllowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Allowance (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default OutstationFareManagement;
