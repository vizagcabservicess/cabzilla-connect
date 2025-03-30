import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getVehicleData, clearVehicleDataCache } from '@/services/vehicleDataService';
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
import { CabLoading } from '../cab-options/CabLoading';
import { apiBaseUrl } from '@/config/api';

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

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<ExtendedVehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<ExtendedVehicleType | null>(null);
  const [refreshInProgress, setRefreshInProgress] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState('4');
  const [newVehicleLuggageCapacity, setNewVehicleLuggageCapacity] = useState('2');
  const [newVehicleImage, setNewVehicleImage] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editVehicleName, setEditVehicleName] = useState('');
  const [editVehicleCapacity, setEditVehicleCapacity] = useState('');
  const [editVehicleLuggageCapacity, setEditVehicleLuggageCapacity] = useState('');
  const [editVehicleImage, setEditVehicleImage] = useState('');
  const [editVehicleDescription, setEditVehicleDescription] = useState('');
  const [editVehicleIsActive, setEditVehicleIsActive] = useState(true);
  
  const shouldThrottleRefresh = (): boolean => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    const minimumInterval = 10000; // 10 seconds
    
    if (timeSinceLastRefresh < minimumInterval) {
      console.log(`Throttling refresh (last occurred ${Math.round(timeSinceLastRefresh/1000)}s ago)`);
      return true;
    }
    
    lastRefreshTimeRef.current = now;
    return false;
  };
  
  const fetchVehicles = useCallback(async () => {
    if (refreshInProgress) {
      console.log('Skipping vehicle fetch - refresh already in progress');
      return;
    }
    
    if (shouldThrottleRefresh()) {
      console.log('Refresh throttled - too soon since last refresh');
      return;
    }
    
    setLoading(true);
    setRefreshInProgress(true);
    
    try {
      let localVehicles: ExtendedVehicleType[] = [];
      
      try {
        const storedVehicles = localStorage.getItem('cachedVehicles');
        if (storedVehicles) {
          const parsedVehicles = JSON.parse(storedVehicles);
          if (Array.isArray(parsedVehicles) && parsedVehicles.length > 0) {
            console.log('Using locally cached vehicles:', parsedVehicles.length);
            localVehicles = parsedVehicles;
            
            setVehicles(localVehicles);
            setLoading(false);
          }
        }
      } catch (e) {
        console.error('Error parsing cached vehicles:', e);
      }
      
      console.log('Fetching vehicles from backend with admin mode...');
      const cacheBuster = `_t=${Date.now()}`;
      const url = `${apiBaseUrl}/api/admin/get-vehicles.php?${cacheBuster}&includeInactive=true&fullSync=true`;
      
      const response = await fetch(url, {
        headers: {
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        mode: 'cors',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data && data.status === 'success' && Array.isArray(data.vehicles)) {
        const fetchedVehicles = data.vehicles;
        console.log(`Loaded ${fetchedVehicles.length} vehicles from API`);
        
        try {
          localStorage.setItem('cachedVehicles', JSON.stringify(fetchedVehicles));
          localStorage.setItem('cachedVehiclesTimestamp', Date.now().toString());
        } catch (e) {
          console.error('Error caching vehicles:', e);
        }
        
        setVehicles(fetchedVehicles);
        
        clearVehicleDataCache();
        
        await getVehicleData(true, true);
        
        await reloadCabTypes(true);
      } else {
        console.warn('API returned invalid data:', data);
        
        console.log('Falling back to standard vehicle data retrieval...');
        const vehicles = await getVehicleData(true, true);
        setVehicles(vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
      
      try {
        const vehicles = await getVehicleData(true, true);
        if (vehicles.length > 0) {
          setVehicles(vehicles);
          console.log(`Loaded ${vehicles.length} vehicles from data service fallback`);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        setRefreshInProgress(false);
      }, 3000);
    }
  }, [refreshInProgress]);
  
  useEffect(() => {
    fetchVehicles();
    
    const handleVehicleUpdates = () => {
      if (!refreshInProgress && !shouldThrottleRefresh()) {
        console.log('Detected vehicle updates, refreshing data...');
        fetchVehicles();
      }
    };
    
    window.addEventListener('vehicles-updated', handleVehicleUpdates);
    window.addEventListener('vehicle-data-refreshed', handleVehicleUpdates);
    
    return () => {
      window.removeEventListener('vehicles-updated', handleVehicleUpdates);
      window.removeEventListener('vehicle-data-refreshed', handleVehicleUpdates);
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchVehicles, refreshInProgress]);
  
  const handleRefreshData = useCallback(async () => {
    if (refreshInProgress) {
      toast.info('Data refresh already in progress, please wait...');
      return;
    }
    
    if (shouldThrottleRefresh()) {
      toast.info('Please wait a moment before refreshing again');
      return;
    }
    
    toast.info('Refreshing vehicle data...');
    setRefreshInProgress(true);
    
    try {
      const result = await syncVehicleData(true);
      
      if (result.success) {
        const vehicleCount = result.vehicleCount !== undefined ? result.vehicleCount : 0;
        toast.success(`Successfully refreshed vehicle data (${vehicleCount} vehicles)`);
        
        setTimeout(() => {
          setRefreshInProgress(false);
          fetchVehicles();
        }, 1000);
      } else {
        if (result.alreadyInProgress) {
          toast.info('Vehicle sync already in progress, please wait');
        } else {
          toast.error('Failed to refresh vehicle data');
        }
        
        setTimeout(() => {
          setRefreshInProgress(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
      toast.error('Error refreshing vehicle data');
      
      setTimeout(() => {
        setRefreshInProgress(false);
      }, 3000);
    }
  }, [fetchVehicles, refreshInProgress]);
  
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
      
      let imagePath = editVehicleImage || "/cars/sedan.png";
      if (imagePath.includes('/')) {
        imagePath = '/cars/' + imagePath.split('/').pop();
      } else {
        imagePath = '/cars/' + imagePath;
      }
      
      const vehicleData = {
        ...selectedVehicle,
        name: editVehicleName,
        capacity: parseInt(editVehicleCapacity) || 4,
        luggageCapacity: parseInt(editVehicleLuggageCapacity) || 2,
        image: imagePath,
        description: editVehicleDescription,
        isActive: editVehicleIsActive,
        vehicleId: selectedVehicle.id,
        id: selectedVehicle.id,
        ac: true,
        amenities: selectedVehicle.amenities || ['AC', 'Bottle Water', 'Music System']
      };
      
      console.log('Updating vehicle with data:', vehicleData);
      
      const result = await updateVehicle(vehicleData);
      
      if (result.status === 'success') {
        toast.success(`Vehicle ${editVehicleName} updated successfully`);
        setIsEditDialogOpen(false);
        
        setVehicles(prev => 
          prev.map(v => v.id === selectedVehicle.id ? {
            ...v,
            name: editVehicleName,
            capacity: parseInt(editVehicleCapacity) || 4,
            luggageCapacity: parseInt(editVehicleLuggageCapacity) || 2,
            image: imagePath,
            description: editVehicleDescription,
            isActive: editVehicleIsActive
          } : v)
        );
        
        try {
          const cachedVehicles = localStorage.getItem('cachedVehicles');
          if (cachedVehicles) {
            const parsed = JSON.parse(cachedVehicles);
            const updated = parsed.map((v: any) => 
              v.id === selectedVehicle.id || v.vehicleId === selectedVehicle.id
                ? {
                    ...v,
                    name: editVehicleName,
                    capacity: parseInt(editVehicleCapacity) || 4,
                    luggageCapacity: parseInt(editVehicleLuggageCapacity) || 2,
                    image: imagePath,
                    description: editVehicleDescription,
                    isActive: editVehicleIsActive
                  }
                : v
            );
            localStorage.setItem('cachedVehicles', JSON.stringify(updated));
          }
          
          const sessionVehicles = sessionStorage.getItem('cabTypes');
          if (sessionVehicles) {
            const parsed = JSON.parse(sessionVehicles);
            const updated = parsed.map((v: any) => 
              v.id === selectedVehicle.id || v.vehicleId === selectedVehicle.id
                ? {
                    ...v,
                    name: editVehicleName,
                    capacity: parseInt(editVehicleCapacity) || 4,
                    luggageCapacity: parseInt(editVehicleLuggageCapacity) || 2,
                    image: imagePath,
                    description: editVehicleDescription,
                    isActive: editVehicleIsActive
                  }
                : v
            );
            sessionStorage.setItem('cabTypes', JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Error updating cache after vehicle update:', e);
        }
        
        setTimeout(async () => {
          try {
            await syncVehicleData(true);
            fetchVehicles();
          } catch (e) {
            console.error('Error syncing after update:', e);
          }
        }, 1000);
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
          
          setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
          
          try {
            const cachedVehicles = localStorage.getItem('cachedVehicles');
            if (cachedVehicles) {
              const parsed = JSON.parse(cachedVehicles);
              const filtered = parsed.filter((v: any) => 
                v.id !== vehicle.id && v.vehicleId !== vehicle.id
              );
              localStorage.setItem('cachedVehicles', JSON.stringify(filtered));
            }
            
            const sessionVehicles = sessionStorage.getItem('cabTypes');
            if (sessionVehicles) {
              const parsed = JSON.parse(sessionVehicles);
              const filtered = parsed.filter((v: any) => 
                v.id !== vehicle.id && v.vehicleId !== vehicle.id
              );
              sessionStorage.setItem('cabTypes', JSON.stringify(filtered));
            }
          } catch (e) {
            console.error('Error updating cache after vehicle deletion:', e);
          }
          
          setTimeout(async () => {
            try {
              await syncVehicleData(true);
              fetchVehicles();
            } catch (e) {
              console.error('Error syncing after delete:', e);
            }
          }, 1000);
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
        isActive: Boolean(isActive),
        ac: true,
        amenities: vehicle.amenities || ['AC', 'Bottle Water', 'Music System']
      };
      
      console.log('Toggling vehicle active state:', updatedVehicle);
      
      const result = await updateVehicle(updatedVehicle);
      
      if (result.status === 'success') {
        toast.success(`Vehicle ${vehicle.name} ${isActive ? 'activated' : 'deactivated'} successfully`);
        
        setVehicles(prev => 
          prev.map(v => v.id === vehicle.id ? { ...v, isActive } : v)
        );
        
        try {
          const cachedVehicles = localStorage.getItem('cachedVehicles');
          if (cachedVehicles) {
            const parsed = JSON.parse(cachedVehicles);
            const updated = parsed.map((v: any) => 
              v.id === vehicle.id || v.vehicleId === vehicle.id
                ? { ...v, isActive }
                : v
            );
            localStorage.setItem('cachedVehicles', JSON.stringify(updated));
          }
          
          const sessionVehicles = sessionStorage.getItem('cabTypes');
          if (sessionVehicles) {
            const parsed = JSON.parse(sessionVehicles);
            const updated = parsed.map((v: any) => 
              v.id === vehicle.id || v.vehicleId === vehicle.id
                ? { ...v, isActive }
                : v
            );
            sessionStorage.setItem('cabTypes', JSON.stringify(updated));
          }
        } catch (e) {
          console.error('Error updating cache after toggling active state:', e);
        }
        
        setTimeout(async () => {
          try {
            await syncVehicleData(true);
            fetchVehicles();
          } catch (e) {
            console.error('Error syncing after toggle:', e);
          }
        }, 1000);
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
      if (!newVehicleName) {
        toast.error('Vehicle name is required');
        return;
      }
      
      const vehicleId = newVehicleId || newVehicleName.toLowerCase().replace(/\s+/g, '_');
      
      let imagePath = newVehicleImage || "/cars/sedan.png";
      if (imagePath && !imagePath.startsWith('/cars/')) {
        imagePath = '/cars/' + imagePath.split('/').pop();
      }
      
      const vehicleData: CabType = {
        id: vehicleId,
        vehicleId: vehicleId,
        name: newVehicleName,
        capacity: parseInt(newVehicleCapacity) || 4,
        luggageCapacity: parseInt(newVehicleLuggageCapacity) || 2,
        isActive: true,
        description: `${newVehicleName} vehicle`,
        image: imagePath,
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
        
        setNewVehicleName('');
        setNewVehicleId('');
        setNewVehicleCapacity('4');
        setNewVehicleLuggageCapacity('2');
        setNewVehicleImage('');
        setIsAddDialogOpen(false);
        
        setVehicles(prev => [...prev, vehicleData]);
        
        try {
          const cachedVehicles = localStorage.getItem('cachedVehicles');
          if (cachedVehicles) {
            const parsed = JSON.parse(cachedVehicles);
            parsed.push(vehicleData);
            localStorage.setItem('cachedVehicles', JSON.stringify(parsed));
          }
          
          const sessionVehicles = sessionStorage.getItem('cabTypes');
          if (sessionVehicles) {
            const parsed = JSON.parse(sessionVehicles);
            parsed.push(vehicleData);
            sessionStorage.setItem('cabTypes', JSON.stringify(parsed));
          }
        } catch (e) {
          console.error('Error updating cache after vehicle creation:', e);
        }
        
        setTimeout(async () => {
          try {
            await syncVehicleData(true);
            fetchVehicles();
          } catch (e) {
            console.error('Error syncing after creation:', e);
          }
        }, 1000);
      } else {
        toast.error('Failed to create vehicle');
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
      toast.error('Error creating vehicle');
    }
  };
  
  useEffect(() => {
    if (!isAddDialogOpen) {
      setNewVehicleName('');
      setNewVehicleId('');
      setNewVehicleCapacity('4');
      setNewVehicleLuggageCapacity('2');
      setNewVehicleImage('');
    }
  }, [isAddDialogOpen]);
  
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
          <Button 
            onClick={handleRefreshData} 
            variant="outline" 
            disabled={refreshInProgress}
          >
            {refreshInProgress ? 'Refreshing...' : 'Refresh Data'}
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
        <div className="text-center p-4">
          <CabLoading />
        </div>
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
