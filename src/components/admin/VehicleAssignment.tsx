import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FleetVehicle } from '@/types/cab';

interface AssignmentForm {
  vehicleId: string;
  driverId: string;
}

export function VehicleAssignment() {
  const [formValues, setFormValues] = useState<AssignmentForm>({
    vehicleId: '',
    driverId: ''
  });
  const [drivers, setDrivers] = useState([
    { id: '1', name: 'Driver 1' },
    { id: '2', name: 'Driver 2' }
  ]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);

  useEffect(() => {
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
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormValues({
      ...formValues,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form values submitted:', formValues);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Vehicle Assignment</h1>
      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="mb-4">
          <Label htmlFor="vehicleId" className="block text-gray-700 text-sm font-bold mb-2">
            Vehicle
          </Label>
          <Select
            id="vehicleId"
            name="vehicleId"
            onValueChange={(value) => handleChange({ target: { name: 'vehicleId', value } } as any)}
            defaultValue={formValues.vehicleId}
          >
            <SelectTrigger className="w-full">
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
        <div className="mb-4">
          <Label htmlFor="driverId" className="block text-gray-700 text-sm font-bold mb-2">
            Driver
          </Label>
          <Select
            id="driverId"
            name="driverId"
            onValueChange={(value) => handleChange({ target: { name: 'driverId', value } } as any)}
            defaultValue={formValues.driverId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a driver" />
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
        <Button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Assign
        </Button>
      </form>
    </div>
  );
}
