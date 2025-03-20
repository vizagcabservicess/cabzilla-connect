import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVehicleTypes, updateVehicle, deleteVehicle } from "@/services/vehicleDataService";
import { VehicleTripFaresForm } from './VehicleTripFaresForm';
import { VehicleSelector } from './vehicle-forms/VehicleSelector';
import { BasicInfoForm } from './vehicle-forms/BasicInfoForm';
import { PricingForm } from './vehicle-forms/PricingForm';
import { ActionButtons } from './vehicle-forms/ActionButtons';

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
      toast.success("Vehicle updated successfully");
      
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
  
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4">
        <VehicleSelector 
          vehicles={vehicles} 
          selectedVehicle={selectedVehicle} 
          onVehicleChange={handleVehicleChange} 
        />
        
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing" className="flex-1">Pricing</TabsTrigger>
            <TabsTrigger value="fares" className="flex-1">Trip Fares</TabsTrigger>
          </TabsList>
          
          {/* Basic Info Tab */}
          <TabsContent value="basic">
            <BasicInfoForm 
              name={name}
              setName={setName}
              capacity={capacity}
              setCapacity={setCapacity}
              luggageCapacity={luggageCapacity}
              setLuggageCapacity={setLuggageCapacity}
              isActive={isActive}
              setIsActive={setIsActive}
              description={description}
              setDescription={setDescription}
              image={image}
              setImage={setImage}
            />
          </TabsContent>
          
          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <PricingForm 
              basePrice={basePrice}
              setBasePrice={setBasePrice}
              pricePerKm={pricePerKm}
              setPricePerKm={setPricePerKm}
              nightHaltCharge={nightHaltCharge}
              setNightHaltCharge={setNightHaltCharge}
              driverAllowance={driverAllowance}
              setDriverAllowance={setDriverAllowance}
            />
          </TabsContent>
          
          {/* Trip Fares Tab */}
          <TabsContent value="fares">
            <VehicleTripFaresForm />
          </TabsContent>
        </Tabs>
        
        <ActionButtons 
          isLoading={isLoading}
          selectedVehicle={selectedVehicle}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};
