import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FleetVehicle } from '@/types/cab';

interface FleetVehicleAssignmentProps {
  bookingId: string;
  onAssign: (vehicleId: string, driverId?: string) => void;
}

export function FleetVehicleAssignment({ bookingId, onAssign }: FleetVehicleAssignmentProps) {
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>('');
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    // Mock vehicle data
    const mockVehicles: FleetVehicle[] = [
      {
        id: "1",
        vehicleNumber: "AP01AB1234",
        name: "Sedan",
        make: "Honda",
        model: "City",
        year: 2021,
        status: "Active",
        vehicleType: "sedan",
        lastService: "2024-01-15",
        nextServiceDue: "2024-04-15",
        fuelType: "Petrol",
        cabTypeId: "sedan"
      },
      {
        id: "2", 
        vehicleNumber: "AP01CD5678",
        name: "SUV",
        make: "Maruti",
        model: "Ertiga",
        year: 2022,
        status: "Active",
        vehicleType: "ertiga",
        lastService: "2024-02-01",
        nextServiceDue: "2024-05-01",
        fuelType: "Petrol",
        cabTypeId: "ertiga"
      }
    ];
    setVehicles(mockVehicles);

    // Mock driver data
    const mockDrivers = [
      { id: "101", name: "John Doe" },
      { id: "102", name: "Jane Smith" }
    ];
    setDrivers(mockDrivers);
  }, []);

  const handleAssign = () => {
    onAssign(vehicleId, driverId);
  };

  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="vehicleId">Select Vehicle</Label>
        <Select onValueChange={setVehicleId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleNumber} - {vehicle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="driverId">Select Driver (Optional)</Label>
        <Select onValueChange={setDriverId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a driver (optional)" />
          </SelectTrigger>
          <SelectContent>
            {drivers.map((driver) => (
              <SelectItem key={driver.id} value={driver.id}>
                {driver.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleAssign}>Assign Vehicle</Button>
    </div>
  );
}
