
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalFaresForVehicle, updateLocalFares } from '@/services/fareService';
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

const LocalFareManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageFares, setPackageFares] = useState<Record<string, Record<string, any>>>({});
  
  // Define available packages
  const packages = [
    { id: '4hrs-40km', name: '4 Hours / 40 KM' },
    { id: '8hrs-80km', name: '8 Hours / 80 KM' },
    { id: '10hrs-100km', name: '10 Hours / 100 KM' },
  ];
  
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
        
        // Initialize fare data structure
        const faresData: Record<string, Record<string, any>> = {};
        
        // Initialize with package IDs
        for (const pkg of packages) {
          faresData[pkg.id] = {};
        }
        
        // Fetch local package fares for each vehicle
        for (const vehicle of activeCabs) {
          try {
            const fares = await getLocalFaresForVehicle(vehicle.id);
            
            // Extract package prices if available
            if (fares && fares.packagePrices) {
              for (const pkg of packages) {
                if (fares.packagePrices[pkg.id] !== undefined) {
                  faresData[pkg.id][vehicle.id] = fares.packagePrices[pkg.id].toString();
                } else {
                  faresData[pkg.id][vehicle.id] = "0";
                }
              }
            } else {
              // Set default prices if no data available
              for (const pkg of packages) {
                faresData[pkg.id][vehicle.id] = "0";
              }
            }
          } catch (error) {
            console.error(`Error fetching local fares for ${vehicle.name}:`, error);
            // Set default prices if error
            for (const pkg of packages) {
              faresData[pkg.id][vehicle.id] = "0";
            }
          }
        }
        
        setPackageFares(faresData);
      } catch (error) {
        console.error('Error loading vehicles and fares:', error);
        toast.error('Failed to load vehicles and fares');
      } finally {
        setLoading(false);
      }
    };
    
    loadVehiclesAndFares();
  }, []);
  
  const handleFareChange = (packageId: string, vehicleId: string, value: string) => {
    setPackageFares(prev => ({
      ...prev,
      [packageId]: {
        ...prev[packageId],
        [vehicleId]: value
      }
    }));
  };
  
  const handleSaveFare = async (packageId: string, vehicleId: string) => {
    try {
      const price = parseFloat(packageFares[packageId][vehicleId]);
      
      if (isNaN(price)) {
        toast.error('Please enter a valid fare amount');
        return;
      }
      
      const vehicleName = vehicles.find(v => v.id === vehicleId)?.name;
      toast.info(`Updating ${packages.find(p => p.id === packageId)?.name} price for ${vehicleName}...`);
      
      // Prepare price data for the specific vehicle and package
      const priceData = {
        vehicleId,
        packageId,
        price,
        // Add more package data if needed
        packages: {
          [packageId]: price
        }
      };
      
      // Update the fare using the updateLocalFares function
      const result = await updateLocalFares(vehicleId, {
        vehicleId,
        packagePrices: {
          [packageId]: price
        }
      });
      
      if (result.success) {
        toast.success(`${packages.find(p => p.id === packageId)?.name} price updated successfully for ${vehicleName}`);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('local-fares-updated', {
          detail: {
            vehicleId,
            packageId,
            price,
            prices: {
              [packageId]: price
            },
            timestamp: Date.now()
          }
        }));
      } else {
        toast.error('Failed to update package price');
      }
    } catch (error) {
      console.error('Error saving package fare:', error);
      toast.error('Error updating package price');
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading vehicles and fares...</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Local Package Fare Management</h2>
      
      {vehicles.length === 0 ? (
        <div className="text-center p-4 bg-gray-50 rounded-md">
          No vehicles found. Please add vehicles first.
        </div>
      ) : (
        <>
          {packages.map((pkg) => (
            <div key={pkg.id} className="mb-8">
              <h3 className="text-lg font-semibold mb-2">{pkg.name} Package</h3>
              <Table>
                <TableCaption>Manage fares for {pkg.name} package</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Price (₹)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={`${pkg.id}-${vehicle.id}`}>
                      <TableCell className="font-medium">{vehicle.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${pkg.id}-${vehicle.id}`} className="sr-only">
                            Price
                          </Label>
                          <Input
                            id={`${pkg.id}-${vehicle.id}`}
                            value={packageFares[pkg.id]?.[vehicle.id] || "0"}
                            onChange={(e) => handleFareChange(pkg.id, vehicle.id, e.target.value)}
                            type="number"
                            min="0"
                            className="w-32"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleSaveFare(pkg.id, vehicle.id)}
                          variant="outline"
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default LocalFareManagement;
