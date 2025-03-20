
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
import { Loader2 } from "lucide-react";

export const VehicleTripFaresForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [activeTab, setActiveTab] = useState("outstation");
  
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
      }
    };
    
    loadVehicles();
  }, []);
  
  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
  };
  
  const handleOutstationFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    
    try {
      // Update one-way fares
      const oneWaySuccess = await fareService.updateTripFares(selectedVehicle, "outstation-one-way", {
        basePrice: parseFloat(outstationOneWayBasePrice) || 0,
        pricePerKm: parseFloat(outstationOneWayPricePerKm) || 0
      });
      
      // Update round trip fares
      const roundTripSuccess = await fareService.updateTripFares(selectedVehicle, "outstation-round-trip", {
        basePrice: parseFloat(outstationRoundTripBasePrice) || 0,
        pricePerKm: parseFloat(outstationRoundTripPricePerKm) || 0
      });
      
      if (oneWaySuccess && roundTripSuccess) {
        toast.success("Outstation fares updated successfully");
      }
    } catch (error) {
      console.error("Error updating outstation fares:", error);
      toast.error("Failed to update outstation fares");
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
    
    try {
      const success = await fareService.updateTripFares(selectedVehicle, "local", {
        hr8km80Price: parseFloat(localHr8Km80) || 0,
        hr10km100Price: parseFloat(localHr10Km100) || 0,
        extraKmRate: parseFloat(localExtraKmRate) || 0
      });
      
      if (success) {
        toast.success("Local fares updated successfully");
      }
    } catch (error) {
      console.error("Error updating local fares:", error);
      toast.error("Failed to update local fares");
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
    
    try {
      const success = await fareService.updateTripFares(selectedVehicle, "airport", {
        basePrice: parseFloat(airportBasePrice) || 0,
        pricePerKm: parseFloat(airportPricePerKm) || 0,
        airportFee: parseFloat(airportFee) || 0
      });
      
      if (success) {
        toast.success("Airport fares updated successfully");
      }
    } catch (error) {
      console.error("Error updating airport fares:", error);
      toast.error("Failed to update airport fares");
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
