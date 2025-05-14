
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { FleetVehicle, CabType } from "@/types/cab";
import { VehicleService } from "@/services/vehicleService";

interface FleetVehicleAssignmentProps {
  bookingId: string;
  onAssign: (vehicle: FleetVehicle) => void;
}

export function FleetVehicleAssignment({ bookingId, onAssign }: FleetVehicleAssignmentProps) {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const response = await VehicleService.getVehicles();
        // Convert CabType[] to FleetVehicle[] for compatibility
        const fleetVehicles: FleetVehicle[] = response.vehicles
          .filter(vehicle => vehicle.isActive)
          .map(vehicle => ({
            id: vehicle.id,
            vehicleNumber: `AP31AB${Math.floor(1000 + Math.random() * 9000)}`,
            vehicleName: vehicle.name,
            make: "Toyota",
            model: "Innova",
            year: 2023,
            vehicleType: vehicle.id.includes('suv') ? "suv" : "sedan",
            status: "Active",
            fuelType: "Petrol"
          }));
        
        setVehicles(fleetVehicles);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch vehicles", error);
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const assignVehicle = (vehicle: FleetVehicle) => {
    onAssign(vehicle);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium">Assign Vehicle to Booking #{bookingId}</h3>
      
      {loading ? (
        <p>Loading vehicles...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border rounded-lg p-4">
              <h4 className="font-medium">{vehicle.vehicleName}</h4>
              <p className="text-sm text-gray-500">{vehicle.vehicleNumber}</p>
              <p className="text-sm">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <div className="mt-4">
                <Button onClick={() => assignVehicle(vehicle)} size="sm">
                  Assign This Vehicle
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
