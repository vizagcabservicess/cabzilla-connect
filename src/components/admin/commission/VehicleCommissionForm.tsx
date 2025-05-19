
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { commissionAPI } from '@/services/api/commissionAPI';
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';

interface VehicleCommissionFormProps {
  vehicle: FleetVehicle;
  onCommissionUpdated?: (vehicle: FleetVehicle) => void;
}

export function VehicleCommissionForm({ vehicle, onCommissionUpdated }: VehicleCommissionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [defaultCommissionRate, setDefaultCommissionRate] = useState(10);
  const [useDefaultCommission, setUseDefaultCommission] = useState(vehicle.commissionPercentage === undefined || vehicle.commissionPercentage === null);
  const [commissionPercentage, setCommissionPercentage] = useState(vehicle.commissionPercentage || 10);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDefaultCommission = async () => {
      try {
        const defaultSetting = await commissionAPI.getDefaultCommission();
        setDefaultCommissionRate(defaultSetting.defaultPercentage || 10);
      } catch (error) {
        console.error("Error fetching default commission rate:", error);
      }
    };

    fetchDefaultCommission();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Update vehicle with commission settings
      const updatedVehicle = await fleetAPI.addVehicle({
        ...vehicle,
        commissionPercentage: useDefaultCommission ? null : commissionPercentage
      });
      
      toast({
        title: "Commission updated",
        description: "Vehicle commission settings have been updated successfully."
      });
      
      if (onCommissionUpdated) {
        onCommissionUpdated(updatedVehicle);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating commission",
        description: "Failed to update vehicle commission settings."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Commission Settings</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="useDefaultCommission"
              checked={useDefaultCommission}
              onCheckedChange={(checked) => setUseDefaultCommission(checked)}
              disabled={isLoading}
            />
            <Label htmlFor="useDefaultCommission">
              Use default commission rate ({defaultCommissionRate}%)
            </Label>
          </div>
          
          {!useDefaultCommission && (
            <div className="space-y-2">
              <Label htmlFor="commissionPercentage">Custom Commission Rate (%)</Label>
              <Input
                id="commissionPercentage"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(parseFloat(e.target.value) || 0)}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="rounded-lg bg-muted p-4 mt-4">
            <div className="text-sm">
              <div className="font-medium">Commission Information</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Vehicle:</span>
                  <span className="font-medium">{vehicle.name} ({vehicle.vehicleNumber})</span>
                </div>
                <div className="flex justify-between">
                  <span>Applied rate:</span>
                  <span className="font-medium">
                    {useDefaultCommission ? `${defaultCommissionRate}% (Default)` : `${commissionPercentage}% (Custom)`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Commission Settings'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
