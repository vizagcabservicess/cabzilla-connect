import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';
import { VehiclePricingUpdateRequest, FareUpdateRequest } from '@/types/api';

export function VehicleFareManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [nightHaltCharge, setNightHaltCharge] = useState('');
  const [driverAllowance, setDriverAllowance] = useState('');
  const [selectedTour, setSelectedTour] = useState('');
  const [sedan, setSedan] = useState('');
  const [ertiga, setErtiga] = useState('');
  const [innova, setInnova] = useState('');
  const [tempo, setTempo] = useState('');
  const [luxury, setLuxury] = useState('');
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fleetAPI.getVehicles();
        setVehicles(response);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      }
    };

    const fetchTours = async () => {
      try {
        const response = await vehicleAPI.getTours();
        setTours(response);
      } catch (error) {
        console.error("Error fetching tours:", error);
      }
    };

    fetchVehicles();
    fetchTours();
  }, []);

  const handleUpdateVehicleFare = async () => {
    try {
      setIsLoading(true);
      
      const updateData: VehiclePricingUpdateRequest = {
        vehicleId: Number(selectedVehicle),
        vehicleType: selectedVehicleType,
        basePrice: Number(basePrice),
        pricePerKm: Number(pricePerKm),
        perKmRate: Number(pricePerKm),
        nightHaltCharge: Number(nightHaltCharge),
        driverAllowance: Number(driverAllowance),
      };

      await vehicleAPI.updateVehiclePricing(updateData);

      toast({
        title: "Vehicle fare updated",
        description: "Vehicle fare has been updated successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating vehicle fare",
        description: "Failed to update vehicle fare."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTourFare = async () => {
    try {
      setIsLoading(true);
      
      const updateData: FareUpdateRequest = {
        vehicleType: 'tour', // Add required vehicleType
        tourId: selectedTour,
        sedan: Number(sedan),
        ertiga: Number(ertiga),
        innova: Number(innova),
        tempo: Number(tempo),
        luxury: Number(luxury),
      };

      await vehicleAPI.updateTourFare(updateData);

      toast({
        title: "Tour fare updated",
        description: "Tour fare has been updated successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating tour fare",
        description: "Failed to update tour fare."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Vehicle Fare Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Update Vehicle Fare</CardTitle>
          <CardDescription>Update fare for a specific vehicle</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select onValueChange={(value) => setSelectedVehicle(value)} defaultValue={selectedVehicle}>
              <SelectTrigger className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle Type</Label>
            <Input
              id="vehicleType"
              type="text"
              value={selectedVehicleType}
              onChange={(e) => setSelectedVehicleType(e.target.value)}
              placeholder="Enter vehicle type"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price</Label>
            <Input
              id="basePrice"
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="Enter base price"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricePerKm">Price Per KM</Label>
            <Input
              id="pricePerKm"
              type="number"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(e.target.value)}
              placeholder="Enter price per KM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nightHaltCharge">Night Halt Charge</Label>
            <Input
              id="nightHaltCharge"
              type="number"
              value={nightHaltCharge}
              onChange={(e) => setNightHaltCharge(e.target.value)}
              placeholder="Enter night halt charge"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverAllowance">Driver Allowance</Label>
            <Input
              id="driverAllowance"
              type="number"
              value={driverAllowance}
              onChange={(e) => setDriverAllowance(e.target.value)}
              placeholder="Enter driver allowance"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpdateVehicleFare} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Vehicle Fare"}
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Update Tour Fare</CardTitle>
          <CardDescription>Update fare for a specific tour</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tour">Tour</Label>
            <Select onValueChange={(value) => setSelectedTour(value)} defaultValue={selectedTour}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a tour" />
              </SelectTrigger>
              <SelectContent>
                {tours.map((tour) => (
                  <SelectItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sedan">Sedan</Label>
            <Input
              id="sedan"
              type="number"
              value={sedan}
              onChange={(e) => setSedan(e.target.value)}
              placeholder="Enter sedan fare"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ertiga">Ertiga</Label>
            <Input
              id="ertiga"
              type="number"
              value={ertiga}
              onChange={(e) => setErtiga(e.target.value)}
              placeholder="Enter ertiga fare"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="innova">Innova</Label>
            <Input
              id="innova"
              type="number"
              value={innova}
              onChange={(e) => setInnova(e.target.value)}
              placeholder="Enter innova fare"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo</Label>
            <Input
              id="tempo"
              type="number"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              placeholder="Enter tempo fare"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="luxury">Luxury</Label>
            <Input
              id="luxury"
              type="number"
              value={luxury}
              onChange={(e) => setLuxury(e.target.value)}
              placeholder="Enter luxury fare"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpdateTourFare} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Tour Fare"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
