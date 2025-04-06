
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AirportFare, getAirportFare, updateAirportFare, syncAirportFares } from '@/services/airportFareService';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AirportFareFormProps {
  vehicleId: string;
  onFareUpdated?: () => void;
}

export const AirportFareForm: React.FC<AirportFareFormProps> = ({ vehicleId, onFareUpdated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!vehicleId) {
      setError("Please select a vehicle first");
      return;
    }
    
    loadFareData();
  }, [vehicleId]);

  const loadFareData = async () => {
    if (!vehicleId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fareData = await getAirportFare(vehicleId);
      
      if (fareData) {
        setFare({
          vehicleId: vehicleId,
          basePrice: Number(fareData.basePrice) || 0,
          pricePerKm: Number(fareData.pricePerKm) || 0,
          pickupPrice: Number(fareData.pickupPrice) || 0,
          dropPrice: Number(fareData.dropPrice) || 0,
          tier1Price: Number(fareData.tier1Price) || 0,
          tier2Price: Number(fareData.tier2Price) || 0,
          tier3Price: Number(fareData.tier3Price) || 0,
          tier4Price: Number(fareData.tier4Price) || 0,
          extraKmCharge: Number(fareData.extraKmCharge) || 0,
          nightCharges: Number(fareData.nightCharges) || 0,
          extraWaitingCharges: Number(fareData.extraWaitingCharges) || 0
        });
      } else {
        setError('No fare data found for this vehicle');
      }
    } catch (error) {
      console.error('Error loading fare data:', error);
      setError('Failed to load fare data');
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
      setError(null);
      
      const result = await updateAirportFare(fare);
      
      if (result.success) {
        toast.success('Airport fare updated successfully');
        if (onFareUpdated) onFareUpdated();
      } else {
        setError(result.message);
        toast.error(`Failed to update airport fare: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error saving fare data:', error);
      setError(error.message || 'An unexpected error occurred');
      toast.error(`Error saving fare data: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFares = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      toast.info('Syncing airport fares data...');
      
      const success = await syncAirportFares();
      
      if (success) {
        toast.success('Airport fares synced successfully');
        await loadFareData(); // Reload data after syncing
      } else {
        setError('Failed to sync airport fares');
        toast.error('Failed to sync airport fares');
      }
    } catch (error: any) {
      console.error('Error syncing airport fares:', error);
      setError(error.message || 'An unexpected error occurred');
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
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    name="basePrice"
                    type="number"
                    min="0"
                    value={fare.basePrice}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Base price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Price Per KM</Label>
                  <Input
                    id="pricePerKm"
                    name="pricePerKm"
                    type="number"
                    min="0"
                    step="0.5"
                    value={fare.pricePerKm}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Price per km"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pickupPrice">Airport Pickup Price</Label>
                  <Input
                    id="pickupPrice"
                    name="pickupPrice"
                    type="number"
                    min="0"
                    value={fare.pickupPrice}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Pickup price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dropPrice">Airport Drop Price</Label>
                  <Input
                    id="dropPrice"
                    name="dropPrice"
                    type="number"
                    min="0"
                    value={fare.dropPrice}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Drop price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier1Price">Tier 1 Price (0-10 KM)</Label>
                  <Input
                    id="tier1Price"
                    name="tier1Price"
                    type="number"
                    min="0"
                    value={fare.tier1Price}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Tier 1 price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier2Price">Tier 2 Price (11-20 KM)</Label>
                  <Input
                    id="tier2Price"
                    name="tier2Price"
                    type="number"
                    min="0"
                    value={fare.tier2Price}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Tier 2 price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier3Price">Tier 3 Price (21-30 KM)</Label>
                  <Input
                    id="tier3Price"
                    name="tier3Price"
                    type="number"
                    min="0"
                    value={fare.tier3Price}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Tier 3 price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tier4Price">Tier 4 Price (31+ KM)</Label>
                  <Input
                    id="tier4Price"
                    name="tier4Price"
                    type="number"
                    min="0"
                    value={fare.tier4Price}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Tier 4 price"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="extraKmCharge">Extra KM Charge</Label>
                  <Input
                    id="extraKmCharge"
                    name="extraKmCharge"
                    type="number"
                    min="0"
                    step="0.5"
                    value={fare.extraKmCharge}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Extra km charge"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nightCharges">Night Charges</Label>
                  <Input
                    id="nightCharges"
                    name="nightCharges"
                    type="number"
                    min="0"
                    value={fare.nightCharges || 0}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Night charges"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="extraWaitingCharges">Extra Waiting Charges</Label>
                  <Input
                    id="extraWaitingCharges"
                    name="extraWaitingCharges"
                    type="number"
                    min="0"
                    value={fare.extraWaitingCharges || 0}
                    onChange={handleInputChange}
                    disabled={isLoading || isSaving}
                    placeholder="Extra waiting charges"
                  />
                </div>
              </>
            )}
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
