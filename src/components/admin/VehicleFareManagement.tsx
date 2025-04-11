import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fareAPI } from '@/services/api';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormMessage, FormControl, Form } from "@/components/ui/form";
import { RefreshCw, Save, SyncIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getVehicleData } from '@/services/vehicleDataService';
import { CabType } from '@/types/cab';
import { vehicleIdMapping, getDynamicVehicleMapping, getAuthorizationHeader } from '@/config/api';

// Create dynamic form schema based on available vehicles
const createFormSchema = (vehicles: CabType[]) => {
  const schema: Record<string, any> = {
    vehicleId: z.string().min(1, "Vehicle is required"),
  };
  
  // Add vehicle price fields dynamically
  vehicles.forEach(vehicle => {
    schema[vehicle.id] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(schema);
};

// Array of standard vehicle types to ensure consistent ordering
const standardVehicleTypes = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'tempo', 
  'tempo_traveller', 'luxury', 'mpv', 'toyota', 'dzire_cng', 'etios'
];

// Map of human-readable labels for vehicle types
const vehicleLabels: Record<string, string> = {
  sedan: 'Sedan',
  ertiga: 'Ertiga',
  innova: 'Innova',
  innova_crysta: 'Innova Crysta',
  tempo: 'Tempo',
  tempo_traveller: 'Tempo Traveller',
  luxury: 'Luxury',
  mpv: 'MPV',
  toyota: 'Toyota',
  dzire_cng: 'Dzire CNG',
  etios: 'Etios'
};

// Basic structure with proper implementation
export function VehicleFareManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [tourFares, setTourFares] = useState<any[]>([]);
  const [dynamicVehicleMap, setDynamicVehicleMap] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uniqueVehicleTypes, setUniqueVehicleTypes] = useState<string[]>([]);
  
  // Dynamic form setup
  const formSchema = createFormSchema(vehicles);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: "",
    },
  });
  
  useEffect(() => {
    // Check for authentication token at component mount
    const checkAuthToken = async () => {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('user');
      
      if (!token || token === 'null' || token === 'undefined') {
        console.warn('No auth token found in localStorage');
        // Try to recover token from user object
        if (user) {
          try {
            const userData = JSON.parse(user);
            if (userData && userData.token) {
              console.log('Found token in user object, restoring to localStorage');
              localStorage.setItem('authToken', userData.token);
              localStorage.setItem('isLoggedIn', 'true');
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Get dynamic vehicle mapping
      try {
        const mapping = await getDynamicVehicleMapping();
        setDynamicVehicleMap(mapping);
        console.log('Vehicle ID mapping updated:', mapping);
      } catch (e) {
        console.error('Error getting dynamic vehicle mapping:', e);
      }
    };
    
    checkAuthToken();
    
    // Fetch vehicles and tour fares when component mounts
    const fetchData = async () => {
      try {
        setError(null);
        
        // First sync tour_fares with the vehicles table
        await syncVehiclesWithFares();
        
        // Then load vehicles
        await loadVehicles();
        
        // Then fetch tour fares to populate vehicle pricing
        await fetchTourFares();
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load vehicle and fare data");
        toast.error("Failed to load data");
      }
    };
    
    fetchData();
  }, []);
  
  const loadVehicles = async () => {
    try {
      // Make sure to include inactive vehicles too for more comprehensive mapping
      const vehicleData = await getVehicleData(true, true);
      console.log("Fetched vehicle data:", vehicleData);
      
      // Deduplicate vehicles by type to avoid repeated entries
      const uniqueVehicles: Record<string, CabType> = {};
      
      vehicleData.forEach(vehicle => {
        const vehicleType = getNormalizedVehicleType(vehicle.id);
        
        // Only add if this type doesn't exist yet
        if (!uniqueVehicles[vehicleType]) {
          uniqueVehicles[vehicleType] = { ...vehicle };
        }
      });
      
      // Get the deduplicated list of vehicles
      const deduplicatedVehicles = Object.values(uniqueVehicles);
      
      // Sort vehicles to ensure standard ones come first in a consistent order
      const sortedVehicles = deduplicatedVehicles.sort((a, b) => {
        const typeA = getNormalizedVehicleType(a.id);
        const typeB = getNormalizedVehicleType(b.id);
        
        // Check if they're standard types
        const indexA = standardVehicleTypes.indexOf(typeA);
        const indexB = standardVehicleTypes.indexOf(typeB);
        
        // If both are standard types, sort by the predefined order
        if (indexA >= 0 && indexB >= 0) {
          return indexA - indexB;
        }
        
        // If only one is a standard type, it should come first
        if (indexA >= 0) return -1;
        if (indexB >= 0) return 1;
        
        // Otherwise, sort alphabetically
        return a.name.localeCompare(b.name);
      });
      
      setVehicles(sortedVehicles);
      console.log("Sorted and deduplicated vehicles:", sortedVehicles);
      
      // Extract unique vehicle types for form fields
      const types = sortedVehicles.map(v => getNormalizedVehicleType(v.id));
      setUniqueVehicleTypes(types);
      
      // Initialize form default values for each vehicle
      const defaultValues: Record<string, any> = {
        vehicleId: form.getValues().vehicleId || "",
      };
      
      sortedVehicles.forEach(vehicle => {
        defaultValues[vehicle.id] = form.getValues()[vehicle.id] || 0;
      });
      
      // Update form with new default values
      form.reset(defaultValues);
      
      return sortedVehicles;
    } catch (error) {
      console.error("Error loading vehicles:", error);
      setError("Failed to load vehicle data");
      toast.error("Could not load vehicles");
      return [];
    }
  };
  
  // Helper function to get normalized vehicle type
  const getNormalizedVehicleType = (vehicleId: string): string => {
    const id = vehicleId.toLowerCase();
    
    // Standard vehicle type mappings
    if (id.includes('sedan')) return 'sedan';
    if (id.includes('ertiga')) return 'ertiga'; 
    if (id.includes('innova_crysta')) return 'innova_crysta';
    if (id.includes('innova')) return 'innova';
    if (id.includes('tempo_traveller')) return 'tempo_traveller';
    if (id.includes('tempo')) return 'tempo';
    if (id.includes('luxury')) return 'luxury';
    if (id.includes('mpv')) return 'mpv';
    if (id.includes('toyota')) return 'toyota';
    if (id.includes('dzire_cng') || (id.includes('dzire') && id.includes('cng'))) return 'dzire_cng';
    if (id.includes('etios')) return 'etios';
    
    // Return original ID if no specific type matches
    return id;
  };
  
  const syncVehiclesWithFares = async () => {
    try {
      setIsSyncing(true);
      
      // Call the DB setup endpoint to ensure columns exist
      const response = await fetch('/api/admin/db_setup_tour_fares.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthorizationHeader()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tour fares table synchronized with vehicles:', data);
        
        if (data.data?.addedColumns?.length > 0) {
          toast.success(`Added ${data.data.addedColumns.length} new vehicle columns to fare table`);
        }
        
        return true;
      } else {
        console.error('Failed to sync vehicles with fares table:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('Error syncing vehicles with fares:', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleVehicleSelect = (vehicleId: string) => {
    form.setValue("vehicleId", vehicleId);
    
    // If we have pricing data for this vehicle, populate the form
    const selectedVehicleFare = tourFares.find(fare => fare.tourId === vehicleId);
    if (selectedVehicleFare) {
      // Populate form with existing fare data
      vehicles.forEach(vehicle => {
        const vehicleType = getNormalizedVehicleType(vehicle.id);
        const fareValue = selectedVehicleFare[vehicleType] || 0;
        form.setValue(vehicle.id, fareValue);
      });
    } else {
      // Reset prices to zero
      vehicles.forEach(vehicle => {
        form.setValue(vehicle.id, 0);
      });
    }
  };
  
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check for token before submitting
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        // Try to get token from user object
        const userStr = localStorage.getItem('user');
        let foundToken = false;
        
        if (userStr) {
          try {
            const userData = JSON.parse(user);
            if (userData && userData.token) {
              localStorage.setItem('authToken', userData.token);
              foundToken = true;
              console.log('Retrieved token from user object for API call');
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
        
        if (!foundToken) {
          throw new Error('Authentication token is missing. Please log in again.');
        }
      }
      
      // Create request data from form values
      const fareData: Record<string, any> = {
        tourId: values.vehicleId, // Use vehicleId as the tour identifier
        tourName: vehicles.find(v => v.id === values.vehicleId)?.name || values.vehicleId,
      };
      
      // Add vehicle prices using normalized types (to prevent duplicates)
      vehicles.forEach(vehicle => {
        const normalizedType = getNormalizedVehicleType(vehicle.id);
        fareData[normalizedType] = values[vehicle.id] || 0;
      });
      
      console.log("Submitting vehicle fare data:", fareData);
      
      // Use the fareAPI.updateTourFares method for updating vehicle pricing
      const response = await fareAPI.updateTourFares(fareData);
      console.log("Vehicle fare update response:", response);
      
      toast.success("Vehicle pricing updated successfully");
      
      // Refresh the tour fares
      await fetchTourFares();
    } catch (error: any) {
      console.error("Error updating vehicle pricing:", error);
      // Enhanced error handling to expose more details about the error
      const errorMessage = error.response?.data?.message || 
                          error.response?.statusText || 
                          error.message || 
                          "Failed to update vehicle pricing";
      
      // Log detailed error information for debugging
      console.error("Status:", error.response?.status);
      console.error("Data:", error.response?.data);
      console.error("Headers:", error.response?.headers);
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Special handling for auth token issues
      if (errorMessage.includes('authentication token') || 
          errorMessage.includes('log in again') ||
          error.response?.status === 403) {
        // Try to refresh token from user object
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(userStr);
            if (userData && userData.token) {
              localStorage.setItem('authToken', userData.token);
              toast.info("Authentication token refreshed. Please try again.");
            }
          } catch (e) {
            console.error('Error refreshing token:', e);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchTourFares = async () => {
    try {
      setIsRefreshing(true);
      
      // Check for token before API call
      const token = localStorage.getItem('authToken');
      if (!token || token === 'null' || token === 'undefined') {
        // Try to get token from user object
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const userData = JSON.parse(user);
            if (userData && userData.token) {
              localStorage.setItem('authToken', userData.token);
              console.log('Retrieved token from user object for API call');
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      // Fetch tour fares data using the API
      const data = await fareAPI.getTourFares();
      console.log("Fetched tour fares:", data);
      
      if (Array.isArray(data) && data.length > 0) {
        setTourFares(data);
      } else {
        console.warn("Empty or invalid tour fares data:", data);
        setError("No tour fares data available.");
      }
      
      return data;
    } catch (error) {
      console.error("Error fetching tour fares:", error);
      setError("Failed to load tour fares data");
      toast.error("Failed to load fare data");
      return [];
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Function to handle forcing a sync with the vehicles table
  const handleSyncVehicles = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      const success = await syncVehiclesWithFares();
      
      if (success) {
        toast.success("Successfully synchronized vehicles with tour fares table");
        // Reload everything
        await loadVehicles();
        await fetchTourFares();
      } else {
        toast.error("Failed to synchronize vehicles");
      }
    } catch (error) {
      console.error("Error syncing vehicles:", error);
      setError("Failed to sync vehicles with tour fares table");
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Vehicle Fare Management</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncVehicles} 
              disabled={isSyncing}
            >
              <SyncIcon className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Vehicles
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchTourFares} 
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
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
              name="vehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Tour</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleVehicleSelect(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tour" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tourFares.map((tour) => (
                        <SelectItem key={tour.tourId} value={tour.tourId}>
                          {tour.tourName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 md:grid-cols-3">
              {vehicles.map(vehicle => (
                <FormField
                  key={vehicle.id}
                  control={form.control}
                  name={vehicle.id as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {vehicleLabels[getNormalizedVehicleType(vehicle.id)] || vehicle.name} Price
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Pricing
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
