
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { directFareUpdate, getOutstationFaresForVehicle } from '@/services/fareService';
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

const OutstationFareManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [loading, setLoading] = useState(true);
  const [basePrices, setBasePrices] = useState<Record<string, string>>({});
  const [pricesPerKm, setPricesPerKm] = useState<Record<string, string>>({});
  const [nightHaltCharges, setNightHaltCharges] = useState<Record<string, string>>({});
  const [driverAllowances, setDriverAllowances] = useState<Record<string, string>>({});
  
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
        
        // Initialize fare data
        const basePriceData: Record<string, string> = {};
        const pricePerKmData: Record<string, string> = {};
        const nightHaltData: Record<string, string> = {};
        const driverAllowanceData: Record<string, string> = {};
        
        // Fetch outstation fares for each vehicle
        for (const vehicle of activeCabs) {
          try {
            const fares = await getOutstationFaresForVehicle(vehicle.id);
            
            // Set initial fare values
            basePriceData[vehicle.id] = fares?.basePrice?.toString() || "0";
            pricePerKmData[vehicle.id] = fares?.pricePerKm?.toString() || "0";
            nightHaltData[vehicle.id] = fares?.nightHaltCharge?.toString() || "0";
            driverAllowanceData[vehicle.id] = fares?.driverAllowance?.toString() || "0";
          } catch (error) {
            console.error(`Error fetching outstation fares for ${vehicle.name}:`, error);
            // Set default values if error occurs
            basePriceData[vehicle.id] = "0";
            pricePerKmData[vehicle.id] = "0";
            nightHaltData[vehicle.id] = "0";
            driverAllowanceData[vehicle.id] = "0";
          }
        }
        
        setBasePrices(basePriceData);
        setPricesPerKm(pricePerKmData);
        setNightHaltCharges(nightHaltData);
        setDriverAllowances(driverAllowanceData);
      } catch (error) {
        console.error('Error loading vehicles and fares:', error);
        toast.error('Failed to load vehicles and fares');
      } finally {
        setLoading(false);
      }
    };
    
    loadVehiclesAndFares();
  }, []);
  
  const handleSaveFares = async (vehicleId: string) => {
    try {
      const basePrice = parseFloat(basePrices[vehicleId]);
      const pricePerKm = parseFloat(pricesPerKm[vehicleId]);
      const nightHaltCharge = parseFloat(nightHaltCharges[vehicleId]);
      const driverAllowance = parseFloat(driverAllowances[vehicleId]);
      
      if (isNaN(basePrice) || isNaN(pricePerKm)) {
        toast.error('Please enter valid fare amounts');
        return;
      }
      
      const vehicleName = vehicles.find(v => v.id === vehicleId)?.name;
      toast.info(`Updating outstation fares for ${vehicleName}...`);
      
      // Update the outstation fares
      const fareData = {
        vehicleId,
        basePrice,
        pricePerKm,
        nightHaltCharge: isNaN(nightHaltCharge) ? 0 : nightHaltCharge,
        driverAllowance: isNaN(driverAllowance) ? 0 : driverAllowance
      };
      
      const result = await directFareUpdate('outstation', vehicleId, fareData);
      
      if (result.status === 'success') {
        toast.success(`Outstation fares updated successfully for ${vehicleName}`);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('trip-fares-updated', {
          detail: {
            vehicleId,
            fares: fareData,
            timestamp: Date.now()
          }
        }));
      } else {
        toast.error('Failed to update outstation fares');
      }
    } catch (error) {
      console.error('Error saving outstation fares:', error);
      toast.error('Error updating outstation fares');
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading vehicles and fares...</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Outstation Fare Management</h2>
      
      {vehicles.length === 0 ? (
        <div className="text-center p-4 bg-gray-50 rounded-md">
          No vehicles found. Please add vehicles first.
        </div>
      ) : (
        <Table>
          <TableCaption>Manage outstation fares for each vehicle type</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Base Price (₹)</TableHead>
              <TableHead>Price Per KM (₹)</TableHead>
              <TableHead>Night Halt (₹)</TableHead>
              <TableHead>Driver Allowance (₹)</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.name}</TableCell>
                <TableCell>
                  <Input
                    id={`base-price-${vehicle.id}`}
                    value={basePrices[vehicle.id] || "0"}
                    onChange={(e) => setBasePrices(prev => ({ ...prev, [vehicle.id]: e.target.value }))}
                    type="number"
                    min="0"
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    id={`price-per-km-${vehicle.id}`}
                    value={pricesPerKm[vehicle.id] || "0"}
                    onChange={(e) => setPricesPerKm(prev => ({ ...prev, [vehicle.id]: e.target.value }))}
                    type="number"
                    min="0"
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    id={`night-halt-${vehicle.id}`}
                    value={nightHaltCharges[vehicle.id] || "0"}
                    onChange={(e) => setNightHaltCharges(prev => ({ ...prev, [vehicle.id]: e.target.value }))}
                    type="number"
                    min="0"
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    id={`driver-allowance-${vehicle.id}`}
                    value={driverAllowances[vehicle.id] || "0"}
                    onChange={(e) => setDriverAllowances(prev => ({ ...prev, [vehicle.id]: e.target.value }))}
                    type="number"
                    min="0"
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    onClick={() => handleSaveFares(vehicle.id)}
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

export default OutstationFareManagement;
