
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Booking } from '@/types/api';
import { FleetVehicle } from '@/types/cab';
import { fleetAPI } from '@/services/api/fleetAPI';

interface VehicleAssignmentProps {
  booking: Booking;
  onAssign: (vehicleData: { vehicleNumber: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function VehicleAssignment({ booking, onAssign, isSubmitting }: VehicleAssignmentProps) {
  const [availableVehicles, setAvailableVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(false);
  const [isAssigningVehicle, setIsAssigningVehicle] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableVehicles();
  }, []);

  const fetchAvailableVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      setError(null);
      
      // Get all vehicles including inactive ones to show a comprehensive list
      const response = await fleetAPI.getVehicles(true);
      
      if (response && response.vehicles) {
        console.log("Fetched vehicles for assignment:", response.vehicles);
        setAvailableVehicles(response.vehicles);
      } else {
        throw new Error("Invalid response format from fleet API");
      }
    } catch (error) {
      console.error("Error fetching available vehicles:", error);
      setError("Failed to load available vehicles");
      toast.error("Failed to load available vehicles");
      
      // Provide fallback mock data in case of API failure
      setAvailableVehicles([
        {
          id: "v-mock-001",
          vehicleNumber: "KA01AB1234",
          make: "Toyota",
          model: "Innova Crysta",
          year: 2022,
          vehicleType: "innova_crysta",
          status: "Active",
          lastService: "2023-01-15",
          fuelType: "Diesel",
          seatingCapacity: 7,
          // Removed mileage property as it doesn't exist in FleetVehicle type
          currentOdometer: 25000 // Using currentOdometer instead which is in the FleetVehicle type
        },
        {
          id: "v-mock-002",
          vehicleNumber: "KA02CD5678",
          make: "Maruti Suzuki",
          model: "Swift Dzire",
          year: 2021,
          vehicleType: "sedan",
          status: "Active",
          lastService: "2023-02-20",
          fuelType: "Petrol",
          seatingCapacity: 5,
          // Removed mileage property as it doesn't exist in FleetVehicle type
          currentOdometer: 15000 // Using currentOdometer instead which is in the FleetVehicle type
        }
      ]);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
  };

  const handleAssignVehicleToBooking = async () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    try {
      setIsAssigningVehicle(true);
      
      // Find the selected vehicle to get its number
      const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        throw new Error("Selected vehicle not found");
      }
      
      // Assign the vehicle to the booking
      await fleetAPI.assignVehicleToBooking(booking.id.toString(), selectedVehicleId);
      
      // Call the onAssign function with the vehicle details
      await onAssign({
        vehicleNumber: selectedVehicle.vehicleNumber
      });
      
      toast.success("Vehicle assigned successfully");
      
      // Reset selection
      setSelectedVehicleId('');
      
      // Refresh available vehicles
      fetchAvailableVehicles();
      
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      toast.error("Failed to assign vehicle to booking");
    } finally {
      setIsAssigningVehicle(false);
    }
  };

  // Helper function to format vehicle display name
  const formatVehicleDisplay = (vehicle: FleetVehicle) => {
    return `${vehicle.vehicleNumber} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Assign Vehicle</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="fleetVehicle">Select Fleet Vehicle</Label>
          <Select
            value={selectedVehicleId}
            onValueChange={handleVehicleSelect}
            disabled={isLoadingVehicles}
          >
            <SelectTrigger id="fleetVehicle" className="w-full">
              <SelectValue placeholder={isLoadingVehicles ? "Loading vehicles..." : "Select a vehicle"} />
            </SelectTrigger>
            <SelectContent>
              {availableVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {formatVehicleDisplay(vehicle)}
                </SelectItem>
              ))}
              {availableVehicles.length === 0 && !isLoadingVehicles && (
                <SelectItem value="none" disabled>No available vehicles</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {availableVehicles.length} vehicles available
            {error && <span className="text-red-500 ml-2">{error}</span>}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleAssignVehicleToBooking}
            disabled={!selectedVehicleId || isAssigningVehicle || isSubmitting}
          >
            {isAssigningVehicle ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
                Assigning...
              </>
            ) : "Assign Vehicle"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
