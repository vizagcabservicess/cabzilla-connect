
import React, { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';
import { getOutstationFaresForVehicle, directFareUpdate } from '@/services/fareService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const OutstationFareManagement = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [outstationFares, setOutstationFares] = useState<any>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editableVehicleId, setEditableVehicleId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Use reloadCabTypes instead of loadCabTypes
        const cabTypes = await reloadCabTypes(true);
        setVehicles(cabTypes);

        const fares: any = {};
        for (const vehicle of cabTypes) {
          try {
            const fare = await getOutstationFaresForVehicle(vehicle.id);
            fares[vehicle.id] = fare;
          } catch (error) {
            console.error(`Failed to load outstation fares for ${vehicle.name}:`, error);
            fares[vehicle.id] = {
              basePrice: 0,
              pricePerKm: 0,
              roundTripPricePerKm: 0,
              roundTripBasePrice: 0,
              driverAllowance: 0
            };
          }
        }
        setOutstationFares(fares);
      } catch (error) {
        console.error("Failed to load cab types:", error);
        toast({
          title: "Error",
          description: "Failed to load cab types. Please try again.",
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
      const fareData = outstationFares[vehicleId];
      // Use directFareUpdate instead of the missing updateOutstationFares
      await directFareUpdate('outstation', vehicleId, fareData);
      toast({
        title: "Success",
        description: `Outstation fares for ${vehicles.find(v => v.id === vehicleId)?.name} updated successfully.`,
      });
      setEditableVehicleId(null);
      setRefreshKey(prevKey => prevKey + 1); // Refresh data
    } catch (error) {
      console.error("Failed to update outstation fares:", error);
      toast({
        title: "Error",
        description: "Failed to update outstation fares. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (vehicleId: string, field: string, value: string) => {
    setOutstationFares(prevFares => ({
      ...prevFares,
      [vehicleId]: {
        ...prevFares[vehicleId],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Outstation Fare Management</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-2 px-4 border-b">Vehicle</th>
              <th className="py-2 px-4 border-b">Base Price</th>
              <th className="py-2 px-4 border-b">Price Per KM</th>
              <th className="py-2 px-4 border-b">Round Trip Price Per KM</th>
              <th className="py-2 px-4 border-b">Round Trip Base Price</th>
              <th className="py-2 px-4 border-b">Driver Allowance</th>
              <th className="py-2 px-4 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(vehicle => (
              <tr key={vehicle.id} className="hover:bg-gray-100">
                <td className="py-2 px-4 border-b">{vehicle.name}</td>
                <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={outstationFares[vehicle.id]?.basePrice || ''}
                      onChange={(e) => handleChange(vehicle.id, 'basePrice', e.target.value)}
                    />
                  ) : (
                    outstationFares[vehicle.id]?.basePrice
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={outstationFares[vehicle.id]?.pricePerKm || ''}
                      onChange={(e) => handleChange(vehicle.id, 'pricePerKm', e.target.value)}
                    />
                  ) : (
                    outstationFares[vehicle.id]?.pricePerKm
                  )}
                </td>
                 <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={outstationFares[vehicle.id]?.roundTripPricePerKm || ''}
                      onChange={(e) => handleChange(vehicle.id, 'roundTripPricePerKm', e.target.value)}
                    />
                  ) : (
                    outstationFares[vehicle.id]?.roundTripPricePerKm
                  )}
                </td>
                 <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={outstationFares[vehicle.id]?.roundTripBasePrice || ''}
                      onChange={(e) => handleChange(vehicle.id, 'roundTripBasePrice', e.target.value)}
                    />
                  ) : (
                    outstationFares[vehicle.id]?.roundTripBasePrice
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <Input
                      type="number"
                      value={outstationFares[vehicle.id]?.driverAllowance || ''}
                      onChange={(e) => handleChange(vehicle.id, 'driverAllowance', e.target.value)}
                    />
                  ) : (
                    outstationFares[vehicle.id]?.driverAllowance
                  )}
                </td>
                <td className="py-2 px-4 border-b">
                  {editableVehicleId === vehicle.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={() => handleSave(vehicle.id)}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditableVehicleId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleEdit(vehicle.id)}>
                      Edit
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => setRefreshKey(prevKey => prevKey + 1)}
      >
        Refresh
      </Button>
    </div>
  );
};

export default OutstationFareManagement;
