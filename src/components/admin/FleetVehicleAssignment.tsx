
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FleetVehicle } from "@/types/cab";
import { Booking } from "@/types/api";
import { Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { vehicleAPI } from '@/services/api';

interface FleetVehicleAssignmentProps {
  booking: Booking;
  onAssign: (vehicleData: { vehicleNumber: string }) => Promise<void>;
  isSubmitting: boolean;
}

export function FleetVehicleAssignment({ 
  booking, 
  onAssign, 
  isSubmitting 
}: FleetVehicleAssignmentProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vehicles on component mount
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await vehicleAPI.getFleetVehicles();
        
        // Filter for active vehicles that match the booking's cab type
        const availableVehicles = response.filter((vehicle: FleetVehicle) => 
          vehicle.status === 'active' && 
          vehicle.vehicleType?.toLowerCase() === booking.cabType?.toLowerCase()
        );
        
        setVehicles(availableVehicles);
        setFilteredVehicles(availableVehicles);
        setLoading(false);
      } catch (err) {
        setError("Failed to load vehicles. Please try again.");
        setLoading(false);
        console.error("Error fetching vehicles:", err);
      }
    };

    fetchVehicles();
  }, [booking.cabType]);

  // Filter vehicles based on search query
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filtered = vehicles.filter(vehicle => 
      vehicle.vehicleNumber.toLowerCase().includes(lowerCaseQuery) ||
      vehicle.vehicleName?.toLowerCase().includes(lowerCaseQuery) ||
      vehicle.make.toLowerCase().includes(lowerCaseQuery) ||
      vehicle.model.toLowerCase().includes(lowerCaseQuery)
    );

    setFilteredVehicles(filtered);
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedVehicle) return;
    
    try {
      await onAssign({ 
        vehicleNumber: selectedVehicle.vehicleNumber 
      });
    } catch (err) {
      console.error("Error assigning vehicle:", err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Fleet Vehicle</CardTitle>
        <CardDescription>
          Select a vehicle for booking #{booking.bookingNumber} ({booking.cabType})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search vehicles by number, model or make"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {loading && <p className="text-center py-4">Loading vehicles...</p>}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && filteredVehicles.length === 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No matching vehicles found. Please try a different search term or contact fleet management.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 mt-4">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`flex items-center justify-between p-3 border rounded-md cursor-pointer ${
                selectedVehicle?.id === vehicle.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <div>
                <p className="font-medium">{vehicle.vehicleNumber}</p>
                <p className="text-sm text-gray-500">
                  {vehicle.make} {vehicle.model} ({vehicle.year})
                </p>
              </div>
              <div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  vehicle.status === 'active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {vehicle.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setSelectedVehicle(null)}
            disabled={!selectedVehicle || isSubmitting}
          >
            Clear Selection
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedVehicle || isSubmitting}
          >
            {isSubmitting ? "Assigning..." : "Assign Vehicle"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
