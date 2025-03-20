
import React, { useState } from 'react';
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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CabRefreshWarning } from "@/components/cab-options/CabRefreshWarning";

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
  React.useEffect(() => {
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
  
  const handleOutstationFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validate inputs are numeric
      const basePrice = parseFloat(outstationOneWayBasePrice);
      const pricePerKm = parseFloat(outstationOneWayPricePerKm);
      const roundTripBasePrice = parseFloat(outstationRoundTripBasePrice);
      const roundTripPricePerKm = parseFloat(outstationRoundTripPricePerKm);
      
      if (isNaN(basePrice) || isNaN(pricePerKm) || isNaN(roundTripBasePrice) || isNaN(roundTripPricePerKm)) {
        throw new Error("All prices must be valid numbers");
      }
      
      console.log("Updating outstation fares for vehicle:", selectedVehicle, {
        oneWay: { basePrice, pricePerKm },
        roundTrip: { basePrice: roundTripBasePrice, pricePerKm: roundTripPricePerKm }
      });
      
      // Update one-way fares
      const oneWaySuccess = await fareService.updateTripFares(selectedVehicle, "outstation-one-way", {
        basePrice: basePrice,
        pricePerKm: pricePerKm
      });
      
      // Update round trip fares
      const roundTripSuccess = await fareService.updateTripFares(selectedVehicle, "outstation-round-trip", {
        basePrice: roundTripBasePrice,
        pricePerKm: roundTripPricePerKm
      });
      
      if (oneWaySuccess && roundTripSuccess) {
        toast.success("Outstation fares updated successfully");
      } else {
        throw new Error("Failed to update one or more fare types");
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
      
      // Use a direct fetch call to the backend to troubleshoot API issues
      const apiUrl = '/api/admin/vehicle-pricing.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle,
          tripType: 'local',
          price8hrs80km: hr8km80Price,
          price10hrs100km: hr10km100Price,
          priceExtraKm: extraKmRate,
          priceExtraHour: 0 // Default value
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      console.log("API Response:", data);
      
      if (data.status === 'success') {
        toast.success("Local fares updated successfully");
      } else {
        throw new Error(data.message || "Unknown API error");
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
      
      if (isNaN(basePrice) || isNaN(pricePerKm) || isNaN(airportFeeValue)) {
        throw new Error("All prices must be valid numbers");
      }
      
      console.log("Updating airport fares for vehicle:", selectedVehicle, {
        basePrice,
        pricePerKm,
        airportFee: airportFeeValue
      });
      
      const success = await fareService.updateTripFares(selectedVehicle, "airport", {
        basePrice: basePrice,
        pricePerKm: pricePerKm,
        airportFee: airportFeeValue
      });
      
      if (success) {
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
        <CardTitle className="text-xl font-bold">Manage Trip Fares</CardTitle>
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
