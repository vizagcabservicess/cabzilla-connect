import React, { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';
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
        setLocalFares(data);
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
      const updatedFare = localFares[vehicleId];
      const response = await fetch('/api/fares/local.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleId: vehicleId, ...updatedFare }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update local fare: ${response.status}`);
      }

      setEditableVehicleId(null);
      setRefreshKey(prevKey => prevKey + 1);
      toast({
        title: "Success",
        description: "Local fare updated successfully.",
      });
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
        ...prevFares[vehicleId],
        [field]: value,
      },
    }));
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Local Fare Management</h2>

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
