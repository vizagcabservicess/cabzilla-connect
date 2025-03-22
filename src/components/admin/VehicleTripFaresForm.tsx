
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from 'axios';

// Base URL for API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const VehicleTripFaresForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [activeTab, setActiveTab] = useState("outstation");
  const [error, setError] = useState<string | null>(null);
  
  // Outstation fare state
  const [outstationOneWayBasePrice, setOutstationOneWayBasePrice] = useState("");
  const [outstationOneWayPricePerKm, setOutstationOneWayPricePerKm] = useState("");
  const [outstationRoundTripBasePrice, setOutstationRoundTripBasePrice] = useState("");
  const [outstationRoundTripPricePerKm, setOutstationRoundTripPricePerKm] = useState("");
  
  // Local fare state
  const [localHr8Km80, setLocalHr8Km80] = useState("");
  const [localHr10Km100, setLocalHr10Km100] = useState("");
  const [localExtraKmRate, setLocalExtraKmRate] = useState("");
  
  // Airport fare state
  const [airportBasePrice, setAirportBasePrice] = useState("");
  const [airportPricePerKm, setAirportPricePerKm] = useState("");
  const [airportFee, setAirportFee] = useState("");
  
  // Load vehicles on mount
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
  }, []);
  
  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
    setError(null);
  };

  // Helper function to make a request with multiple fallbacks
  const makeRequestWithFallbacks = async (data: any, endpointPaths: string[], customHeaders: Record<string, string> = {}) => {
    // Add cache busting timestamp
    const timestamp = Date.now();
    const endpoints = endpointPaths.map(path => {
      // Add full URL if needed, otherwise use relative path
      if (path.startsWith('http')) {
        return `${path}?_t=${timestamp}`;
      } else {
        return `${path}?_t=${timestamp}`;
      }
    });
    
    // Try API Base URL + endpoint first if available
    if (API_BASE_URL) {
      endpoints.unshift(`${API_BASE_URL}${endpointPaths[0]}?_t=${timestamp}`);
    }
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Force-Refresh': 'true'
    };
    
    const headers = { ...defaultHeaders, ...customHeaders };
    
    let lastError: any = null;
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint} with data:`, data);
        
        // Try Axios first
        try {
          const response = await axios.post(endpoint, data, { headers });
          console.log(`Response from ${endpoint}:`, response.data);
          return { success: true, data: response.data };
        } catch (axiosError: any) {
          console.log(`Axios error on ${endpoint}:`, axiosError.response || axiosError);
          
          // If it's a network error, try fetch as fallback
          if (axiosError.message && axiosError.message.includes('Network Error')) {
            const fetchResponse = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(data)
            });
            
            if (fetchResponse.ok) {
              const responseData = await fetchResponse.json();
              console.log(`Fetch succeeded on ${endpoint}:`, responseData);
              return { success: true, data: responseData };
            }
            
            throw new Error(`Fetch failed with status: ${fetchResponse.status}`);
          } else {
            throw axiosError;
          }
        }
      } catch (error: any) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        lastError = error;
      }
    }
    
    // All endpoints failed, throw the last error
    throw lastError || new Error('All endpoints failed');
  };
  
  const handleOutstationFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validate inputs are numeric
      const oneWayBasePrice = parseFloat(outstationOneWayBasePrice) || 0;
      const oneWayPricePerKm = parseFloat(outstationOneWayPricePerKm) || 0;
      const roundTripBasePrice = parseFloat(outstationRoundTripBasePrice) || 0;
      const roundTripPricePerKm = parseFloat(outstationRoundTripPricePerKm) || 0;
      
      console.log("Updating outstation fares for vehicle:", selectedVehicle, {
        oneWay: { basePrice: oneWayBasePrice, pricePerKm: oneWayPricePerKm },
        roundTrip: { basePrice: roundTripBasePrice, pricePerKm: roundTripPricePerKm }
      });
      
      // Prepare data object
      const data = {
        vehicleId: selectedVehicle,
        oneWayBasePrice: oneWayBasePrice,
        oneWayPricePerKm: oneWayPricePerKm,
        roundTripBasePrice: roundTripBasePrice,
        roundTripPricePerKm: roundTripPricePerKm
      };
      
      // Try multiple endpoints for maximum compatibility
      const endpoints = [
        '/api/admin/outstation-fares-update',
        '/api/admin/outstation-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        // Clear cache to ensure fresh data
        fareService.clearCache();
        toast.success("Outstation fares updated successfully");
      } else {
        throw new Error("Failed to update outstation fares");
      }
    } catch (error: any) {
      console.error("Error updating outstation fares:", error);
      toast.error(error.message || "Failed to update outstation fares");
      setError(`Error updating outstation fares: ${error.message || "Unknown error"}`);
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
    
    try {
      // Validate inputs are numeric
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
      
      // Prepare data object with multiple field name variations for compatibility
      const data = {
        vehicleId: selectedVehicle,
        price8hrs80km: hr8km80Price,
        price10hrs100km: hr10km100Price,
        priceExtraKm: extraKmRate,
        hr8km80Price, // Alternative field name
        hr10km100Price, // Alternative field name
        extraKmRate, // Alternative field name
        tripType: 'local'
      };
      
      // Try multiple endpoints for maximum compatibility
      const endpoints = [
        '/api/admin/local-fares-update',
        '/api/admin/local-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        // Clear cache to ensure fresh data
        fareService.clearCache();
        toast.success("Local fares updated successfully");
      } else {
        throw new Error("Failed to update local fares");
      }
    } catch (error: any) {
      console.error("Error updating local fares:", error);
      toast.error(error.message || "Failed to update local fares");
      setError(`Error updating local fares: ${error.message || "Unknown error"}`);
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
    
    try {
      // Validate inputs are numeric
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
      
      // Prepare data object with multiple field name variations for compatibility
      const data = {
        vehicleId: selectedVehicle,
        tripType: 'airport',
        baseFare: basePrice,
        basePrice: basePrice, // Alternative field name
        pickupFare: basePrice, // Alternative field name for airport transfers
        pricePerKm: pricePerKm,
        dropFare: pricePerKm, // Alternative field name for airport transfers
        airportFee: airportFeeValue
      };
      
      // Try multiple endpoints for maximum compatibility
      const endpoints = [
        '/api/admin/airport-fares-update',
        '/api/admin/airport-fares-update.php',
        '/api/admin/vehicle-pricing.php',
        '/api/admin/fares-update.php'
      ];
      
      const result = await makeRequestWithFallbacks(data, endpoints);
      
      if (result.success) {
        // Clear cache to ensure fresh data
        fareService.clearCache();
        toast.success("Airport fares updated successfully");
      } else {
        throw new Error("Failed to update airport fares");
      }
    } catch (error: any) {
      console.error("Error updating airport fares:", error);
      toast.error(error.message || "Failed to update airport fares");
      setError(`Error updating airport fares: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">Manage Trip Fares</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="ml-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
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
            
            <Tabs defaultValue="outstation" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="outstation" className="flex-1">Outstation</TabsTrigger>
                <TabsTrigger value="local" className="flex-1">Local</TabsTrigger>
                <TabsTrigger value="airport" className="flex-1">Airport</TabsTrigger>
              </TabsList>
              
              {/* Outstation Tab */}
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
              
              {/* Local Tab */}
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
              
              {/* Airport Tab */}
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
