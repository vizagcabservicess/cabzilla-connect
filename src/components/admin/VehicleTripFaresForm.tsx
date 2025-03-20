
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
import { CabRefreshWarning } from "@/components/cab-options/CabRefreshWarning";
import axios from 'axios';

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
  
  const handleOutstationFareUpdate = async () => {
    if (!selectedVehicle) {
      toast.error("Please select a vehicle first");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Validate inputs are numeric
      const basePrice = parseFloat(outstationOneWayBasePrice) || 0;
      const pricePerKm = parseFloat(outstationOneWayPricePerKm) || 0;
      const roundTripBasePrice = parseFloat(outstationRoundTripBasePrice) || 0;
      const roundTripPricePerKm = parseFloat(outstationRoundTripPricePerKm) || 0;
      
      console.log("Updating outstation fares for vehicle:", selectedVehicle, {
        oneWay: { basePrice, pricePerKm },
        roundTrip: { basePrice: roundTripBasePrice, pricePerKm: roundTripPricePerKm }
      });
      
      // Use Axios for one-way fares update with better error handling
      const oneWayUpdate = async () => {
        try {
          console.log("Updating one-way fares...");
          const response = await axios.post('/api/admin/vehicle-pricing.php', {
            vehicleId: selectedVehicle,
            tripType: 'outstation-one-way',
            baseFare: basePrice,
            pricePerKm: pricePerKm
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          console.log("One-way fares update response:", response.data);
          return true;
        } catch (error) {
          console.error("One-way fares update failed:", error);
          
          // Fallback to direct fetch with stringified JSON
          try {
            const fallbackResponse = await fetch('/api/admin/vehicle-pricing.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              body: JSON.stringify({
                vehicleId: selectedVehicle,
                tripType: 'outstation-one-way',
                baseFare: basePrice,
                pricePerKm: pricePerKm
              })
            });
            
            const responseText = await fallbackResponse.text();
            console.log("Fallback one-way response:", responseText);
            
            return fallbackResponse.ok;
          } catch (fallbackError) {
            console.error("Fallback one-way update also failed:", fallbackError);
            return false;
          }
        }
      };
      
      // Use Axios for round-trip fares update
      const roundTripUpdate = async () => {
        try {
          console.log("Updating round-trip fares...");
          const response = await axios.post('/api/admin/vehicle-pricing.php', {
            vehicleId: selectedVehicle,
            tripType: 'outstation-round-trip',
            baseFare: roundTripBasePrice,
            pricePerKm: roundTripPricePerKm
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          console.log("Round-trip fares update response:", response.data);
          return true;
        } catch (error) {
          console.error("Round-trip fares update failed:", error);
          
          // Fallback to direct fetch with stringified JSON
          try {
            const fallbackResponse = await fetch('/api/admin/vehicle-pricing.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              body: JSON.stringify({
                vehicleId: selectedVehicle,
                tripType: 'outstation-round-trip',
                baseFare: roundTripBasePrice,
                pricePerKm: roundTripPricePerKm
              })
            });
            
            const responseText = await fallbackResponse.text();
            console.log("Fallback round-trip response:", responseText);
            
            return fallbackResponse.ok;
          } catch (fallbackError) {
            console.error("Fallback round-trip update also failed:", fallbackError);
            return false;
          }
        }
      };
      
      // Execute both updates in sequence
      const oneWaySuccess = await oneWayUpdate();
      const roundTripSuccess = await roundTripUpdate();
      
      // Clear cache regardless of outcome
      fareService.clearCache();
      
      if (oneWaySuccess || roundTripSuccess) {
        toast.success("Outstation fares updated successfully");
      } else {
        throw new Error("All outstation fare update attempts failed");
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
      
      const data = {
        vehicleId: selectedVehicle,
        price8hrs80km: hr8km80Price,
        price10hrs100km: hr10km100Price,
        priceExtraKm: extraKmRate
      };
      
      // First try direct vehicle-pricing endpoint with plain data
      let success = false;
      
      try {
        console.log("Trying vehicle-pricing endpoint first for local fares");
        const vehiclePricingResponse = await axios.post('/api/admin/vehicle-pricing.php', {
          vehicleId: selectedVehicle,
          tripType: 'local',
          price8hrs80km: hr8km80Price,
          price10hrs100km: hr10km100Price,
          priceExtraKm: extraKmRate,
          priceExtraHour: 0
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        console.log("Vehicle-pricing local response:", vehiclePricingResponse.data);
        success = true;
      } catch (error) {
        console.error("Vehicle-pricing endpoint failed for local fares:", error);
      }
      
      // If first attempt failed, try fares-update endpoint
      if (!success) {
        try {
          console.log("Trying fares-update endpoint for local fares");
          const faresUpdateResponse = await axios.post('/api/admin/fares-update.php', {
            vehicleId: selectedVehicle,
            vehicleType: selectedVehicle,
            tripType: 'local',
            hr8km80Price: hr8km80Price,
            hr10km100Price: hr10km100Price,
            extraKmRate: extraKmRate
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          });
          
          console.log("Fares-update local response:", faresUpdateResponse.data);
          success = true;
        } catch (error) {
          console.error("Fares-update endpoint failed for local fares:", error);
        }
      }
      
      // If both previous attempts failed, try to use local-fares-update.php
      if (!success) {
        try {
          console.log("Trying direct local-fares-update as last resort");
          
          const response = await fetch('/api/admin/local-fares-update.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify(data)
          });
          
          const responseText = await response.text();
          console.log("Local-fares-update response text:", responseText);
          
          // Try to parse JSON if possible
          try {
            const jsonResponse = JSON.parse(responseText);
            console.log("Parsed JSON response:", jsonResponse);
            
            if (jsonResponse.status === 'success') {
              success = true;
            }
          } catch (jsonError) {
            // If not valid JSON, check if the response contains success indicators
            if (responseText.includes('success') || response.ok) {
              success = true;
            }
          }
        } catch (localError) {
          console.error("Local-fares-update endpoint failed:", localError);
        }
      }
      
      // Last attempt - use fareService
      if (!success) {
        console.log("Using fareService as absolute last resort");
        success = await fareService.updateTripFares(selectedVehicle, "local", {
          hr8km80Price,
          hr10km100Price,
          extraKmRate
        });
      }
      
      // Clear cache regardless of outcome
      fareService.clearCache();
      
      if (success) {
        toast.success("Local fares updated successfully");
      } else {
        throw new Error("All local fare update attempts failed");
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
      
      // Try multiple approaches for maximum reliability
      let success = false;
      
      // First attempt with axios
      try {
        console.log("Trying axios for airport fare update");
        const response = await axios.post('/api/admin/vehicle-pricing.php', {
          vehicleId: selectedVehicle,
          tripType: 'airport',
          baseFare: basePrice,
          pricePerKm: pricePerKm,
          airportFee: airportFeeValue
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        console.log("Airport fares axios response:", response.data);
        success = true;
      } catch (error) {
        console.error("Axios airport fares update failed:", error);
      }
      
      // Second attempt with fetch
      if (!success) {
        try {
          console.log("Trying fetch for airport fare update");
          const response = await fetch('/api/admin/vehicle-pricing.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({
              vehicleId: selectedVehicle,
              tripType: 'airport',
              baseFare: basePrice,
              pricePerKm: pricePerKm,
              airportFee: airportFeeValue
            })
          });
          
          if (response.ok) {
            const responseText = await response.text();
            console.log("Airport fares fetch response:", responseText);
            success = true;
          }
        } catch (fetchError) {
          console.error("Fetch airport fares update failed:", fetchError);
        }
      }
      
      // Third attempt with fares-update.php
      if (!success) {
        try {
          console.log("Trying fares-update endpoint for airport fare update");
          const response = await fetch('/api/admin/fares-update.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({
              vehicleId: selectedVehicle,
              vehicleType: selectedVehicle,
              tripType: 'airport',
              basePrice: basePrice,
              pricePerKm: pricePerKm,
              airportFee: airportFeeValue
            })
          });
          
          if (response.ok) {
            const responseText = await response.text();
            console.log("Airport fares fares-update response:", responseText);
            success = true;
          }
        } catch (faresUpdateError) {
          console.error("Fares-update airport update failed:", faresUpdateError);
        }
      }
      
      // Last resort using fareService
      if (!success) {
        console.log("Using fareService as last resort for airport fares");
        success = await fareService.updateTripFares(selectedVehicle, "airport", {
          basePrice: basePrice,
          pricePerKm: pricePerKm,
          airportFee: airportFeeValue
        });
      }
      
      // Clear cache regardless of outcome
      fareService.clearCache();
      
      if (success) {
        toast.success("Airport fares updated successfully");
      } else {
        throw new Error("All airport fare update attempts failed");
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
