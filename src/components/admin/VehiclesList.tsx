
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Car } from "lucide-react";
import { toast } from "sonner";
import { getVehicleData } from "@/services/vehicleDataService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
  price: number;
  pricePerKm: number;
  image: string;
  isActive: boolean;
}

export const VehiclesList = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchVehicles();
  }, []);
  
  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all vehicles including inactive ones
      const data = await getVehicleData(true);
      setVehicles(data);
      console.log('Fetched vehicles:', data);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles. Please try again.');
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddVehicle = () => {
    navigate('/admin/vehicles/add');
  };
  
  const handleEditVehicle = (vehicleId: string) => {
    navigate(`/admin/vehicles/${vehicleId}`);
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center">
          <Car className="mr-2 h-5 w-5" /> All Vehicles
        </CardTitle>
        <Button onClick={fetchVehicles} variant="outline" size="sm" className="mr-2">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <Button onClick={fetchVehicles} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Base Price (₹)</TableHead>
                    <TableHead>Price/km (₹)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length > 0 ? (
                    vehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium flex items-center space-x-2">
                          {vehicle.image && (
                            <img 
                              src={vehicle.image} 
                              alt={vehicle.name} 
                              className="h-8 w-8 object-contain rounded-md" 
                            />
                          )}
                          <span>{vehicle.name}</span>
                        </TableCell>
                        <TableCell>
                          {vehicle.capacity} persons
                          {vehicle.luggageCapacity > 0 && `, ${vehicle.luggageCapacity} luggage`}
                        </TableCell>
                        <TableCell>{vehicle.price.toLocaleString()}</TableCell>
                        <TableCell>{vehicle.pricePerKm}</TableCell>
                        <TableCell>
                          {vehicle.isActive ? (
                            <Badge variant="success" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-400">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditVehicle(vehicle.id)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No vehicles found. Add your first vehicle to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleAddVehicle} className="bg-green-600 hover:bg-green-700">
                Add New Vehicle
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VehiclesList;
