
import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Booking } from '@/types/api';
import { FleetVehicle } from '@/types/cab';
import { fleetAPI } from '@/services/api/fleetAPI';
import { Loader2, RefreshCw } from 'lucide-react';
import { getFleetVehicles, clearVehicleCache } from '@/utils/fleetDataUtils';

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
  const [fetchAttempts, setFetchAttempts] = useState<number>(0);

  useEffect(() => {
    fetchAvailableVehicles(false);
  }, []);

  const fetchAvailableVehicles = async (forceRefresh = false) => {
    try {
      setIsLoadingVehicles(true);
      setError(null);
      
      console.log(`Attempting to fetch vehicles (attempt ${fetchAttempts + 1}, forceRefresh: ${forceRefresh})`);
      
      // Use the utility function for fetching vehicles
      const vehicles = await getFleetVehicles(forceRefresh, true);
      
      if (vehicles && vehicles.length > 0) {
        console.log(`Fetched ${vehicles.length} vehicles for assignment`);
        setAvailableVehicles(vehicles);
      } else {
        setError("No vehicles available. Please try refreshing.");
        toast.error("No vehicles available");
      }
      
      // Increment fetch attempts counter
      setFetchAttempts(prev => prev + 1);
      
    } catch (error) {
      console.error("Error fetching available vehicles:", error);
      setError("Failed to load available vehicles. Please try again.");
      toast.error("Failed to load available vehicles");
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
      
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      toast.error("Failed to assign vehicle to booking");
    } finally {
      setIsAssigningVehicle(false);
    }
  };

  const retryFetchVehicles = () => {
    clearVehicleCache();
    fetchAvailableVehicles(true);
  };

  // Helper function to format vehicle display name
  const formatVehicleDisplay = (vehicle: FleetVehicle) => {
    return `${vehicle.vehicleNumber} - ${vehicle.make} ${vehicle.model} (${vehicle.year})`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Assign Vehicle</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={retryFetchVehicles}
          disabled={isLoadingVehicles}
          className="flex items-center gap-1"
        >
          {isLoadingVehicles ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {isLoadingVehicles ? "Loading..." : "Refresh"}
        </Button>
      </div>
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
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {availableVehicles.length} vehicles available
              {error && <span className="text-red-500 ml-2">{error}</span>}
            </p>
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
            ) : "Assign Vehicle"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
