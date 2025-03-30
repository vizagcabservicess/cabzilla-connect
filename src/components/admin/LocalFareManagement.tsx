
import React, { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';
import { directFareUpdate } from '@/lib';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const LocalFareManagement = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [localFares, setLocalFares] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editableVehicleId, setEditableVehicleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const cabTypes = await reloadCabTypes(true);
        setVehicles(cabTypes);

        const response = await fetch('/api/fares/local.php');
        if (!response.ok) {
          throw new Error(`Failed to fetch local fares: ${response.status}`);
        }
        const data = await response.json();
        
        // Convert the array to an object with vehicle IDs as keys
        const faresObject = {};
        if (Array.isArray(data.fares)) {
          data.fares.forEach(fare => {
            faresObject[fare.vehicle_id] = {
              price4hrs40km: fare.price_4hrs_40km,
              price8hrs80km: fare.price_8hrs_80km,
              price10hrs100km: fare.price_10hrs_100km,
              priceExtraKm: fare.price_extra_km,
              priceExtraHour: fare.price_extra_hour
            };
          });
        } else if (typeof data === 'object') {
          // Handle direct object response
          Object.keys(data).forEach(vehicleId => {
            if (vehicleId !== 'status' && vehicleId !== 'message' && vehicleId !== 'count') {
              faresObject[vehicleId] = data[vehicleId];
            }
          });
        }
        
        setLocalFares(faresObject);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load local fare data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshKey]);

  const handleEdit = (vehicleId: string) => {
    setEditableVehicleId(vehicleId);
  };

  const handleSave = async (vehicleId: string) => {
    setIsSaving(true);
    try {
      const updatedFare = localFares[vehicleId] || {};
      
      // Make sure we have at least the price8hrs80km value
      if (!updatedFare.price8hrs80km && !updatedFare.price_8hrs_80km) {
        throw new Error("8hrs/80km price is required");
      }
      
      // Send request to update local fare
      const result = await directFareUpdate('local', vehicleId, updatedFare);
      
      if (result && result.status === 'success') {
        setEditableVehicleId(null);
        setRefreshKey(prevKey => prevKey + 1);
        toast({
          title: "Success",
          description: "Local fare updated successfully.",
        });
      } else {
        throw new Error("Failed to update local fare");
      }
    } catch (error) {
      console.error('Error updating local fare:', error);
      toast({
        title: "Error",
        description: "Failed to update local fare. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (vehicleId: string, field: string, value: string) => {
    setLocalFares(prevFares => ({
      ...prevFares,
      [vehicleId]: {
        ...(prevFares[vehicleId] || {}),
        [field]: value,
      },
    }));
  };

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Local Fare Management</h2>
        <Button onClick={handleRefresh} variant="outline">Refresh</Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Vehicle</TableHead>
              <TableHead>Price (8hrs/80km)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.name}</TableCell>
                <TableCell>
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={localFares[vehicle.id]?.price8hrs80km || ''}
                      onChange={(e) => handleChange(vehicle.id, 'price8hrs80km', e.target.value)}
                    />
                  ) : (
                    localFares[vehicle.id]?.price8hrs80km || 'N/A'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editableVehicleId === vehicle.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSave(vehicle.id)}
                        disabled={isSaving}
                        className="mr-2"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditableVehicleId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => handleEdit(vehicle.id)}>
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default LocalFareManagement;
