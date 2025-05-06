
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Booking } from '@/types/api';
import { FleetVehicle } from '@/types/cab';
import { fleetAPI } from '@/services/api/fleetAPI';
import { Loader2 } from 'lucide-react';

interface FleetVehicleAssignmentProps {
  booking: Booking;
  onAssign: (vehicleData: { vehicleNumber: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function FleetVehicleAssignment({ booking, onAssign, isSubmitting }: FleetVehicleAssignmentProps) {
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(false);
  const [isAssigningVehicle, setIsAssigningVehicle] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFleetVehicles();
  }, []);

  const fetchFleetVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      setError(null);
      
      console.log("Fetching fleet vehicles for assignment");
      
      // Use the fleetAPI service to fetch vehicles (will use direct-vehicle-modify.php?action=load)
      const response = await fleetAPI.getVehicles(true);
      
      if (response && response.vehicles && Array.isArray(response.vehicles) && response.vehicles.length > 0) {
        console.log("Fetched fleet vehicles for assignment:", response.vehicles);
        setFleetVehicles(response.vehicles);
      } else {
        setError("Could not load fleet vehicles. Please try again.");
        toast.error("Failed to load fleet vehicles");
      }
    } catch (error) {
      console.error("Error fetching fleet vehicles:", error);
      setError("Failed to load fleet vehicles. Please try again.");
      toast.error("Failed to load fleet vehicles");
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
      const selectedVehicle = fleetVehicles.find(v => v.id === selectedVehicleId);
      if (!selectedVehicle) {
        throw new Error("Selected vehicle not found");
      }
      
      // Assign the vehicle to the booking
      await fleetAPI.assignVehicleToBooking(booking.id.toString(), selectedVehicleId);
      
      // Call the onAssign function with the vehicle details
      await onAssign({
        vehicleNumber: selectedVehicle.vehicleNumber
      });
      
      toast.success("Fleet vehicle assigned successfully");
      
      // Reset selection
      setSelectedVehicleId('');
      
    } catch (error) {
      console.error("Error assigning fleet vehicle:", error);
      toast.error("Failed to assign fleet vehicle to booking");
    } finally {
      setIsAssigningVehicle(false);
    }
  };

  const retryFetchVehicles = () => {
    fetchFleetVehicles();
  };

  // Helper function to format vehicle display name
  const formatVehicleDisplay = (vehicle: FleetVehicle) => {
    return `${vehicle.vehicleNumber} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`;
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Assign Fleet Vehicle</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="fleetVehicle">Select Fleet Vehicle</Label>
          <Select
            value={selectedVehicleId}
            onValueChange={handleVehicleSelect}
            disabled={isLoadingVehicles}
          >
            <SelectTrigger id="fleetVehicle" className="w-full">
              <SelectValue placeholder={isLoadingVehicles ? "Loading fleet vehicles..." : "Select a fleet vehicle"} />
            </SelectTrigger>
            <SelectContent>
              {fleetVehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {formatVehicleDisplay(vehicle)}
                </SelectItem>
              ))}
              {fleetVehicles.length === 0 && !isLoadingVehicles && (
                <SelectItem value="none" disabled>No available fleet vehicles</SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {fleetVehicles.length} fleet vehicles available
              {error && <span className="text-red-500 ml-2">{error}</span>}
            </p>
            {error && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryFetchVehicles}
                className="text-xs"
                disabled={isLoadingVehicles}
              >
                {isLoadingVehicles ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Retry Fetch
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleAssignVehicleToBooking}
            disabled={!selectedVehicleId || isAssigningVehicle || isSubmitting}
          >
            {isAssigningVehicle ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : "Assign Fleet Vehicle"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
