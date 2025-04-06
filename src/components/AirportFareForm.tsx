
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AirportFare, getAirportFare, updateAirportFare, syncAirportFares } from '@/services/airportFareService';

interface AirportFareFormProps {
  vehicleId: string;
  onFareUpdated?: () => void;
}

export const AirportFareForm: React.FC<AirportFareFormProps> = ({ vehicleId, onFareUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fare, setFare] = useState<AirportFare>({
    vehicleId: vehicleId,
    basePrice: 0,
    pricePerKm: 0,
    pickupPrice: 0,
    dropPrice: 0,
    tier1Price: 0,
    tier2Price: 0,
    tier3Price: 0,
    tier4Price: 0,
    extraKmCharge: 0,
    nightCharges: 0,
    extraWaitingCharges: 0
  });

  // Load fare data when vehicleId changes
  useEffect(() => {
    loadFareData();
  }, [vehicleId]);

  const loadFareData = async () => {
    if (!vehicleId) return;
    
    try {
      setIsLoading(true);
      const fareData = await getAirportFare(vehicleId);
      
      if (fareData) {
        console.log('Loaded fare data:', fareData);
        setFare({
          vehicleId: vehicleId,
          basePrice: parseFloat(fareData.basePrice?.toString() || '0'),
          pricePerKm: parseFloat(fareData.pricePerKm?.toString() || '0'),
          pickupPrice: parseFloat(fareData.pickupPrice?.toString() || '0'),
          dropPrice: parseFloat(fareData.dropPrice?.toString() || '0'),
          tier1Price: parseFloat(fareData.tier1Price?.toString() || '0'),
          tier2Price: parseFloat(fareData.tier2Price?.toString() || '0'),
          tier3Price: parseFloat(fareData.tier3Price?.toString() || '0'),
          tier4Price: parseFloat(fareData.tier4Price?.toString() || '0'),
          extraKmCharge: parseFloat(fareData.extraKmCharge?.toString() || '0'),
          nightCharges: parseFloat(fareData.nightCharges?.toString() || '0'),
          extraWaitingCharges: parseFloat(fareData.extraWaitingCharges?.toString() || '0')
        });
      } else {
        toast.error('Failed to load fare data');
      }
    } catch (error) {
      console.error('Error loading fare data:', error);
      toast.error('Error loading fare data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFare(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId) {
      toast.error('Vehicle ID is required');
      return;
    }
    
    try {
      setIsSaving(true);
      console.log('Submitting fare data:', fare);
      
      const response = await updateAirportFare(fare);
      
      if (response.status === 'success') {
        toast.success('Airport fare updated successfully');
        if (onFareUpdated) onFareUpdated();
      } else {
        toast.error(`Failed to update airport fare: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Error saving fare data:', error);
      toast.error(`Error saving fare data: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFares = async () => {
    try {
      setIsSyncing(true);
      toast.info('Syncing airport fares data...');
      
      const success = await syncAirportFares(true);
      
      if (success) {
        toast.success('Airport fares synced successfully');
        loadFareData(); // Reload data after syncing
      } else {
        toast.error('Failed to sync airport fares');
      }
    } catch (error: any) {
      console.error('Error syncing airport fares:', error);
      toast.error(`Error syncing airport fares: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Airport Transfer Fare Settings</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncFares}
            disabled={isSyncing || !vehicleId}
          >
            <RotateCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Fares'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                value={fare.basePrice}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Base price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Price Per KM</Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                value={fare.pricePerKm}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Price per km"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pickupPrice">Airport Pickup Price</Label>
              <Input
                id="pickupPrice"
                name="pickupPrice"
                type="number"
                value={fare.pickupPrice}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Pickup price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dropPrice">Airport Drop Price</Label>
              <Input
                id="dropPrice"
                name="dropPrice"
                type="number"
                value={fare.dropPrice}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Drop price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier1Price">Tier 1 Price (0-10 KM)</Label>
              <Input
                id="tier1Price"
                name="tier1Price"
                type="number"
                value={fare.tier1Price}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Tier 1 price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier2Price">Tier 2 Price (11-20 KM)</Label>
              <Input
                id="tier2Price"
                name="tier2Price"
                type="number"
                value={fare.tier2Price}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Tier 2 price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier3Price">Tier 3 Price (21-30 KM)</Label>
              <Input
                id="tier3Price"
                name="tier3Price"
                type="number"
                value={fare.tier3Price}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Tier 3 price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tier4Price">Tier 4 Price (31+ KM)</Label>
              <Input
                id="tier4Price"
                name="tier4Price"
                type="number"
                value={fare.tier4Price}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Tier 4 price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="extraKmCharge">Extra KM Charge</Label>
              <Input
                id="extraKmCharge"
                name="extraKmCharge"
                type="number"
                value={fare.extraKmCharge}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Extra km charge"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nightCharges">Night Charges</Label>
              <Input
                id="nightCharges"
                name="nightCharges"
                type="number"
                value={fare.nightCharges}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Night charges"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="extraWaitingCharges">Extra Waiting Charges</Label>
              <Input
                id="extraWaitingCharges"
                name="extraWaitingCharges"
                type="number"
                value={fare.extraWaitingCharges}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Extra waiting charges"
              />
            </div>
          </div>
          
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full md:w-auto"
              disabled={isLoading || isSaving || !vehicleId}
            >
              {isSaving ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Airport Fare
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
