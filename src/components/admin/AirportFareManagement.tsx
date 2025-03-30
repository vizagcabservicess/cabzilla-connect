
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAirportFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CabType } from '@/types/cab';
import { toast } from 'sonner';
import { reloadCabTypes, cabTypes } from '@/lib/cabData';

const AirportFareManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [loading, setLoading] = useState(true);
  const [airportFares, setAirportFares] = useState<Record<string, any>>({});
  const [baseFares, setBaseFares] = useState<Record<string, string>>({});
  
  // Load vehicles and their fares
  useEffect(() => {
    const loadVehiclesAndFares = async () => {
      setLoading(true);
      try {
        // Make sure we have the latest vehicles
        await reloadCabTypes();
        
        // Use the already loaded cabTypes array
        const activeCabs = cabTypes.filter(cab => cab.isActive !== false);
        setVehicles(activeCabs);
        
        // Fetch airport fares for each vehicle
        const faresData: Record<string, any> = {};
        const baseFaresData: Record<string, string> = {};
        
        for (const vehicle of activeCabs) {
          try {
            const fares = await getAirportFaresForVehicle(vehicle.id);
            faresData[vehicle.id] = fares;
            
            // Set initial base fare values
            if (fares && fares.baseFare) {
              baseFaresData[vehicle.id] = fares.baseFare.toString();
            } else {
              baseFaresData[vehicle.id] = "0";
            }
          } catch (error) {
            console.error(`Error fetching fares for ${vehicle.name}:`, error);
            // Initialize with empty fare for this vehicle
            baseFaresData[vehicle.id] = "0";
          }
        }
        
        setAirportFares(faresData);
        setBaseFares(baseFaresData);
      } catch (error) {
        console.error('Error loading vehicles and fares:', error);
        toast.error('Failed to load vehicles and fares');
      } finally {
        setLoading(false);
      }
    };
    
    loadVehiclesAndFares();
  }, []);
  
  const handleBaseFareChange = (vehicleId: string, value: string) => {
    setBaseFares(prev => ({
      ...prev,
      [vehicleId]: value
    }));
  };
  
  const handleSaveFare = async (vehicleId: string) => {
    try {
      const basePrice = parseFloat(baseFares[vehicleId]);
      
      if (isNaN(basePrice)) {
        toast.error('Please enter a valid fare amount');
        return;
      }
      
      toast.info(`Updating airport fares for ${vehicles.find(v => v.id === vehicleId)?.name}...`);
      
      // Get existing fares or initialize new object
      const existingFares = airportFares[vehicleId] || {};
      
      // Update with new base fare
      const updatedFares = {
        ...existingFares,
        vehicleId: vehicleId,
        baseFare: basePrice
      };
      
      const result = await updateAirportFaresForVehicle(vehicleId, updatedFares);
      
      if (result.success) {
        toast.success('Airport fares updated successfully');
        
        // Update local state
        setAirportFares(prev => ({
          ...prev,
          [vehicleId]: updatedFares
        }));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('airport-fares-updated', {
          detail: {
            vehicleId,
            fares: updatedFares,
            timestamp: Date.now()
          }
        }));
      } else {
        toast.error('Failed to update airport fares');
      }
    } catch (error) {
      console.error('Error saving airport fares:', error);
      toast.error('Error updating airport fares');
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading vehicles and fares...</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Airport Fare Management</h2>
      
      {vehicles.length === 0 ? (
        <div className="text-center p-4 bg-gray-50 rounded-md">
          No vehicles found. Please add vehicles first.
        </div>
      ) : (
        <Table>
          <TableCaption>Manage airport fares for each vehicle type</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Base Fare (₹)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.name}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`base-fare-${vehicle.id}`} className="sr-only">
                      Base Fare
                    </Label>
                    <Input
                      id={`base-fare-${vehicle.id}`}
                      value={baseFares[vehicle.id] || "0"}
                      onChange={(e) => handleBaseFareChange(vehicle.id, e.target.value)}
                      type="number"
                      min="0"
                      className="w-32"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    onClick={() => handleSaveFare(vehicle.id)}
                    variant="outline"
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AirportFareManagement;
