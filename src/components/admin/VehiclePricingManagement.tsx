
import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  Save, 
  Trash2,
  Check
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fareAPI } from '@/services/api';

const vechicleFormSchema = z.object({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }),
  name: z.string().min(1, { message: "Vehicle name is required" }),
  basePrice: z.coerce.number().min(0, { message: "Base price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price per km cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Night halt charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Driver allowance cannot be negative" }),
  capacity: z.coerce.number().min(1, { message: "Capacity must be at least 1" }),
  luggageCapacity: z.coerce.number().min(0, { message: "Luggage capacity cannot be negative" }),
  ac: z.boolean().default(true),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
});

const newVehicleFormSchema = vechicleFormSchema.extend({
  vehicleId: z.string().min(1, { message: "Vehicle ID is required" }).regex(/^[a-z0-9_]+$/, {
    message: "Vehicle ID must be lowercase with only letters, numbers and underscores",
  })
});

export function VehiclePricingManagement() {
  const [vehicles, setVehicles] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addVehicleDialogOpen, setAddVehicleDialogOpen] = useState(false);
  const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof vechicleFormSchema>>({
    resolver: zodResolver(vechicleFormSchema),
    defaultValues: {
      vehicleId: "",
      name: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      image: "",
      isActive: true,
    },
  });
  
  const newVehicleForm = useForm<z.infer<typeof newVehicleFormSchema>>({
    resolver: zodResolver(newVehicleFormSchema),
    defaultValues: {
      vehicleId: "",
      name: "",
      basePrice: 4000,
      pricePerKm: 15,
      nightHaltCharge: 500,
      driverAllowance: 250,
      capacity: 4,
      luggageCapacity: 2,
      ac: true,
      image: "/cars/sedan.png",
      isActive: true,
    },
  });
  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
  const fetchVehicles = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Get all vehicles, including inactive ones
      const data = await fareAPI.getVehicles(true);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched vehicles:", data);
        setVehicles(data);
        toast.success("Vehicles refreshed");
      } else {
        console.warn("Empty or invalid vehicle data:", data);
        setError("No vehicle data available. The API may be down or returned an empty result.");
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setError("Failed to refresh vehicles. Please try again.");
      toast.error("Failed to refresh vehicles");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleVehicleSelect = (vehicleId: string) => {
    const selectedVehicle = vehicles.find(v => v.id === vehicleId || v.vehicleId === vehicleId);
    
    if (selectedVehicle) {
      form.reset({
        vehicleId: selectedVehicle.vehicleId || selectedVehicle.id,
        name: selectedVehicle.name,
        basePrice: selectedVehicle.basePrice || 0,
        pricePerKm: selectedVehicle.pricePerKm || 0,
        nightHaltCharge: selectedVehicle.nightHaltCharge || 0,
        driverAllowance: selectedVehicle.driverAllowance || 0,
        capacity: selectedVehicle.capacity || 4,
        luggageCapacity: selectedVehicle.luggageCapacity || 2,
        ac: selectedVehicle.ac ?? true,
        image: selectedVehicle.image || "",
        isActive: selectedVehicle.isActive ?? true,
      });
    }
  };
  
  const onSubmit = async (values: z.infer<typeof vechicleFormSchema>) => {
    try {
      setIsLoading(true);
      console.log("Submitting vehicle update:", values);
      
      // Clear caches
      localStorage.removeItem('cabTypes');
      localStorage.removeItem('cabFares');
      sessionStorage.removeItem('cabTypes');
      sessionStorage.removeItem('cabFares');
      
      // Add retries for reliability
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          const data = await fareAPI.updateVehiclePricing(values);
          console.log("Vehicle update response:", data);
          success = true;
          toast.success("Vehicle pricing updated successfully");
        } catch (error) {
          console.error(`Vehicle update attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
      
      // Refresh the vehicle list
      await fetchVehicles();
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      toast.error("Failed to update vehicle pricing");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onAddVehicleSubmit = async (values: z.infer<typeof newVehicleFormSchema>) => {
    try {
      setIsLoading(true);
      console.log("Adding new vehicle:", values);
      
      // Clear caches
      localStorage.removeItem('cabTypes');
      localStorage.removeItem('cabFares');
      sessionStorage.removeItem('cabTypes');
      sessionStorage.removeItem('cabFares');
      
      // First check if vehicle with this ID already exists
      const existingVehicle = vehicles.find(v => 
        v.id === values.vehicleId || 
        v.vehicleId === values.vehicleId
      );
      
      if (existingVehicle) {
        toast.error(`Vehicle with ID "${values.vehicleId}" already exists`);
        return;
      }
      
      // Add retries for reliability
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          const data = await fareAPI.addNewVehicle(values);
          console.log("New vehicle response:", data);
          success = true;
          toast.success("New vehicle added successfully");
          setAddVehicleDialogOpen(false);
          newVehicleForm.reset({
            vehicleId: "",
            name: "",
            basePrice: 4000,
            pricePerKm: 15,
            nightHaltCharge: 500,
            driverAllowance: 250,
            capacity: 4,
            luggageCapacity: 2,
            ac: true,
            image: "/cars/sedan.png",
            isActive: true,
          });
        } catch (error) {
          console.error(`New vehicle attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
      
      // Refresh the vehicle list
      await fetchVehicles();
    } catch (error) {
      console.error("Error adding new vehicle:", error);
      toast.error("Failed to add new vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteVehicle = async () => {
    if (!deleteConfirmVehicle) return;
    
    try {
      setIsLoading(true);
      
      // Clear caches
      localStorage.removeItem('cabTypes');
      localStorage.removeItem('cabFares');
      sessionStorage.removeItem('cabTypes');
      sessionStorage.removeItem('cabFares');
      
      console.log(`Deleting vehicle with ID: ${deleteConfirmVehicle}`);
      
      // Add retries for reliability
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        try {
          attempts++;
          const data = await fareAPI.deleteVehicle(deleteConfirmVehicle);
          console.log("Vehicle delete response:", data);
          success = true;
          toast.success("Vehicle deleted successfully");
          setDeleteConfirmVehicle(null);
        } catch (error) {
          console.error(`Vehicle delete attempt ${attempts} failed:`, error);
          if (attempts >= maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
        }
      }
      
      // Refresh the vehicle list
      await fetchVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="update">
      <TabsList>
        <TabsTrigger value="update">Update Vehicle Pricing</TabsTrigger>
        <TabsTrigger value="add">Add New Vehicle</TabsTrigger>
        <TabsTrigger value="list">All Vehicles</TabsTrigger>
      </TabsList>
      
      <TabsContent value="update">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Vehicle Pricing</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchVehicles} 
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setAddVehicleDialogOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Vehicle
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
                      <FormLabel>Select Vehicle</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleVehicleSelect(value);
                        }}
                        value={field.value}
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
                              value={vehicle.vehicleId || vehicle.id}
                            >
                              {vehicle.name} {!vehicle.isActive && "(Inactive)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (₹)</FormLabel>
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
                        <FormLabel>Price per KM (₹)</FormLabel>
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
                        <FormLabel>Night Halt Charge (₹)</FormLabel>
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
                        <FormLabel>Driver Allowance (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
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
                        <FormLabel>Passenger Capacity</FormLabel>
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
                        <FormLabel>Luggage Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image Path</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ac"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>AC Available</FormLabel>
                          <FormDescription>
                            Does this vehicle have air conditioning?
                          </FormDescription>
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Vehicle Active</FormLabel>
                          <FormDescription>
                            Is this vehicle available for booking?
                          </FormDescription>
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
                        Update Vehicle
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => setDeleteConfirmVehicle(form.getValues().vehicleId)}
                    disabled={isLoading || !form.getValues().vehicleId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Vehicle
                  </Button>
                </div>
              </form>
            </Form>
            
            {/* Delete Confirmation Dialog */}
            {deleteConfirmVehicle && (
              <Dialog open={!!deleteConfirmVehicle} onOpenChange={(open) => !open && setDeleteConfirmVehicle(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Vehicle Deletion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this vehicle? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteConfirmVehicle(null)}>Cancel</Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteVehicle}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Vehicle
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="add">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" /> Add New Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...newVehicleForm}>
              <form onSubmit={newVehicleForm.handleSubmit(onAddVehicleSubmit)} className="space-y-6">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={newVehicleForm.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle ID (unique identifier)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., sedan_premium" {...field} />
                        </FormControl>
                        <FormDescription>
                          Lowercase with only letters, numbers and underscores
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Name (display name)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Premium Sedan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  <FormField
                    control={newVehicleForm.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="pricePerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per KM (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="nightHaltCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Night Halt Charge (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="driverAllowance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Allowance (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passenger Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="luggageCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Luggage Capacity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image Path</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="/cars/sedan.png" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={newVehicleForm.control}
                    name="ac"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>AC Available</FormLabel>
                          <FormDescription>
                            Does this vehicle have air conditioning?
                          </FormDescription>
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
                    control={newVehicleForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Vehicle Active</FormLabel>
                          <FormDescription>
                            Is this vehicle available for booking?
                          </FormDescription>
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
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding Vehicle...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Vehicle
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="list">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Vehicles</CardTitle>
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
            {vehicles.length === 0 ? (
              <p className="text-muted-foreground">No vehicles available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">Name</th>
                      <th className="text-right py-2 px-2">Base Price</th>
                      <th className="text-right py-2 px-2">Price/KM</th>
                      <th className="text-center py-2 px-2">Capacity</th>
                      <th className="text-center py-2 px-2">AC</th>
                      <th className="text-center py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.vehicleId || vehicle.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{vehicle.vehicleId || vehicle.id}</td>
                        <td className="py-2 px-2">{vehicle.name}</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.basePrice || 0).toLocaleString()}</td>
                        <td className="text-right py-2 px-2">₹{(vehicle.pricePerKm || 0).toLocaleString()}</td>
                        <td className="text-center py-2 px-2">{vehicle.capacity || 4}</td>
                        <td className="text-center py-2 px-2">
                          {vehicle.ac ? <Check className="h-4 w-4 mx-auto text-green-600" /> : '-'}
                        </td>
                        <td className="text-center py-2 px-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            vehicle.isActive 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {vehicle.isActive ? "Active" : "Inactive"}
                          </span>
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
      
      {/* Add Vehicle Dialog */}
      <Dialog open={addVehicleDialogOpen} onOpenChange={setAddVehicleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Enter the details for the new vehicle. After saving, the vehicle will be available for bookings.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...newVehicleForm}>
            <form onSubmit={newVehicleForm.handleSubmit(onAddVehicleSubmit)} className="space-y-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <FormField
                  control={newVehicleForm.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle ID (unique identifier)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., sedan_premium" {...field} />
                      </FormControl>
                      <FormDescription>
                        Lowercase with only letters, numbers and underscores
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newVehicleForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Name (display name)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Premium Sedan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                <FormField
                  control={newVehicleForm.control}
                  name="basePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newVehicleForm.control}
                  name="pricePerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per KM (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={newVehicleForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passenger Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddVehicleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Vehicle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
