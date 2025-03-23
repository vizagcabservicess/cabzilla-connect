import React, { useState, useEffect } from 'react';
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
import { Loader2, Trash2 } from "lucide-react";
import { getVehicleTypes, updateVehicle, deleteVehicle } from "@/services/vehicleDataService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { VehicleTripFaresForm } from './VehicleTripFaresForm';
import { clearFareCache } from '@/lib/fareCalculationService';

export const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Basic info state
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [luggageCapacity, setLuggageCapacity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  
  // Pricing state
  const [basePrice, setBasePrice] = useState("");
  const [pricePerKm, setPricePerKm] = useState("");
  const [nightHaltCharge, setNightHaltCharge] = useState("");
  const [driverAllowance, setDriverAllowance] = useState("");
  
  // Other state
  const [activeTab, setActiveTab] = useState("basic");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    loadVehicles();
  }, [refreshTrigger]);
  
  const loadVehicles = async () => {
    try {
      console.log("Loading vehicles for management UI");
      const vehicleList = await getVehicleTypes();
      setVehicles(vehicleList);
      
      console.log("Successfully loaded vehicles:", vehicleList);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast.error("Failed to load vehicles");
    }
  };
  
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicle(vehicleId);
    
    // Find the selected vehicle in the list
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (vehicle) {
      // Clear previous values
      resetForm();
      
      // Set basic info
      setName(vehicle.name || "");
      setIsActive(true); // Default to active
      
      // Load full vehicle details 
      fetchVehicleDetails(vehicleId);
    }
  };
  
  const fetchVehicleDetails = async (vehicleId: string) => {
    try {
      setIsLoading(true);
      
      // For now, we're just using placeholder data until we implement the API
      // This would typically fetch from an API endpoint
      console.log(`Fetching details for vehicle: ${vehicleId}`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // This is a placeholder. In a real implementation, you would fetch from an API
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
      
      // Set form values
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
      
      // Clear all fare caches
      clearFareCache();
      
      // Notify about the trip fare update
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          vehicleId: selectedVehicle,
          basePrice: parseFloat(basePrice) || 0,
          pricePerKm: parseFloat(pricePerKm) || 0
        }
      }));
      
      toast.success("Vehicle updated successfully");
      
      // Set global flag to force trip fares refresh
      localStorage.setItem('forceTripFaresRefresh', 'true');
      
      // Refresh the vehicles list
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle");
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
        
        // Refresh the vehicles list
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
  
  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // If switching to Trip Fares tab, force refresh trip fares
    if (value === "fares") {
      // Set a flag to force trip fares refresh
      localStorage.setItem('forceTripFaresRefresh', 'true');
      
      // Clear fare caches
      clearFareCache();
      
      // Notify about the tab change
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
        <div>
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
        
        <Tabs defaultValue="basic" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
            <TabsTrigger value="fares" className="flex-1">Trip Fares</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
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
          
          {/* Pricing Tab */}
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
          
          {/* Trip Fares Tab */}
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
