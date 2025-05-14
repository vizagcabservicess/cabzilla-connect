
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FleetVehicle } from "@/types/cab";

interface VehicleAssignmentProps {
  bookingId: string;
  onAssign: (vehicle: FleetVehicle) => void;
}

export function VehicleAssignment({ bookingId, onAssign }: VehicleAssignmentProps) {
  const handleAssignVehicle = () => {
    // Mock vehicle data for demonstration
    const mockVehicle: FleetVehicle = {
      id: `veh-${Date.now()}`,
      vehicleNumber: `AP31AB${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleName: "Test Vehicle",
      make: "Toyota",
      model: "Innova",
      year: 2023,
      vehicleType: "suv",
      status: "Active",
      fuelType: "Petrol" // Added required field
    };
    onAssign(mockVehicle);
  };

  const handleAssignAnotherVehicle = () => {
    // Mock another vehicle data for demonstration
    const mockVehicle: FleetVehicle = {
      id: `veh-${Date.now()}`,
      vehicleNumber: `AP31AB${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleName: "Another Test Vehicle",
      make: "Maruti",
      model: "Swift",
      year: 2022,
      vehicleType: "sedan",
      status: "Active",
      fuelType: "Diesel" // Added required field
    };
    onAssign(mockVehicle);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Assignment</CardTitle>
        <CardDescription>Assign a vehicle to booking {bookingId}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Click the button below to assign a vehicle:</p>
        <Button onClick={handleAssignVehicle}>Assign Vehicle</Button>
        <Button onClick={handleAssignAnotherVehicle}>Assign Another Vehicle</Button>
      </CardContent>
    </Card>
  );
}
