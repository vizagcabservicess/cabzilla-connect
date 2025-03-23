import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fareService } from "@/services/fareService";
import { getVehicleTypes } from "@/services/vehicleDataService";
import { Loader2, AlertCircle, RefreshCw, Plus, Car, ServerCrash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiErrorFallback } from "@/components/ApiErrorFallback";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Add a properly defined props interface for the component
interface VehicleTripFaresFormProps {
  vehicleId?: string;
}

export const VehicleTripFaresForm: React.FC<VehicleTripFaresFormProps> = ({ vehicleId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleId || "");
  const [activeTab, setActiveTab] = useState("outstation");
  const [error, setError] = useState<string | null>(null);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [apiError, setApiError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const [newVehicleName, setNewVehicleName] = useState("");
  const [newVehicleId, setNewVehicleId] = useState("");
  const [newVehicleCapacity, setNewVehicleCapacity] = useState("4");
  const [newVehicleLuggageCapacity, setNewVehicleLuggageCapacity] = useState("2");
  const [newVehicleAC, setNewVehicleAC] = useState(true);
  const [newVehicleActive, setNewVehicleActive] = useState(true);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  
  const [outstationOneWayBasePrice, setOutstationOneWayBasePrice] = useState("");
  const [outstationOneWayPricePerKm, setOutstationOneWayPricePerKm] = useState("");
  const [outstationRoundTripBasePrice, setOutstationRoundTripBasePrice] = useState("");
  const [outstationRoundTripPricePerKm, setOutstationRoundTripPricePerKm] = useState("");
  
  const [localHr8Km80, setLocalHr8Km80] = useState("");
  const [localHr10Km100, setLocalHr10Km100] = useState("");
  const [localExtraKmRate, setLocalExtraKmRate] = useState("");
  
  const [airportBasePrice, setAirportBasePrice] = useState("");
  const [airportPricePerKm, setAirportPricePerKm] = useState("");
  const [airportFee, setAirportFee] = useState("");
  
  // Update selected vehicle when vehicleId prop changes
  useEffect(() => {
    if (vehicleId) {
      setSelectedVehicle(vehicleId);
    }
  }, [vehicleId]);
  

  const resetApiError = () => {
    setApiError(null);
    setRetryCount(prev => prev + 1);
  };

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const vehicleList = await getVehicleTypes();
        setVehicles(vehicleList);
        
        console.log("Loaded vehicles for fare management:", vehicleList);
      } catch (error) {
        console.error("Error loading vehicles:", error);
        toast.error("Failed to load vehicles");
        setError("Failed to load vehicle data. Please try refreshing the page.");
      }
    };
    
    loadVehicles();
  }, [retryCount]);

  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    setError(null);
  };

  const makeRequestWithAllFormats = async (data: any, endpoint: string) => {
    // Generate a cache-busting query parameter
    const timestamp = Date.now();
    const url = `${endpoint}?_t=${timestamp}`;
    
    console.log(`Attempting to update fares at ${url} with data:`, data);
    
    // Define the various submission formats we'll try
    const formData = new FormData();
    const urlEncodedData = new URLSearchParams();
    
    // Populate both formats with the same data
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
      urlEncodedData.append(key, data[key]);
    });
    
    // JSON headers
    const jsonHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Force-Refresh': 'true'
    };
    
    // Form data headers
    const formDataHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Force-Refresh': 'true'
    };
    
    // URL encoded form data headers
    const urlEncodedHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Force-Refresh': 'true'
    };
    
    try {
      // First attempt: Axios with JSON
      try {
        const response = await axios.post(url, data, { headers: jsonHeaders });
        console.log("✅ Success with JSON format:", response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.log("❌ Failed with JSON format:", error);
      }
      
      // Second attempt: Axios with FormData
      try {
        const response = await axios.post(url, formData, { headers: formDataHeaders });
        console.log("✅ Success with FormData format:", response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.log("❌ Failed with FormData format:", error);
      }
      
      // Third attempt: Axios with URL Encoded
      try {
        const response = await axios.post(url, urlEncodedData.toString(), { headers: urlEncodedHeaders });
        console.log("✅ Success with URL Encoded format:", response.data);
        return { success: true, data: response.data };
      } catch (error) {
        console.log("❌ Failed with URL Encoded format:", error);
      }
      
      // Fourth attempt: fetch with JSON
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("✅ Success with fetch JSON:", responseData);
          return { success: true, data: responseData };
        }
      } catch (error) {
        console.log("❌ Failed with fetch JSON:", error);
      }
      
      // Fifth attempt: fetch with URL Encoded
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: urlEncodedHeaders,
          body: urlEncodedData
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("✅ Success with fetch URL Encoded:", responseData);
          return { success: true, data: responseData };
        }
      } catch (error) {
        console.log("❌ Failed with fetch URL Encoded:", error);
      }
      
      // If we reach here, all attempts failed
      throw new Error("All update attempts failed");
    } catch (error) {
      console.error("All fare update methods failed:", error);
      return { success: false, error };
    }
  };

  const makeRequestWithFallbacks = async (data: any, endpointPaths: string[]) => {
    // First try the direct endpoint
    const directEndpoint = `${API_BASE_URL}/api/admin/direct-fare-update.php`;
    
    try {
      console.log("🔄 Trying direct fare update endpoint first:", directEndpoint);
      const directResult = await makeRequestWithAllFormats(data, directEndpoint);
      
      if (directResult.success) {
        console.log("✅ Direct fare update succeeded:", directResult.data);
        return directResult;
      }
    } catch (error) {
      console.error("❌ Direct fare update failed:", error);
      // Continue to fallback endpoints
    }
    
    // Try all other fallback endpoints
    const timestamp = Date.now();
    const endpoints = endpointPaths.map(path => {
      if (path.startsWith('http')) {
        return `${path}?_t=${timestamp}`;
      } else {
        return `${API_BASE_URL}${path}?_t=${timestamp}`;
      }
    });
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);
        const result = await makeRequestWithAllFormats(data, endpoint);
        
        if (result.success) {
          console.log(`✅ Update succeeded on ${endpoint}:`, result.data);
          return result;
        }
      } catch (error) {
        console.error(`❌ Error with endpoint ${endpoint}:`, error);
        lastError = error;
      }
    }
    
    // If we reach here, all endpoints failed
    throw lastError || new Error('All endpoints failed');
  };

  const handleOutstationFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiError(null);
    
    try {
      const oneWayBasePrice = parseFloat(outstationOneWayBasePrice) || 0;
      const oneWayPricePerKm = parseFloat(outstationOneWayPricePerKm) || 0;
      const roundTripBasePrice = parseFloat(outstationRoundTripBasePrice) || 0;
      const roundTripPricePerKm = parseFloat(outstationRoundTripPricePerKm) || 0;
      
      console.log("Updating outstation fares for vehicle:", selectedVehicle, {
        oneWay: { basePrice: oneWayBasePrice, pricePerKm: oneWayPricePerKm },
        roundTrip: { basePrice: roundTripBasePrice, pricePerKm: roundTripPricePerKm }
      });
      
      const data = {
        vehicleId: selectedVehicle,
        vehicle_id: selectedVehicle,
        oneWayBasePrice,
        baseFare: oneWayBasePrice,
        oneWayPricePerKm, 
        pricePerKm: oneWayPricePerKm,
        roundTripBasePrice,
        roundTripBaseFare: roundTripBasePrice,
        roundTripPricePerKm,
        tripType: 'outstation'
      };
      
      const endpoints = [
        '/api/admin/outstation-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        fareService.clearCache();
        toast.success("Outstation fares updated successfully");
      } else {
        throw new Error("Failed to update outstation fares");
      }
    } catch (error: any) {
      console.error("Error updating outstation fares:", error);
      toast.error(error.message || "Failed to update outstation fares");
      setError(`Error updating outstation fares: ${error.message || "Unknown error"}`);
      setApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiError(null);
    
    try {
      const hr8km80Price = parseFloat(localHr8Km80);
      const hr10km100Price = parseFloat(localHr10Km100);
      const extraKmRate = parseFloat(localExtraKmRate);
      
      if (isNaN(hr8km80Price) || isNaN(hr10km100Price) || isNaN(extraKmRate)) {
        throw new Error("All prices must be valid numbers");
      }
      
      console.log("Updating local fares for vehicle:", selectedVehicle, {
        hr8km80Price,
        hr10km100Price,
        extraKmRate
      });
      
      const data = {
        vehicleId: selectedVehicle,
        price8hrs80km: hr8km80Price,
        price10hrs100km: hr10km100Price,
        priceExtraKm: extraKmRate,
        hr8km80Price,
        hr10km100Price,
        extraKmRate,
        tripType: 'local'
      };
      
      const endpoints = [
        '/api/admin/local-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        fareService.clearCache();
        toast.success("Local fares updated successfully");
      } else {
        throw new Error("Failed to update local fares");
      }
    } catch (error: any) {
      console.error("Error updating local fares:", error);
      toast.error(error.message || "Failed to update local fares");
      setError(`Error updating local fares: ${error.message || "Unknown error"}`);
      setApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAirportFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiError(null);
    
    try {
      const basePrice = parseFloat(airportBasePrice);
      const pricePerKm = parseFloat(airportPricePerKm);
      const airportFeeValue = parseFloat(airportFee);
      
      if (isNaN(basePrice) || isNaN(pricePerKm)) {
        throw new Error("Base price and price per km must be valid numbers");
      }
      
      console.log("Updating airport fares for vehicle:", selectedVehicle, {
        basePrice,
        pricePerKm,
        airportFee: airportFeeValue
      });
      
      const data = {
        vehicleId: selectedVehicle,
        vehicle_id: selectedVehicle,
        tripType: 'airport',
        baseFare: basePrice,
        basePrice: basePrice,
        pickupFare: basePrice,
        pricePerKm: pricePerKm,
        dropFare: pricePerKm,
        airportFee: airportFeeValue
      };
      
      const endpoints = [
        '/api/admin/airport-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        fareService.clearCache();
        toast.success("Airport fares updated successfully");
      } else {
        throw new Error("Failed to update airport fares");
      }
    } catch (error: any) {
      console.error("Error updating airport fares:", error);
      toast.error(error.message || "Failed to update airport fares");
      setError(`Error updating airport fares: ${error.message || "Unknown error"}`);
      setApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicleName || !newVehicleId) {
      toast.error("Vehicle name and ID are required");
      return;
    }

    setIsAddingVehicle(true);
    setError(null);
    setApiError(null);

    try {
      const vehicleId = newVehicleId || newVehicleName.toLowerCase().replace(/\s+/g, '_');
      
      const vehicleData = {
        vehicleId: vehicleId,
        name: newVehicleName,
        capacity: parseInt(newVehicleCapacity) || 4,
        luggageCapacity: parseInt(newVehicleLuggageCapacity) || 2,
        ac: newVehicleAC,
        isActive: newVehicleActive,
        image: `/cars/${vehicleId}.png`
      };
      
      const endpoints = [
        '/api/admin/vehicles-update.php',
        '/api/admin/vehicles',
        '/api/admin/vehicles/add'
      ];
      
      const result = await makeRequestWithFallbacks(vehicleData, endpoints);
      
      if (result.success) {
        const updatedList = await getVehicleTypes();
        setVehicles(updatedList);
        
        fareService.clearCache();
        
        setNewVehicleName("");
        setNewVehicleId("");
        setNewVehicleCapacity("4");
        setNewVehicleLuggageCapacity("2");
        setNewVehicleAC(true);
        setNewVehicleActive(true);
        setAddVehicleOpen(false);
        
        toast.success("Vehicle added successfully");
        
        setSelectedVehicle(vehicleId);
      } else {
        throw new Error("Failed to add vehicle");
      }
    } catch (error: any) {
      console.error("Error adding vehicle:", error);
      toast.error(error.message || "Failed to add vehicle");
      setError(`Error adding vehicle: ${error.message || "Unknown error"}`);
      setApiError(error);
    } finally {
      setIsAddingVehicle(false);
    }
  };

  // If we have an API error, show the error fallback component
  if (apiError) {
    return (
      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Manage Trip Fares</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiErrorFallback 
            error={apiError} 
            onRetry={resetApiError}
            title="API Connection Error"
            description="We're having trouble connecting to the fare management API. This could be due to network issues or server configuration problems."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Manage Trip Fares</CardTitle>
          <div className="flex gap-2">
            <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new vehicle to add it to your fleet.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vehicleName" className="text-right">
                      Vehicle Name
                    </Label>
                    <Input
                      id="vehicleName"
                      value={newVehicleName}
                      onChange={(e) => setNewVehicleName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. Innova Crysta"
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
                      placeholder="e.g. innova_crysta (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="capacity" className="text-right">
                      Capacity
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
                    <Label htmlFor="ac" className="text-right">
                      AC
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch
                        id="ac"
                        checked={newVehicleAC}
                        onCheckedChange={setNewVehicleAC}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      Active
                    </Label>
                    <div className="col-span-3 flex items-center">
                      <Switch
                        id="isActive"
                        checked={newVehicleActive}
                        onCheckedChange={setNewVehicleActive}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    onClick={handleAddVehicle}
                    disabled={isAddingVehicle || !newVehicleName}
                  >
                    {isAddingVehicle ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Car className="mr-2 h-4 w-4" />
                        Add Vehicle
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-4">
            {!vehicleId && (
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
            )}
            
            <Tabs defaultValue="outstation" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="outstation" className="flex-1">Outstation</TabsTrigger>
                <TabsTrigger value="local" className="flex-1">Local</TabsTrigger>
                <TabsTrigger value="airport" className="flex-1">Airport</TabsTrigger>
              </TabsList>
              
              
              <TabsContent value="outstation">
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">One Way Trip</h3>
                    <div>
                      <label className="text-sm font-medium">Base Price (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="Base price"
                        value={outstationOneWayBasePrice}
                        onChange={(e) => setOutstationOneWayBasePrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Price per Km (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="Price per km"
                        value={outstationOneWayPricePerKm}
                        onChange={(e) => setOutstationOneWayPricePerKm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">Round Trip</h3>
                    <div>
                      <label className="text-sm font-medium">Base Price (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="Base price"
                        value={outstationRoundTripBasePrice}
                        onChange={(e) => setOutstationRoundTripBasePrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Price per Km (₹)</label>
                      <Input 
                        type="number" 
                        placeholder="Price per km"
                        value={outstationRoundTripPricePerKm}
                        onChange={(e) => setOutstationRoundTripPricePerKm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <Button
                  className="mt-4 w-full"
                  onClick={handleOutstationFareUpdate}
                  disabled={!selectedVehicle || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Outstation Fares"
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="local">
                <div className="grid gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">8 Hours / 80 KM Package Price (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Package price"
                      value={localHr8Km80}
                      onChange={(e) => setLocalHr8Km80(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">10 Hours / 100 KM Package Price (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Package price"
                      value={localHr10Km100}
                      onChange={(e) => setLocalHr10Km100(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Extra Km Rate (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Extra km rate"
                      value={localExtraKmRate}
                      onChange={(e) => setLocalExtraKmRate(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button
                  className="mt-4 w-full"
                  onClick={handleLocalFareUpdate}
                  disabled={!selectedVehicle || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Local Fares"
                  )}
                </Button>
              </TabsContent>
              
              <TabsContent value="airport">
                <div className="grid gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Base Price (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Base price"
                      value={airportBasePrice}
                      onChange={(e) => setAirportBasePrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Price per Km (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Price per km"
                      value={airportPricePerKm}
                      onChange={(e) => setAirportPricePerKm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Airport Fee (₹)</label>
                    <Input 
                      type="number" 
                      placeholder="Airport fee"
                      value={airportFee}
                      onChange={(e) => setAirportFee(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button
                  className="mt-4 w-full"
                  onClick={handleAirportFareUpdate}
                  disabled={!selectedVehicle || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Airport Fares"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
