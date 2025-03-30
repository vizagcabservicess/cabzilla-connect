import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { toast } from 'sonner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  syncVehicleData 
} from '@/services/directVehicleService';
import { reloadCabTypes } from '@/lib/cabData';
import { 
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CabType } from '@/types/cab';

interface ExtendedVehicleType {
  id: string;
  vehicleId?: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  ac?: boolean;
  isActive?: boolean;
  image?: string;
  description?: string;
  amenities?: string[];
  basePrice?: number;
  pricePerKm?: number;
  nightHaltCharge?: number;
  driverAllowance?: number;
}

// VehicleManagement component
const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<ExtendedVehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<ExtendedVehicleType | null>(null);
  
  // New vehicle form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState('4');
  const [newVehicleLuggageCapacity, setNewVehicleLuggageCapacity] = useState('2');
  const [newVehicleImage, setNewVehicleImage] = useState('');
  
  // Edit vehicle form state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editVehicleName, setEditVehicleName] = useState('');
  const [editVehicleCapacity, setEditVehicleCapacity] = useState('');
  const [editVehicleLuggageCapacity, setEditVehicleLuggageCapacity] = useState('');
  const [editVehicleImage, setEditVehicleImage] = useState('');
  const [editVehicleDescription, setEditVehicleDescription] = useState('');
  const [editVehicleIsActive, setEditVehicleIsActive] = useState(true);
  
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      // Call reloadCabTypes with forceRefresh=true to ensure fresh data
      await reloadCabTypes(true);
      
      // Get cached vehicles from session/local storage
      const cachedVehicles = sessionStorage.getItem('cabTypes');
      const localStorageVehicles = localStorage.getItem('cachedVehicles');
      
      const combinedVehicles: ExtendedVehicleType[] = [];
      
      // Process cached vehicles first
      if (cachedVehicles) {
        try {
          const parsed = JSON.parse(cachedVehicles);
          
          if (Array.isArray(parsed)) {
            parsed.forEach(vehicle => {
              if (!combinedVehicles.some(v => v.id === vehicle.id)) {
                combinedVehicles.push(vehicle);
              }
            });
          }
        } catch (e) {
          console.error('Error parsing cached vehicles:', e);
        }
      }
      
      // Add vehicles from local storage if they don't exist in combined list
      if (localStorageVehicles) {
        try {
          const parsed = JSON.parse(localStorageVehicles);
          
          if (Array.isArray(parsed)) {
            parsed.forEach(vehicle => {
              if (!combinedVehicles.some(v => 
                v.id === vehicle.id || v.id === vehicle.vehicleId
              )) {
                combinedVehicles.push(vehicle);
              }
            });
          }
        } catch (e) {
          console.error('Error parsing local storage vehicles:', e);
        }
      }
      
      // If we have pricing data, try to include those vehicles too
      try {
        const pricingData = localStorage.getItem('vehiclePricing');
        if (pricingData) {
          const pricing = JSON.parse(pricingData);
          
          if (pricing && pricing.data && Array.isArray(pricing.data)) {
            for (const item of pricing.data) {
              if (item && item.vehicleId && !combinedVehicles.some(v => 
                  v.id === item.vehicleId || v.vehicleId === item.vehicleId
              )) {
                const newVehicle: CabType = {
                  id: item.vehicleId,
                  vehicleId: item.vehicleId,
                  name: item.name || item.vehicleId,
                  capacity: parseInt(item.capacity) || 4,
                  luggageCapacity: parseInt(item.luggageCapacity) || 2,
                  isActive: true,
                  description: item.description || `${item.name || item.vehicleId} vehicle`,
                  image: item.image || `/cars/sedan.png`,
                  amenities: ['AC', 'Bottle Water', 'Music System'],
                  ac: true
                };
                combinedVehicles.push(newVehicle);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error processing pricing data:', e);
      }
      
      // Sort vehicles by name
      combinedVehicles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setVehicles(combinedVehicles);
      console.log(`Loaded ${combinedVehicles.length} vehicles`);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchVehicles();
    
    // Listen for vehicle updates
    const handleVehicleUpdates = () => {
      console.log('Detected vehicle updates, refreshing data...');
      fetchVehicles();
    };
    
    window.addEventListener('vehicles-updated', handleVehicleUpdates);
    window.addEventListener('vehicle-data-refreshed', handleVehicleUpdates);
    
    return () => {
      window.removeEventListener('vehicles-updated', handleVehicleUpdates);
      window.removeEventListener('vehicle-data-refreshed', handleVehicleUpdates);
    };
  }, [fetchVehicles]);
  
  const handleRefreshData = useCallback(async () => {
    toast.info('Refreshing vehicle data...');
    
    try {
      // Use the syncVehicleData function with forceRefresh=true
      const result = await syncVehicleData(true);
      
      if (result.success) {
        toast.success(`Successfully refreshed vehicle data (${result.vehicleCount} vehicles)`);
        await fetchVehicles();
      } else {
        if (result.alreadyInProgress) {
          toast.info('Vehicle sync already in progress, please wait');
        } else {
          toast.error('Failed to refresh vehicle data');
        }
      }
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
      toast.error('Error refreshing vehicle data');
    }
  }, [fetchVehicles]);
  
  const handleEditVehicle = (vehicle: ExtendedVehicleType) => {
    setSelectedVehicle(vehicle);
    setEditVehicleName(vehicle.name || '');
    setEditVehicleCapacity(String(vehicle.capacity) || '4');
    setEditVehicleLuggageCapacity(String(vehicle.luggageCapacity) || '2');
    setEditVehicleImage(vehicle.image || '');
    setEditVehicleDescription(vehicle.description || '');
    setEditVehicleIsActive(vehicle.isActive !== false);
    setIsEditDialogOpen(true);
  };
  
  const handleUpdateVehicle = async () => {
    if (!selectedVehicle) return;
    
    try {
      toast.info(`Updating vehicle: ${editVehicleName}`);
      
      const vehicleData = {
        ...selectedVehicle,
        name: editVehicleName,
        capacity: parseInt(editVehicleCapacity) || 4,
        luggageCapacity: parseInt(editVehicleLuggageCapacity) || 2,
        image: editVehicleImage,
        description: editVehicleDescription,
        isActive: editVehicleIsActive,
        // Make sure we're using the correct ID field
        vehicleId: selectedVehicle.id,
        id: selectedVehicle.id,
        // Include required fields for CabType compatibility
        ac: true,
        amenities: selectedVehicle.amenities || ['AC', 'Bottle Water', 'Music System']
      };
      
      // First try direct update
      const result = await updateVehicle(vehicleData);
      
      if (result.status === 'success') {
        toast.success(`Vehicle ${editVehicleName} updated successfully`);
        setIsEditDialogOpen(false);
        await syncVehicleData(true);
        await fetchVehicles();
      } else {
        toast.error('Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Error updating vehicle');
    }
  };
  
  const handleDeleteVehicle = async (vehicle: ExtendedVehicleType) => {
    if (window.confirm(`Are you sure you want to delete ${vehicle.name}?`)) {
      try {
        toast.info(`Deleting vehicle: ${vehicle.name}`);
        
        const result = await deleteVehicle(vehicle.id);
        
        if (result.status === 'success') {
          toast.success(`Vehicle ${vehicle.name} deleted successfully`);
          await fetchVehicles();
        } else {
          toast.error('Failed to delete vehicle');
        }
      } catch (error) {
        console.error('Error deleting vehicle:', error);
        toast.error('Error deleting vehicle');
      }
    }
  };
  
  const handleToggleVehicleActive = async (vehicle: ExtendedVehicleType, isActive: boolean) => {
    try {
      toast.info(`${isActive ? 'Activating' : 'Deactivating'} vehicle: ${vehicle.name}`);
      
      const updatedVehicle = {
        ...vehicle,
        isActive,
        // Include required fields for CabType compatibility
        ac: true,
        amenities: vehicle.amenities || ['AC', 'Bottle Water', 'Music System']
      };
      
      const result = await updateVehicle(updatedVehicle);
      
      if (result.status === 'success') {
        toast.success(`Vehicle ${vehicle.name} ${isActive ? 'activated' : 'deactivated'} successfully`);
        
        // Update the local state to reflect the change
        setVehicles(prev => 
          prev.map(v => v.id === vehicle.id ? { ...v, isActive } : v)
        );
      } else {
        toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} vehicle`);
      }
    } catch (error) {
      console.error(`Error ${isActive ? 'activating' : 'deactivating'} vehicle:`, error);
      toast.error(`Error ${isActive ? 'activating' : 'deactivating'} vehicle`);
    }
  };
  
  const handleAddNewVehicle = async () => {
    try {
      const vehicleId = newVehicleId || newVehicleName.toLowerCase().replace(/\s+/g, '_');
      
      const vehicleData: CabType = {
        id: vehicleId,
        vehicleId: vehicleId,
        name: newVehicleName,
        capacity: parseInt(newVehicleCapacity) || 4,
        luggageCapacity: parseInt(newVehicleLuggageCapacity) || 2,
        isActive: true,
        description: `${newVehicleName} vehicle`,
        image: newVehicleImage || "/cars/sedan.png",
        amenities: ["AC", "Bottle Water", "Music System"],
        ac: true,
        price: 0,
        pricePerKm: 0,
        basePrice: 0
      };
      
      toast.info(`Creating vehicle: ${newVehicleName}`);
      
      const result = await createVehicle(vehicleData);
      
      if (result.status === 'success') {
        toast.success(`Vehicle ${newVehicleName} created successfully`);
        
        // Reset form
        setNewVehicleName('');
        setNewVehicleId('');
        setNewVehicleCapacity('4');
        setNewVehicleLuggageCapacity('2');
        setNewVehicleImage('');
        setIsAddDialogOpen(false);
        
        // Update vehicles list with new vehicle
        setVehicles(prev => [
          ...prev, 
          vehicleData as ExtendedVehicleType
        ]);
        
        // Force vehicle data sync
        await syncVehicleData(true);
        await fetchVehicles();
      } else {
        toast.error('Failed to create vehicle');
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast.error('Error creating vehicle');
    }
  };
  
  // Reset new vehicle form when dialog is closed
  useEffect(() => {
    if (!isAddDialogOpen) {
      setNewVehicleName('');
      setNewVehicleId('');
      setNewVehicleCapacity('4');
      setNewVehicleLuggageCapacity('2');
      setNewVehicleImage('');
    }
  }, [isAddDialogOpen]);
  
  // Auto-generate vehicle ID based on name
  useEffect(() => {
    if (newVehicleName && !newVehicleId) {
      setNewVehicleId(newVehicleName.toLowerCase().replace(/\s+/g, '_'));
    }
  }, [newVehicleName, newVehicleId]);
  
  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vehicle Management</h1>
        <div className="flex space-x-2">
          <Button onClick={handleRefreshData} variant="outline">
            Refresh Data
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add New Vehicle</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Create a new vehicle type for your fleet.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newVehicleName}
                    onChange={(e) => setNewVehicleName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="vehicleId" className="text-right">
                    Vehicle ID
                  </Label>
                  <Input
                    id="vehicleId"
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className="col-span-3"
                    placeholder="auto-generated from name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">
                    Passenger Capacity
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newVehicleCapacity}
                    onChange={(e) => setNewVehicleCapacity(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="luggageCapacity" className="text-right">
                    Luggage Capacity
                  </Label>
                  <Input
                    id="luggageCapacity"
                    type="number"
                    value={newVehicleLuggageCapacity}
                    onChange={(e) => setNewVehicleLuggageCapacity(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right">
                    Image URL
                  </Label>
                  <Input
                    id="image"
                    value={newVehicleImage}
                    onChange={(e) => setNewVehicleImage(e.target.value)}
                    className="col-span-3"
                    placeholder="/cars/sedan.png"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddNewVehicle}>
                  Create Vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center p-4">Loading vehicles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 ? (
            <div className="col-span-full text-center p-4">
              No vehicles found. Add a new vehicle to get started.
            </div>
          ) : (
            vehicles.map((vehicle) => (
              <Card key={vehicle.id} className={!vehicle.isActive ? "opacity-60" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle>{vehicle.name}</CardTitle>
                    <CardDescription>ID: {vehicle.id}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`active-${vehicle.id}`} className="text-sm">
                      {vehicle.isActive ? "Active" : "Inactive"}
                    </Label>
                    <Switch
                      id={`active-${vehicle.id}`}
                      checked={vehicle.isActive ?? true}
                      onCheckedChange={(checked) => handleToggleVehicleActive(vehicle, checked)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Capacity:</span> {vehicle.capacity} passengers
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Luggage:</span> {vehicle.luggageCapacity} bags
                    </div>
                  </div>
                  <div className="h-[100px] bg-gray-100 rounded-md flex items-center justify-center mb-2">
                    {vehicle.image ? (
                      <img
                        src={vehicle.image}
                        alt={vehicle.name}
                        className="h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/cars/sedan.png";
                        }}
                      />
                    ) : (
                      <div className="text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="text-sm mt-2">
                    <span className="font-medium">Description:</span>{" "}
                    {vehicle.description || `${vehicle.name} vehicle`}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditVehicle(vehicle)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteVehicle(vehicle)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Edit Vehicle Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editVehicleName}
                onChange={(e) => setEditVehicleName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-capacity" className="text-right">
                Passenger Capacity
              </Label>
              <Input
                id="edit-capacity"
                type="number"
                value={editVehicleCapacity}
                onChange={(e) => setEditVehicleCapacity(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-luggageCapacity" className="text-right">
                Luggage Capacity
              </Label>
              <Input
                id="edit-luggageCapacity"
                type="number"
                value={editVehicleLuggageCapacity}
                onChange={(e) => setEditVehicleLuggageCapacity(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-image" className="text-right">
                Image URL
              </Label>
              <Input
                id="edit-image"
                value={editVehicleImage}
                onChange={(e) => setEditVehicleImage(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Input
                id="edit-description"
                value={editVehicleDescription}
                onChange={(e) => setEditVehicleDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isActive" className="text-right">
                Active
              </Label>
              <div className="col-span-3">
                <Switch
                  id="edit-isActive"
                  checked={editVehicleIsActive}
                  onCheckedChange={setEditVehicleIsActive}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateVehicle}>
              Update Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehicleManagement;
