
import { useState, useEffect } from 'react';
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
  PlusCircle, 
  Trash2, 
  Edit, 
  Globe,
  Map,
  Car,
  Bookmark
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TourFare, FareUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';
import { getVehicleData } from '@/services/vehicleDataService';
import { CabType } from '@/types/cab';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// We'll create a dynamic form schema based on available vehicles
const createDynamicFormSchema = (vehicleIds: string[]) => {
  const baseSchema = {
    tourId: z.string().min(1, { message: "Tour is required" }),
  };
  
  // Add vehicle price fields dynamically
  vehicleIds.forEach(id => {
    baseSchema[id] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(baseSchema);
};

// Dynamic form schema for new tour creation
const createDynamicNewTourFormSchema = (vehicleIds: string[]) => {
  const baseSchema = {
    tourId: z.string().min(1, { message: "Tour ID is required" }),
    tourName: z.string().min(1, { message: "Tour name is required" }),
  };
  
  // Add vehicle price fields dynamically
  vehicleIds.forEach(id => {
    baseSchema[id] = z.coerce.number().min(0, { message: "Price cannot be negative" });
  });
  
  return z.object(baseSchema);
};

export function FareManagement() {
  const [tourFares, setTourFares] = useState<TourFare[]>([]);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addTourDialogOpen, setAddTourDialogOpen] = useState(false);
  const { toast: uiToast } = useToast();
  
  // Dynamic form setup based on available vehicles
  const formSchema = createDynamicFormSchema(vehicles.map(v => v.id));
  const newTourFormSchema = createDynamicNewTourFormSchema(vehicles.map(v => v.id));
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourId: "",
    },
  });
  
  const newTourForm = useForm<z.infer<typeof newTourFormSchema>>({
    resolver: zodResolver(newTourFormSchema),
    defaultValues: {
      tourId: "",
      tourName: "",
    },
  });
  
  useEffect(() => {
    // Fetch all available vehicles
    const fetchVehicles = async () => {
      try {
        const vehicleData = await getVehicleData(true, true); // Force refresh and include inactive
        setVehicles(vehicleData);
        
        // Initialize form default values for each vehicle
        const defaultValues: Record<string, any> = {
          tourId: form.getValues().tourId || "",
        };
        
        vehicleData.forEach(vehicle => {
          defaultValues[vehicle.id] = form.getValues()[vehicle.id] || 0;
        });
        
        // Update the form with new default values that include all vehicles
        form.reset(defaultValues);
        
        // Similarly update new tour form
        const newTourDefaults: Record<string, any> = {
          tourId: newTourForm.getValues().tourId || "",
          tourName: newTourForm.getValues().tourName || "",
        };
        
        vehicleData.forEach(vehicle => {
          newTourDefaults[vehicle.id] = newTourForm.getValues()[vehicle.id] || 0;
        });
        
        newTourForm.reset(newTourDefaults);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setError("Failed to load vehicle types");
      }
    };
    
    fetchVehicles();
    fetchTourFares();
  }, []);
  
  const onSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      console.log("Submitting fare update:", values);
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      // Create base request with required fields to satisfy TypeScript
      const fareUpdateRequest: FareUpdateRequest = {
        tourId: values.tourId,
        sedan: 0,
        ertiga: 0,
        innova: 0,
        tempo: 0,
        luxury: 0
      };
      
      // Dynamically add vehicle prices based on available vehicles
      vehicles.forEach(vehicle => {
        // This ensures all required properties exist while also adding dynamic ones
        fareUpdateRequest[vehicle.id] = values[vehicle.id] || 0;
      });
      
      // FIX: Use the fareAPI.updateTourFares method which handles the correct endpoint
      const data = await fareAPI.updateTourFares(fareUpdateRequest);
      console.log("Fare update response:", data);
      
      toast.success("Tour fare updated successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error updating fare:", error);
      toast.error("Failed to update fare");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onAddTourSubmit = async (values: any) => {
    try {
      setIsLoading(true);
      console.log("Adding new tour:", values);
      
      // Create base tour data
      const newTourData: any = {
        id: 0,
        tourId: values.tourId,
        tourName: values.tourName,
      };
      
      // Dynamically add vehicle prices based on available vehicles
      vehicles.forEach(vehicle => {
        newTourData[vehicle.id] = values[vehicle.id] || 0;
      });
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const data = await fareAPI.addTourFare(newTourData);
      console.log("New tour added:", data);
      
      toast.success("New tour added successfully");
      await fetchTourFares();
      setAddTourDialogOpen(false);
      newTourForm.reset();
    } catch (error) {
      console.error("Error adding tour:", error);
      toast.error("Failed to add new tour");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteTour = async (tourId: string) => {
    if (!confirm("Are you sure you want to delete this tour? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsRefreshing(true);
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const data = await fareAPI.deleteTourFare(tourId);
      console.log("Tour deleted:", data);
      
      toast.success("Tour deleted successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error deleting tour:", error);
      toast.error("Failed to delete tour");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const fetchTourFares = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      console.log("Manually refreshing tour fares...");
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      await reloadCabTypes();
      
      const data = await fareAPI.getTourFares();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched tour fares:", data);
        setTourFares(data);
        toast.success("Tour fares refreshed");
      } else {
        console.warn("Empty or invalid tour fares data:", data);
        setError("No tour fares data available. The API may be down or returned an empty result.");
      }
    } catch (error) {
      console.error("Error refreshing tour fares:", error);
      setError("Failed to refresh tour fares. Please try again.");
      toast.error("Failed to refresh tour fares");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleTourSelect = (tourId: string) => {
    const selectedTour = tourFares.find(fare => fare.tourId === tourId);
    if (selectedTour) {
      // Start with base values
      const formValues: Record<string, any> = {
        tourId: selectedTour.tourId
      };
      
      // Dynamically set values for each vehicle
      vehicles.forEach(vehicle => {
        // Use the vehicle ID to get its price (if available)
        formValues[vehicle.id] = selectedTour[vehicle.id] || 0;
      });
      
      // Reset form with all values
      form.reset(formValues);
    }
  };

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update" className="flex items-center gap-1">
          <Edit className="h-4 w-4" /> Update Tour Fares
        </TabsTrigger>
        <TabsTrigger value="all" className="flex items-center gap-1">
          <Globe className="h-4 w-4" /> View All Fares
        </TabsTrigger>
        <TabsTrigger value="add" className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" /> Add New Tour
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" /> Update Tour Fares
              </CardTitle>
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
                  name="tourId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Tour</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleTourSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a tour" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tourFares.map((fare) => (
                            <SelectItem key={fare.tourId} value={fare.tourId}>
                              {fare.tourName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {/* Dynamically generate form fields for each vehicle */}
                  {vehicles.map(vehicle => (
                    <FormField
                      key={vehicle.id}
                      control={form.control}
                      name={vehicle.id as any} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{vehicle.name} Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Fare
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => handleDeleteTour(form.getValues().tourId)}
                    disabled={isLoading || !form.getValues().tourId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Tour
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" /> All Tour Fares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {tourFares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tour fares available.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left">Tour Name</th>
                      {/* Dynamically generate table headers for vehicle types */}
                      {vehicles.map(vehicle => (
                        <th key={vehicle.id} className="px-4 py-2 text-left">{vehicle.name}</th>
                      ))}
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tourFares.map((fare) => (
                      <tr key={fare.tourId} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-2">{fare.tourName}</td>
                        {/* Dynamically generate table cells for vehicle prices */}
                        {vehicles.map(vehicle => (
                          <td key={`${fare.tourId}-${vehicle.id}`} className="px-4 py-2">
                            ₹{fare[vehicle.id] || 0}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              form.setValue("tourId", fare.tourId);
                              handleTourSelect(fare.tourId);
                              // Fix: properly find and click the element
                              const tabElement = document.querySelector('[data-value="update"]');
                              if (tabElement && tabElement instanceof HTMLElement) {
                                tabElement.click();
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="add">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" /> Add New Tour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...newTourForm}>
              <form onSubmit={newTourForm.handleSubmit(onAddTourSubmit)} className="space-y-6">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={newTourForm.control}
                    name={"tourId" as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., araku_valley" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newTourForm.control}
                    name={"tourName" as const}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tour Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Araku Valley Tour" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {/* Dynamically generate form fields for each vehicle */}
                  {vehicles.map(vehicle => (
                    <FormField
                      key={vehicle.id}
                      control={newTourForm.control}
                      name={vehicle.id as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{vehicle.name} Price</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Tour
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
