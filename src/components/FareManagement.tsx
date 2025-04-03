
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FareData, fetchLocalFares, fetchAirportFares, updateLocalFares, updateAirportFares } from '@/services/fareManagementService';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [fareData, setFareData] = useState<FareData>({
    vehicleId: vehicleId,
    basePrice: 0,
    pricePerKm: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFares = async () => {
      try {
        setIsLoading(true);
        const fetchFn = fareType === 'local' ? fetchLocalFares : fetchAirportFares;
        const fares = await fetchFn(vehicleId);
        if (fares.length > 0) {
          setFareData({ ...fares[0], vehicleId });
        }
      } catch (error) {
        console.error(`Error loading ${fareType} fares:`, error);
        toast.error(`Failed to load ${fareType} fares`);
      } finally {
        setIsLoading(false);
      }
    };

    if (vehicleId) {
      loadFares();
    }
  }, [vehicleId, fareType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const updateFn = fareType === 'local' ? updateLocalFares : updateAirportFares;
      await updateFn(fareData);
      toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
    } catch (error) {
      console.error(`Error updating ${fareType} fares:`, error);
      toast.error(`Failed to update ${fareType} fares`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFareData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : Number(value)
    }));
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">
        {fareType === 'local' ? 'Local Package Fares' : 'Airport Transfer Fares'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fareType === 'local' ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">4 Hours 40 KM Price</label>
                <Input
                  type="number"
                  name="price4hrs40km"
                  value={fareData.price4hrs40km || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">8 Hours 80 KM Price</label>
                <Input
                  type="number"
                  name="price8hrs80km"
                  value={fareData.price8hrs80km || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">10 Hours 100 KM Price</label>
                <Input
                  type="number"
                  name="price10hrs100km"
                  value={fareData.price10hrs100km || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Extra Hour Price</label>
                <Input
                  type="number"
                  name="priceExtraHour"
                  value={fareData.priceExtraHour || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Extra KM Price</label>
                <Input
                  type="number"
                  name="pricePerKm"
                  value={fareData.pricePerKm || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Base Price</label>
                <Input
                  type="number"
                  name="basePrice"
                  value={fareData.basePrice || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price Per KM</label>
                <Input
                  type="number"
                  name="pricePerKm"
                  value={fareData.pricePerKm || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pickup Price</label>
                <Input
                  type="number"
                  name="pickupPrice"
                  value={fareData.pickupPrice || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Drop Price</label>
                <Input
                  type="number"
                  name="dropPrice"
                  value={fareData.dropPrice || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier 1 Price</label>
                <Input
                  type="number"
                  name="tier1Price"
                  value={fareData.tier1Price || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier 2 Price</label>
                <Input
                  type="number"
                  name="tier2Price"
                  value={fareData.tier2Price || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier 3 Price</label>
                <Input
                  type="number"
                  name="tier3Price"
                  value={fareData.tier3Price || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tier 4 Price</label>
                <Input
                  type="number"
                  name="tier4Price"
                  value={fareData.tier4Price || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Extra KM Charge</label>
                <Input
                  type="number"
                  name="extraKmCharge"
                  value={fareData.extraKmCharge || 0}
                  onChange={handleInputChange}
                  min={0}
                />
              </div>
            </>
          )}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Fares'}
        </Button>
      </form>
    </Card>
  );
};
