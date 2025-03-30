
import React, { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { reloadCabTypes } from '@/lib/cabData';
import { getAirportFaresForVehicle, directFareUpdate } from '@/lib';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const AirportFareManagement = () => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [airportFares, setAirportFares] = useState<any>({});
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
            const fareData = await getAirportFaresForVehicle(vehicle.id);
            fares[vehicle.id] = fareData;
          } catch (error) {
            console.error(`Error fetching airport fares for ${vehicle.name}:`, error);
            fares[vehicle.id] = {
              basePrice: 0,
              tier1Price: 0,
              tier2Price: 0,
              tier3Price: 0,
              tier4Price: 0,
              extraKmCharge: 0,
              driverAllowance: 0
            };
          }
        }
        setAirportFares(fares);
      } catch (error) {
        console.error('Error loading cab types:', error);
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

  const handleSave = async (vehicleId: string) => {
    setIsSaving(true);
    try {
      const fareData = airportFares[vehicleId];
      // Use directFareUpdate instead of updateAirportFaresForVehicle
      const result = await directFareUpdate('airport', vehicleId, fareData);
      
      if (result && result.status === 'success') {
        setEditableVehicleId(null);
        toast({
          title: "Success",
          description: `Airport fares for ${vehicles.find(v => v.id === vehicleId)?.name} updated successfully.`,
        });
        // Refresh the data
        setRefreshKey(prevKey => prevKey + 1);
      } else {
        throw new Error("Failed to update airport fare");
      }
    } catch (error) {
      console.error('Error updating airport fares:', error);
      toast({
        title: "Error",
        description: "Failed to update airport fares. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (vehicleId: string, field: string, value: string) => {
    setAirportFares(prevFares => ({
      ...prevFares,
      [vehicleId]: {
        ...prevFares[vehicleId],
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Airport Fare Management</h1>
        <Button onClick={handleRefresh} variant="outline">Refresh Data</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="bg-white shadow rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">{vehicle.name}</h2>
            {editableVehicleId === vehicle.id ? (
              <>
                <div className="mb-2">
                  <Label htmlFor={`basePrice-${vehicle.id}`}>Base Price</Label>
                  <Input
                    type="number"
                    id={`basePrice-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.basePrice || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'basePrice', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`tier1Price-${vehicle.id}`}>Tier 1 Price (Up to 10km)</Label>
                  <Input
                    type="number"
                    id={`tier1Price-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.tier1Price || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'tier1Price', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`tier2Price-${vehicle.id}`}>Tier 2 Price (10-20km)</Label>
                  <Input
                    type="number"
                    id={`tier2Price-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.tier2Price || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'tier2Price', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`tier3Price-${vehicle.id}`}>Tier 3 Price (20-30km)</Label>
                  <Input
                    type="number"
                    id={`tier3Price-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.tier3Price || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'tier3Price', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`tier4Price-${vehicle.id}`}>Tier 4 Price (30km+)</Label>
                  <Input
                    type="number"
                    id={`tier4Price-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.tier4Price || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'tier4Price', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`extraKmCharge-${vehicle.id}`}>Extra KM Charge (Above Tier 4)</Label>
                  <Input
                    type="number"
                    id={`extraKmCharge-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.extraKmCharge || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'extraKmCharge', e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <Label htmlFor={`driverAllowance-${vehicle.id}`}>Driver Allowance</Label>
                  <Input
                    type="number"
                    id={`driverAllowance-${vehicle.id}`}
                    value={airportFares[vehicle.id]?.driverAllowance || 0}
                    onChange={(e) => handleInputChange(vehicle.id, 'driverAllowance', e.target.value)}
                  />
                </div>
                <div className="flex justify-between">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditableVehicleId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(vehicle.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <p>Base Price: {airportFares[vehicle.id]?.basePrice}</p>
                <p>Tier 1 Price (Up to 10km): {airportFares[vehicle.id]?.tier1Price}</p>
                <p>Tier 2 Price (10-20km): {airportFares[vehicle.id]?.tier2Price}</p>
                <p>Tier 3 Price (20-30km): {airportFares[vehicle.id]?.tier3Price}</p>
                <p>Tier 4 Price (30km+): {airportFares[vehicle.id]?.tier4Price}</p>
                <p>Extra KM Charge (Above Tier 4): {airportFares[vehicle.id]?.extraKmCharge}</p>
                <p>Driver Allowance: {airportFares[vehicle.id]?.driverAllowance}</p>
                <Button
                  size="sm"
                  onClick={() => setEditableVehicleId(vehicle.id)}
                  className="mt-2"
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AirportFareManagement;
