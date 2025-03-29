import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, PlusCircle, Car, RefreshCw } from "lucide-react";
import { getVehicleTypes, updateVehicle, deleteVehicle } from "@/services/vehicleDataService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { VehicleTripFaresForm } from './VehicleTripFaresForm';
import { clearFareCache } from '@/lib/fareCalculationService';
import { reloadCabTypes } from '@/lib/cabData';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [luggageCapacity, setLuggageCapacity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  
  const [newVehicleId, setNewVehicleId] = useState("");
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState("4");
  const [newVehicleLuggageCapacity, setNewVehicleLuggageCapacity] = useState("2");
  const [newVehicleImage, setNewVehicleImage] = useState("/cars/sedan.png");
  
  const [basePrice, setBasePrice] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [nightHaltCharge, setNightHaltCharge] = useState("");
  const [driverAllowance, setDriverAllowance] = useState("");
  
  const [activeTab, setActiveTab] = useState("basic");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const loadVehicles = useCallback(async (forceRefresh = false) => {
    try {
      setIsRefreshing(true);
      console.log("Loading vehicles for management UI", forceRefresh ? "(force refresh)" : "");
      
      // Clear any caches first if forcing refresh
      if (forceRefresh) {
        sessionStorage.removeItem('cabTypes');
        localStorage.removeItem('cabTypes');
        localStorage.setItem('forceCacheRefresh', 'true');
        console.log("Cleared vehicle cache before loading");
      }
      
      // Load vehicles with latest data
      const vehicleList = await getVehicleTypes(forceRefresh);
      
      if (vehicleList && Array.isArray(vehicleList) && vehicleList.length > 0) {
        setVehicles(vehicleList);
        console.log("Successfully loaded vehicles:", vehicleList);
        
        // Check for local vehicles as a backup
        const localVehicles = localStorage.getItem('localVehicles');
        if (localVehicles) {
          try {
            const parsedLocalVehicles = JSON.parse(localVehicles);
            if (Array.isArray(parsedLocalVehicles) && parsedLocalVehicles.length > 0) {
              // Add any local vehicles that don't exist in the fetched list
              const localOnlyVehicles = parsedLocalVehicles.filter(
                localVeh => !vehicleList.some(v => v.id === localVeh.id)
              );
              
              if (localOnlyVehicles.length > 0) {
                console.log("Found additional vehicles in localStorage:", localOnlyVehicles);
                setVehicles(prev => [...prev, ...localOnlyVehicles]);
              }
            }
          } catch (e) {
            console.error("Error parsing local vehicles:", e);
          }
        }
      } else {
        console.warn("No vehicles returned from API");
        toast.error("No vehicles found");
        
        // Try to load from local storage as fallback
        const localVehicles = localStorage.getItem('localVehicles');
        if (localVehicles) {
          try {
            const parsedLocalVehicles = JSON.parse(localVehicles);
            if (Array.isArray(parsedLocalVehicles) && parsedLocalVehicles.length > 0) {
              console.log("Using vehicles from localStorage as fallback:", parsedLocalVehicles);
              setVehicles(parsedLocalVehicles);
              
              if (forceRefresh) {
                toast.success("Loaded vehicles from local storage");
              }
            }
          } catch (e) {
            console.error("Error parsing local vehicles:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast.error("Failed to load vehicles");
      
      // Try to load from local storage as fallback
      const localVehicles = localStorage.getItem('localVehicles');
      if (localVehicles) {
        try {
          const parsedLocalVehicles = JSON.parse(localVehicles);
          if (Array.isArray(parsedLocalVehicles) && parsedLocalVehicles.length > 0) {
            console.log("Using vehicles from localStorage after error:", parsedLocalVehicles);
            setVehicles(parsedLocalVehicles);
          }
        } catch (e) {
          console.error("Error parsing local vehicles:", e);
        }
      }
    } finally {
      setIsRefreshing(false);
      localStorage.removeItem('forceCacheRefresh');
    }
  }, []);
  
  useEffect(() => {
    loadVehicles();
    
    // Set up listeners for vehicle creation/updates
    const handleVehicleCreated = () => {
      console.log("Vehicle created event detected, refreshing vehicle list");
      setRefreshTrigger(prev => prev + 1);
    };
    
    const handleFaresUpdated = () => {
      console.log("Fares updated event detected, refreshing vehicle list");
      setRefreshTrigger(prev => prev + 1);
    };
    
    window.addEventListener('vehicle-created', handleVehicleCreated);
    window.addEventListener('trip-fares-updated', handleFaresUpdated);
    
    return () => {
      window.removeEventListener('vehicle-created', handleVehicleCreated);
      window.removeEventListener('trip-fares-updated', handleFaresUpdated);
    };
  }, [loadVehicles]);
  
  useEffect(() => {
    loadVehicles();
  }, [refreshTrigger, loadVehicles]);
  
  const handleRefresh = () => {
    loadVehicles(true);
    reloadCabTypes().then(() => {
      console.log("Global cab types refreshed");
    });
  };
  
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (vehicle) {
      resetForm();
      
      setName(vehicle.name || "");
      setIsActive(true);
      
      fetchVehicleDetails(vehicleId);
    }
  };
  
  const fetchVehicleDetails = async (vehicleId: string) => {
    try {
      setIsLoading(true);
      
      console.log(`Fetching details for vehicle: ${vehicleId}`);
      
      // First check if we can find this vehicle in our list
      const vehicle = vehicles.find(v => v.id === vehicleId);
      
      if (vehicle && typeof vehicle === 'object') {
        // Check if we already have all the detailed fields
        if (vehicle.capacity !== undefined && vehicle.basePrice !== undefined) {
          console.log("Using existing vehicle data:", vehicle);
          
          setCapacity(String(vehicle.capacity || "4"));
          setLuggageCapacity(String(vehicle.luggageCapacity || "2"));
          setIsActive(Boolean(vehicle.isActive !== false));
          setDescription(vehicle.description || "");
          setImage(vehicle.image || "/cars/sedan.png");
          setBasePrice(String(vehicle.basePrice || vehicle.price || "0"));
          setPricePerKm(String(vehicle.pricePerKm || "0"));
          setNightHaltCharge(String(vehicle.nightHaltCharge || "700"));
          setDriverAllowance(String(vehicle.driverAllowance || "250"));
          
          return;
        }
      }
      
      // Otherwise use fallback data
      console.log("Using fallback vehicle data");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const vehicleData = {
        capacity: 4,
        luggageCapacity: 2,
        isActive: true,
        description: "Standard vehicle",
        image: "/cars/sedan.png",
        basePrice: 4200,
        pricePerKm: 14,
        nightHaltCharge: 700,
        driverAllowance: 250
      };
      
      setCapacity(String(vehicleData.capacity || ""));
      setLuggageCapacity(String(vehicleData.luggageCapacity || ""));
      setIsActive(Boolean(vehicleData.isActive));
      setDescription(vehicleData.description || "");
      setImage(vehicleData.image || "");
      setBasePrice(String(vehicleData.basePrice || ""));
      setPricePerKm(String(vehicleData.pricePerKm || ""));
      setNightHaltCharge(String(vehicleData.nightHaltCharge || ""));
      setDriverAllowance(String(vehicleData.driverAllowance || ""));
    } catch (error) {
      console.error("Error fetching vehicle details:", error);
      toast.error("Failed to load vehicle details");
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
    setName("");
    setCapacity("");
    setLuggageCapacity("");
    setIsActive(true);
    setDescription("");
    setImage("");
    setBasePrice("");
    setPricePerKm("");
    setNightHaltCharge("");
    setDriverAllowance("");
  };
  
  const resetNewVehicleForm = () => {
    setNewVehicleId("");
    setNewVehicleName("");
    setNewVehicleCapacity("4");
    setNewVehicleLuggageCapacity("2");
    setNewVehicleImage("/cars/sedan.png");
  };
  
  const handleUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle to update");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const vehicleData = {
        id: selectedVehicle,
        vehicleId: selectedVehicle,
        name: name,
        capacity: parseInt(capacity) || 4,
        luggageCapacity: parseInt(luggageCapacity) || 2,
        isActive: isActive,
        description: description,
        image: image || "/cars/sedan.png",
        basePrice: parseFloat(basePrice) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        nightHaltCharge: parseFloat(nightHaltCharge) || 0,
        driverAllowance: parseFloat(driverAllowance) || 0
      };
      
      console.log("Updating vehicle with data:", vehicleData);
      
      await updateVehicle(vehicleData);
      
      clearFareCache();
      
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          vehicleId: selectedVehicle,
          basePrice: parseFloat(basePrice) || 0,
          pricePerKm: parseFloat(pricePerKm) || 0
        }
      }));
      
      toast.success("Vehicle updated successfully");
      
      localStorage.setItem('forceTripFaresRefresh', 'true');
      
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddNewVehicle = async () => {
    if (!newVehicleName) {
      toast.error("Vehicle name is required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const vehicleId = newVehicleId || newVehicleName.toLowerCase().replace(/\s+/g, '_');
      
      const vehicleData = {
        isNew: true,
        vehicleId: vehicleId,
        id: vehicleId,
        name: newVehicleName,
        capacity: parseInt(newVehicleCapacity) || 4,
        luggageCapacity: parseInt(newVehicleLuggageCapacity) || 2,
        isActive: true,
        description: `${newVehicleName} vehicle`,
        image: newVehicleImage || "/cars/sedan.png",
        amenities: ["AC", "Bottle Water", "Music System"],
        price: 0,
        pricePerKm: 0,
        basePrice: 0
      };
      
      console.log("Creating new vehicle with data:", vehicleData);
      
      const { createVehicle } = await import('@/services/directVehicleService');
      const success = await createVehicle(vehicleData);
      
      if (success) {
        clearFareCache();
        
        toast.success("Vehicle created successfully");
        
        localStorage.setItem('forceTripFaresRefresh', 'true');
        
        // Add to local vehicles list immediately for UI feedback
        try {
          let localVehicles = [];
          const storedVehicles = localStorage.getItem('localVehicles');
          
          if (storedVehicles) {
            localVehicles = JSON.parse(storedVehicles);
          }
          
          localVehicles.push(vehicleData);
          localStorage.setItem('localVehicles', JSON.stringify(localVehicles));
        } catch (e) {
          console.error("Error saving to local storage:", e);
        }
        
        setRefreshTrigger(prev => prev + 1);
        
        setAddVehicleOpen(false);
        
        resetNewVehicleForm();
        
        // Force reload all cab data
        await reloadCabTypes();
        
        setSelectedVehicle(vehicleId);
        handleVehicleChange(vehicleId);
      }
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error("Failed to create vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle to delete");
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await deleteVehicle(selectedVehicle);
      
      if (success) {
        toast.success("Vehicle deleted successfully");
        resetForm();
        setSelectedVehicle("");
        
        // Remove from local vehicles list
        try {
          const storedVehicles = localStorage.getItem('localVehicles');
          if (storedVehicles) {
            let localVehicles = JSON.parse(storedVehicles);
            localVehicles = localVehicles.filter((v: any) => v.id !== selectedVehicle);
            localStorage.setItem('localVehicles', JSON.stringify(localVehicles));
          }
        } catch (e) {
          console.error("Error updating local storage:", e);
        }
        
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error("Delete operation returned false");
      }
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === "fares") {
      localStorage.setItem('forceTripFaresRefresh', 'true');
      clearFareCache();
      window.dispatchEvent(new CustomEvent('trip-fares-tab-activated', {
        detail: { 
          timestamp: Date.now(),
          vehicleId: selectedVehicle
        }
      }));
    }
  };
  
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-3/4">
              <label className="text-sm font-medium">Select Vehicle</label>
              <Select value={selectedVehicle} onValueChange={handleVehicleChange}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="self-end mb-[2px]" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh Vehicles</span>
            </Button>
          </div>
          
          <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mt-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-describedby="vehicle-dialog-description">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" /> Add New Vehicle
                </DialogTitle>
                <p id="vehicle-dialog-description" className="text-sm text-muted-foreground">
                  Fill out the details below to add a new vehicle to your fleet.
                </p>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Vehicle Name <span className="text-red-500">*</span></label>
                  <Input 
                    value={newVehicleName} 
                    onChange={(e) => setNewVehicleName(e.target.value)} 
                    placeholder="e.g., Sedan, SUV, etc."
                    required
                  />
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Vehicle ID (optional)</label>
                  <Input 
                    value={newVehicleId} 
                    onChange={(e) => setNewVehicleId(e.target.value)} 
                    placeholder="e.g., sedan, suv (auto-generated if empty)"
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to auto-generate from name</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Passenger Capacity</label>
                    <Input 
                      type="number" 
                      value={newVehicleCapacity} 
                      onChange={(e) => setNewVehicleCapacity(e.target.value)} 
                      placeholder="e.g., 4"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Luggage Capacity</label>
                    <Input 
                      type="number" 
                      value={newVehicleLuggageCapacity} 
                      onChange={(e) => setNewVehicleLuggageCapacity(e.target.value)} 
                      placeholder="e.g., 2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <Input 
                    value={newVehicleImage} 
                    onChange={(e) => setNewVehicleImage(e.target.value)} 
                    placeholder="/cars/sedan.png"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddVehicleOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAddNewVehicle} 
                  disabled={!newVehicleName || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Vehicle"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <Tabs defaultValue="basic" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
            <TabsTrigger value="fares" className="flex-1">Trip Fares</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Basic Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Vehicle Name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g., Sedan, SUV, etc." 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Passenger Capacity</label>
                      <Input 
                        type="number" 
                        value={capacity} 
                        onChange={(e) => setCapacity(e.target.value)} 
                        placeholder="e.g., 4" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Luggage Capacity</label>
                      <Input 
                        type="number" 
                        value={luggageCapacity} 
                        onChange={(e) => setLuggageCapacity(e.target.value)} 
                        placeholder="e.g., 2" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Image URL</label>
                    <Input 
                      value={image} 
                      onChange={(e) => setImage(e.target.value)} 
                      placeholder="/cars/sedan.png" 
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Vehicle description" 
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isActive" 
                      checked={isActive} 
                      onCheckedChange={(checked) => setIsActive(checked === true)} 
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">
                      Active (available for booking)
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="pricing">
            <Card className="bg-white shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Pricing Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Base Price (₹)</label>
                      <Input 
                        type="number" 
                        value={basePrice} 
                        onChange={(e) => setBasePrice(e.target.value)} 
                        placeholder="e.g., 4200" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Price per Km (₹)</label>
                      <Input 
                        type="number" 
                        value={pricePerKm} 
                        onChange={(e) => setPricePerKm(e.target.value)} 
                        placeholder="e.g., 14" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Night Halt Charge (₹)</label>
                      <Input 
                        type="number" 
                        value={nightHaltCharge} 
                        onChange={(e) => setNightHaltCharge(e.target.value)} 
                        placeholder="e.g., 700" 
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Driver Allowance (₹)</label>
                      <Input 
                        type="number" 
                        value={driverAllowance} 
                        onChange={(e) => setDriverAllowance(e.target.value)} 
                        placeholder="e.g., 250" 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="fares">
            {selectedVehicle ? (
              <VehicleTripFaresForm vehicleId={selectedVehicle} />
            ) : (
              <Card className="bg-white shadow-md">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Please select a vehicle to manage trip fares</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-4">
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={!selectedVehicle || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Vehicle
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleUpdate} 
            disabled={!selectedVehicle || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Vehicle"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
