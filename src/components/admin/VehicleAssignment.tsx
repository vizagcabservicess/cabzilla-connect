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
import { getApiUrl } from '@/config/api';

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
  const [useBackupEndpoint, setUseBackupEndpoint] = useState<boolean>(false);

  useEffect(() => {
    fetchAvailableVehicles();
  }, [useBackupEndpoint]);

  const fetchAvailableVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      setError(null);
      
      console.log(`Attempting to fetch vehicles (attempt ${fetchAttempts + 1}, backup endpoint: ${useBackupEndpoint})`);
      
      // Use the fleetAPI service to fetch vehicles (which has fallbacks for multiple endpoints)
      const response = await fleetAPI.getVehicles(true);
      
      if (response && response.vehicles && Array.isArray(response.vehicles) && response.vehicles.length > 0) {
        console.log("Fetched vehicles for assignment:", response.vehicles);
        setAvailableVehicles(response.vehicles);
        return;
      }
      
      // If the fleetAPI service didn't return any vehicles, try the backup endpoint
      try {
        if (useBackupEndpoint) {
          // Use a specific working endpoint from the network requests we've observed
          const apiUrl = getApiUrl('/api/admin/direct-vehicle-modify.php?action=load');
          console.log("Fetching vehicles from backup endpoint:", apiUrl);
          
          const response = await fetch(apiUrl, {
            headers: {
              'Cache-Control': 'no-cache',
              'X-Force-Refresh': 'true',
              'X-Database-First': 'true'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log("Fetched vehicles from backup endpoint:", data);
            
            if (data && data.vehicles && Array.isArray(data.vehicles)) {
              setAvailableVehicles(data.vehicles);
              return;
            }
          }
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        // Continue to fallback
      }
      
      // If we've tried both endpoints and still don't have vehicles, use mock data
      console.warn("All vehicle fetching attempts failed. Using mock data.");
      setError("Could not load vehicles from database. Using mock data.");
      
      // Use mock data as last resort
      setAvailableVehicles([
        {
          id: "v-mock-001",
          vehicleNumber: "KA01AB1234",
          name: "Toyota Innova Crysta",
          make: "Toyota",
          model: "Innova Crysta",
          year: 2022,
          vehicleType: "innova_crysta",
          status: "Active",
          lastService: "2023-01-15",
          nextServiceDue: "2023-07-15",
          fuelType: "Diesel",
          capacity: 7,
          cabTypeId: "innova_crysta",
          luggageCapacity: 3,
          isActive: true,
          currentOdometer: 25000,
          createdAt: "2023-01-01",
          updatedAt: "2023-01-15"
        },
        {
          id: "v-mock-002",
          vehicleNumber: "KA02CD5678",
          name: "Maruti Suzuki Swift Dzire",
          make: "Maruti Suzuki",
          model: "Swift Dzire",
          year: 2021,
          vehicleType: "sedan",
          status: "Active",
          lastService: "2023-02-20",
          nextServiceDue: "2023-08-20",
          fuelType: "Petrol",
          capacity: 5,
          cabTypeId: "sedan",
          luggageCapacity: 2,
          isActive: true,
          currentOdometer: 15000,
          createdAt: "2022-12-01",
          updatedAt: "2023-02-20"
        }
      ]);
      
      // Increment fetch attempts to try backup endpoint on next try
      const newAttempts = fetchAttempts + 1;
      setFetchAttempts(newAttempts);
      
      // Toggle to use backup endpoint after 2 failed attempts with the primary
      if (newAttempts >= 2 && !useBackupEndpoint) {
        setUseBackupEndpoint(true);
      }
      
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
    setUseBackupEndpoint(!useBackupEndpoint);
    fetchAvailableVehicles();
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
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {availableVehicles.length} vehicles available
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
            ) : "Assign Vehicle"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
