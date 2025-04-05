import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditVehicleDialog } from "@/components/admin/EditVehicleDialog";
import { Plus, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CabType } from "@/types/cab";
import { getVehicleData } from '@/services/vehicleDataService';
import { Alert, AlertDescription } from "@/components/ui/alert";

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editVehicle, setEditVehicle] = useState<CabType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getVehicleData();
        setVehicles(data);
      } catch (err: any) {
        setError(`Failed to fetch vehicles: ${err.message}`);
        toast.error(`Failed to fetch vehicles: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleEditVehicle = (vehicle: CabType) => {
    setEditVehicle(vehicle);
    setIsEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditVehicle(null);
  };

  const handleVehicleUpdate = (updatedVehicle: CabType) => {
    setVehicles(vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Vehicle Management</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="mb-4">
        <Label htmlFor="search">Search Vehicles</Label>
        <Input
          type="text"
          id="search"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading vehicles...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map(vehicle => (
            <Card key={vehicle.id} className="bg-white shadow-md rounded-md overflow-hidden">
              <CardHeader>
                <CardTitle>{vehicle.name}</CardTitle>
                <CardDescription>ID: {vehicle.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>Capacity: {vehicle.capacity}</p>
                <p>Base Price: ₹{vehicle.basePrice}</p>
                <p>Price per KM: ₹{vehicle.pricePerKm}</p>
              </CardContent>
              <div className="p-4">
                <Button variant="outline" onClick={() => handleEditVehicle(vehicle)}>
                  Edit Vehicle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editVehicle && (
        <EditVehicleDialog
          open={isEditDialogOpen}
          onClose={handleDialogClose}
          vehicle={editVehicle}
          onEditVehicle={handleVehicleUpdate}
        />
      )}
    </div>
  );
}
