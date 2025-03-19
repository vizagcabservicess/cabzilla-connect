
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  AlertCircle, 
  RefreshCw, 
  Save, 
  PlusCircle, 
  Trash2, 
  Edit, 
  Car, 
  CheckSquare,
  Camera,
  Briefcase,
  Users,
  DollarSign,
  Snowflake
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { reloadCabTypes } from '@/lib/cabData';
import { getVehicleData, updateVehicle, addVehicle, deleteVehicle } from '@/services/vehicleDataService';
import { CabType } from '@/types/cab';

const vehicleFormSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }),
  name: z.string().min(1, { message: "Name is required" }),
  capacity: z.coerce.number().int().min(1, { message: "Capacity must be at least 1" }),
  luggageCapacity: z.coerce.number().int().min(0, { message: "Luggage capacity cannot be negative" }),
  ac: z.boolean().default(true),
  image: z.string().min(1, { message: "Image path is required" }),
  amenities: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
});

export type VehicleData = {
  id: string;
  vehicle_id?: string;
  name: string;
  capacity: number;
  luggage_capacity?: number;
  luggageCapacity?: number;
  ac: boolean;
  image: string;
  amenities: string[] | null;
  description: string | null;
  is_active?: boolean;
  isActive?: boolean;
  basePrice?: number;
  price?: number;
  pricePerKm?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
  created_at?: string;
  updated_at?: string;
  vehicleId?: string;
};

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { toast: uiToast } = useToast();
  
  const form = useForm<z.infer<typeof vehicleFormSchema>>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicleId: "",
      name: "",
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      image: "/cars/sedan.png",
      amenities: "",
      description: "",
      isActive: true,
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    },
  });
  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
  const fetchVehicles = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      console.log("Fetching vehicles data");
      
      // Use the improved vehicle data service to fetch vehicles
      const vehicleData = await getVehicleData(true); // Include inactive vehicles for admin
      
      if (Array.isArray(vehicleData) && vehicleData.length > 0) {
        const normalizedVehicles = vehicleData.map(vehicle => {
          // Make sure vehicle IDs don't have item- prefixes
          const cleanId = vehicle.id && vehicle.id.startsWith('item-') 
            ? vehicle.id.substring(5) 
            : vehicle.id;
            
          return {
            id: cleanId || `vehicle-${Math.random().toString(36).substring(2, 9)}`,
            name: String(vehicle.name || "Unnamed Vehicle"),
            capacity: Number(vehicle.capacity) || 4,
            luggageCapacity: Number(vehicle.luggageCapacity) || 2,
            ac: vehicle.ac !== undefined ? Boolean(vehicle.ac) : true,
            image: String(vehicle.image || "/cars/sedan.png"),
            amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : [],
            description: String(vehicle.description || ""),
            isActive: vehicle.isActive !== undefined ? Boolean(vehicle.isActive) : true,
            basePrice: Number(vehicle.basePrice || vehicle.price || 0),
            pricePerKm: Number(vehicle.pricePerKm || 0),
            nightHaltCharge: Number(vehicle.nightHaltCharge || 0),
            driverAllowance: Number(vehicle.driverAllowance || 0),
            vehicleId: cleanId || `vehicle-${Math.random().toString(36).substring(2, 9)}`
          };
        });
        
        console.log("Normalized vehicles:", normalizedVehicles);
        setVehicles(normalizedVehicles);
        toast.success("Vehicles data refreshed");
      } else {
        console.error("Failed to get any vehicle data from all sources");
        setError("No vehicle data available. You may need to create vehicles.");
        toast.error("No vehicles data found");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to load vehicles data. Please try again.");
      toast.error("Failed to refresh vehicles data");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleVehicleSelect = (vehicleId: string) => {
    console.log("Selected vehicle ID:", vehicleId);
    console.log("Available vehicles:", vehicles);
    
    // Clean vehicleId in case it has an item- prefix
    const cleanId = vehicleId.startsWith('item-') ? vehicleId.substring(5) : vehicleId;
    
    const selectedVehicle = vehicles.find(v => 
      v.id === cleanId || v.vehicleId === cleanId);
    
    if (selectedVehicle) {
      console.log("Found selected vehicle:", selectedVehicle);
      
      form.setValue("vehicleId", String(selectedVehicle.id || selectedVehicle.vehicleId || ""));
      form.setValue("name", String(selectedVehicle.name || ""));
      form.setValue("capacity", Number(selectedVehicle.capacity) || 4);
      form.setValue("luggageCapacity", Number(selectedVehicle.luggageCapacity) || 2);
      form.setValue("ac", Boolean(selectedVehicle.ac));
      form.setValue("image", String(selectedVehicle.image || "/cars/sedan.png"));
      
      const amenitiesString = Array.isArray(selectedVehicle.amenities) 
        ? selectedVehicle.amenities.join(', ') 
        : '';
      form.setValue("amenities", amenitiesString);
      
      form.setValue("description", String(selectedVehicle.description || ''));
      form.setValue("isActive", Boolean(selectedVehicle.isActive !== undefined ? selectedVehicle.isActive : true));
      form.setValue("basePrice", Number(selectedVehicle.basePrice || selectedVehicle.price || 0));
      form.setValue("pricePerKm", Number(selectedVehicle.pricePerKm || 0));
      form.setValue("nightHaltCharge", Number(selectedVehicle.nightHaltCharge || 0));
      form.setValue("driverAllowance", Number(selectedVehicle.driverAllowance || 0));
      
      setIsAddingNew(false);
    } else {
      console.error("Vehicle not found with ID:", vehicleId);
      toast.error("Vehicle not found. Try refreshing the data.");
    }
  };
  
  const resetForm = () => {
    form.reset({
      vehicleId: "",
      name: "",
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      image: "/cars/sedan.png",
      amenities: "",
      description: "",
      isActive: true,
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    });
  };
  
  const prepareNewVehicle = () => {
    resetForm();
    setIsAddingNew(true);
  };
  
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Clear caches to ensure fresh data
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      // Delete the vehicle using the vehicle data service
      const success = await deleteVehicle(vehicleId);
      
      if (success) {
        toast.success("Vehicle deleted successfully");
        
        // Refresh cache
        await reloadCabTypes();
        
        // Refresh the vehicles list
        await fetchVehicles();
        
        // Reset form
        resetForm();
      } else {
        toast.error("Failed to delete vehicle");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = async (values: z.infer<typeof vehicleFormSchema>) => {
    try {
      setIsLoading(true);
      
      const amenitiesArray = values.amenities 
        ? values.amenities.split(',').map(item => item.trim()).filter(item => item) 
        : [];
      
      const vehicleData = {
        vehicleId: String(values.vehicleId),
        name: String(values.name),
        capacity: Number(values.capacity),
        luggageCapacity: Number(values.luggageCapacity),
        ac: Boolean(values.ac),
        image: String(values.image),
        amenities: amenitiesArray,
        description: String(values.description || ''),
        isActive: Boolean(values.isActive),
        basePrice: Number(values.basePrice),
        pricePerKm: Number(values.pricePerKm),
        nightHaltCharge: Number(values.nightHaltCharge),
        driverAllowance: Number(values.driverAllowance),
        id: String(values.vehicleId)
      };
      
      console.log(`${isAddingNew ? 'Adding' : 'Updating'} vehicle:`, vehicleData);
      
      // Clear caches
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      let success = false;
      
      if (isAddingNew) {
        // Add new vehicle
        const response = await addVehicle(vehicleData);
        success = response && response.status === 'success';
      } else {
        // Update existing vehicle
        const response = await updateVehicle(vehicleData);
        success = response && response.status === 'success';
      }
      
      if (success) {
        if (isAddingNew) {
          toast.success("New vehicle added successfully");
        } else {
          toast.success("Vehicle updated successfully");
        }
        
        // Reload cab types to update the cache
        await reloadCabTypes();
        
        // Refresh the vehicle list
        await fetchVehicles();
        
        if (isAddingNew) {
          resetForm();
          setIsAddingNew(false);
        }
      } else {
        toast.error(`Failed to ${isAddingNew ? 'add' : 'update'} vehicle. Server error.`);
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error(`Failed to ${isAddingNew ? 'add' : 'update'} vehicle. Try again later.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (error && !vehicles.length) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchVehicles} 
        title="Vehicle Data Error" 
        description="Unable to load vehicle data. This may be due to a network issue or server problem."
      />
    );
  }

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update" className="flex items-center gap-1">
          <Edit className="h-4 w-4" /> {isAddingNew ? "Add New Vehicle" : "Update Vehicle"}
        </TabsTrigger>
        <TabsTrigger value="all" className="flex items-center gap-1">
          <Car className="h-4 w-4" /> View All Vehicles
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> {isAddingNew ? "Add New Vehicle" : "Update Vehicle"}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={isAddingNew ? "default" : "outline"} 
                  size="sm" 
                  onClick={prepareNewVehicle}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Vehicle
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchVehicles} 
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
                {!isAddingNew && (
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Vehicle to Update</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            if (!value || value === "" || value === "placeholder") return; // Prevent empty selection
                            field.onChange(value);
                            handleVehicleSelect(value);
                          }}
                          value={field.value || "placeholder"}
                          disabled={isAddingNew}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="placeholder" disabled>Select a vehicle</SelectItem>
                            {vehicles.map((vehicle) => (
                              <SelectItem 
                                key={vehicle.id || vehicle.vehicleId || Math.random().toString(36).substring(2, 9)} 
                                value={String(vehicle.id || vehicle.vehicleId || '')}
                              >
                                {vehicle.name || "Unnamed vehicle"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle ID (unique identifier)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., sedan, suv, innova" {...field} readOnly={!isAddingNew} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Name (display name)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sedan, SUV, Innova Crysta" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Users className="h-4 w-4" /> Passenger Capacity
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="luggageCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" /> Luggage Capacity
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ac"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-1">
                            <Snowflake className="h-4 w-4" /> Air Conditioning
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-1">
                            <CheckSquare className="h-4 w-4" /> Active Status
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Camera className="h-4 w-4" /> Image Path
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="/cars/image.png" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amenities (comma separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="AC, Bottle Water, Music System" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Vehicle description" className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Pricing Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
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
                
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {isAddingNew ? "Adding..." : "Updating..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isAddingNew ? "Add Vehicle" : "Update Vehicle"}
                      </>
                    )}
                  </Button>
                  
                  {!isAddingNew && (
                    <Button 
                      type="button" 
                      variant="destructive"
                      onClick={() => handleDeleteVehicle(form.getValues().vehicleId)}
                      disabled={isLoading || !form.getValues().vehicleId}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Vehicle
                    </Button>
                  )}
                </div>
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
                <Car className="h-5 w-5" /> All Vehicles
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchVehicles} 
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
            
            {isRefreshing ? (
              <div className="flex justify-center p-10">
                <RefreshCw className="h-10 w-10 animate-spin text-gray-400" />
              </div>
            ) : vehicles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-center py-2 px-2">Capacity</th>
                      <th className="text-center py-2 px-2">Luggage</th>
                      <th className="text-right py-2 px-2">Base Price</th>
                      <th className="text-right py-2 px-2">Price/KM</th>
                      <th className="text-center py-2 px-2">Status</th>
                      <th className="text-right py-2 px-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id || vehicle.vehicleId || Math.random().toString(36).substring(2, 9)} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              <Car className="h-4 w-4 text-gray-500" />
                            </div>
                            {vehicle.name || "Unnamed vehicle"}
                          </div>
                        </td>
                        <td className="text-center py-2 px-2">{vehicle.capacity || 0} persons</td>
                        <td className="text-center py-2 px-2">{vehicle.luggageCapacity || 0} bags</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.basePrice || vehicle.price || 0).toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.pricePerKm || 0).toLocaleString('en-IN')}</td>
                        <td className="text-center py-2 px-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            vehicle.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {vehicle.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVehicleSelect(String(vehicle.id || vehicle.vehicleId || ""))}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteVehicle(String(vehicle.id || vehicle.vehicleId || ""))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No vehicles found. Click the "Add New Vehicle" button to add your first vehicle.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
