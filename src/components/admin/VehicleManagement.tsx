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
import { fareAPI } from '@/services/api';
import { reloadCabTypes } from '@/lib/cabData';
import { fareService } from '@/services/fareService';

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
      const response = await fareAPI.getVehicles();
      
      let vehicleData: VehicleData[] = [];
      
      if (Array.isArray(response)) {
        vehicleData = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.vehicles)) {
          vehicleData = response.vehicles;
        } else if (Array.isArray(response.data)) {
          vehicleData = response.data;
        } else {
          const potentialVehicles = Object.values(response).filter(val => 
            val && typeof val === 'object' && !Array.isArray(val)
          );
          if (potentialVehicles.length > 0) {
            vehicleData = potentialVehicles as VehicleData[];
          }
        }
      }
      
      console.log("Fetched vehicles:", vehicleData);
      
      const normalizedVehicles = vehicleData.map(vehicle => ({
        id: vehicle.id || vehicle.vehicleId || "",
        name: vehicle.name || "",
        capacity: vehicle.capacity || 4,
        luggageCapacity: vehicle.luggageCapacity || vehicle.luggage_capacity || 2,
        ac: vehicle.ac !== undefined ? vehicle.ac : true,
        image: vehicle.image || "/cars/sedan.png",
        amenities: vehicle.amenities || [],
        description: vehicle.description || "",
        isActive: vehicle.isActive !== undefined ? vehicle.isActive : 
                (vehicle.is_active !== undefined ? vehicle.is_active : true),
        basePrice: vehicle.basePrice || vehicle.price || 0,
        pricePerKm: vehicle.pricePerKm || 0,
        nightHaltCharge: vehicle.nightHaltCharge || 0,
        driverAllowance: vehicle.driverAllowance || 0,
        vehicleId: vehicle.id || vehicle.vehicleId || ""
      }));
      
      setVehicles(normalizedVehicles);
      toast.success("Vehicles data refreshed");
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to load vehicles data. Please try again.");
      toast.error("Failed to refresh vehicles data");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleVehicleSelect = (vehicleId: string) => {
    const selectedVehicle = vehicles.find(v => v.id === vehicleId || v.vehicleId === vehicleId);
    
    if (selectedVehicle) {
      form.setValue("vehicleId", selectedVehicle.id || selectedVehicle.vehicleId || "");
      form.setValue("name", selectedVehicle.name);
      form.setValue("capacity", selectedVehicle.capacity);
      form.setValue("luggageCapacity", selectedVehicle.luggageCapacity || selectedVehicle.luggage_capacity || 2);
      form.setValue("ac", selectedVehicle.ac);
      form.setValue("image", selectedVehicle.image);
      form.setValue("amenities", Array.isArray(selectedVehicle.amenities) ? selectedVehicle.amenities.join(', ') : '');
      form.setValue("description", selectedVehicle.description || '');
      form.setValue("isActive", selectedVehicle.isActive !== undefined ? selectedVehicle.isActive : 
                              (selectedVehicle.is_active !== undefined ? selectedVehicle.is_active : true));
      form.setValue("basePrice", selectedVehicle.basePrice || selectedVehicle.price || 0);
      form.setValue("pricePerKm", selectedVehicle.pricePerKm || 0);
      form.setValue("nightHaltCharge", selectedVehicle.nightHaltCharge || 0);
      form.setValue("driverAllowance", selectedVehicle.driverAllowance || 0);
      
      setIsAddingNew(false);
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
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      fareService.clearCache();
      
      await reloadCabTypes();
      
      await fareAPI.deleteVehicle(vehicleId);
      
      toast.success("Vehicle deleted successfully");
      await fetchVehicles();
      resetForm();
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
        vehicleId: values.vehicleId,
        name: values.name,
        capacity: values.capacity,
        luggageCapacity: values.luggageCapacity,
        ac: values.ac,
        image: values.image,
        amenities: amenitiesArray,
        description: values.description || '',
        isActive: values.isActive,
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance,
        id: values.vehicleId
      };
      
      console.log(`${isAddingNew ? 'Adding' : 'Updating'} vehicle:`, vehicleData);
      
      localStorage.removeItem('cabFares');
      localStorage.removeItem('tourFares');
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('tourFares');
      sessionStorage.removeItem('calculatedFares');
      
      fareService.clearCache();
      
      await fareService.updateVehiclePricing(vehicleData);
      
      if (isAddingNew) {
        toast.success("New vehicle added successfully");
      } else {
        toast.success("Vehicle updated successfully");
      }
      
      await reloadCabTypes();
      
      await fetchVehicles();
      
      if (isAddingNew) {
        resetForm();
        setIsAddingNew(false);
      }
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast.error(`Failed to ${isAddingNew ? 'add' : 'update'} vehicle`);
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
                            field.onChange(value);
                            handleVehicleSelect(value);
                          }}
                          value={field.value}
                          disabled={isAddingNew}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles.map((vehicle) => (
                              <SelectItem 
                                key={vehicle.id || vehicle.vehicleId} 
                                value={vehicle.id || vehicle.vehicleId || ""}
                              >
                                {vehicle.name}
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
                      <tr key={vehicle.id || vehicle.vehicleId} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                              <Car className="h-4 w-4 text-gray-500" />
                            </div>
                            {vehicle.name || vehicle.id || vehicle.vehicleId}
                          </div>
                        </td>
                        <td className="text-center py-2 px-2">{vehicle.capacity} persons</td>
                        <td className="text-center py-2 px-2">{vehicle.luggageCapacity || vehicle.luggage_capacity || 0} bags</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.basePrice || vehicle.price || 0).toLocaleString('en-IN')}</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.pricePerKm || 0).toLocaleString('en-IN')}</td>
                        <td className="text-center py-2 px-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            vehicle.isActive || vehicle.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {vehicle.isActive || vehicle.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVehicleSelect(vehicle.id || vehicle.vehicleId || "")}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteVehicle(vehicle.id || vehicle.vehicleId || "")}
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

